using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Dynamo.CMS.API.Models;
using Dynamo.CMS.API.Contracts;

namespace Dynamo.CMS.API.Services;

public interface IUserManagementService
{
    Task<UserListResponseDTO> GetAllUsersAsync();
    Task<UserDTO?> GetUserByIdAsync(long id);
    Task<UserDTO?> GetUserByEmailAsync(string email);
    Task<bool> UpdateUserAsync(long id, UserUpdateDTO updateDto);
    Task<bool> ResetPasswordAsync(long id, string newPassword);
    Task<bool> SetUserStatusAsync(long id, bool isActive);
    Task<bool> DeleteUserAsync(long id);
    Task<bool> UpdateUserRolesAsync(long id, List<string> roles);
}

public class UserManagementService : IUserManagementService
{
    private readonly UserManager<User> _userManager;
    private readonly RoleManager<Role> _roleManager;
    private readonly ILogger<UserManagementService> _logger;

    public UserManagementService(
        UserManager<User> userManager,
        RoleManager<Role> roleManager,
        ILogger<UserManagementService> logger)
    {
        _userManager = userManager;
        _roleManager = roleManager;
        _logger = logger;
    }

    public async Task<UserListResponseDTO> GetAllUsersAsync()
    {
        var users = await _userManager.Users
            .OrderBy(u => u.CreatedAt)
            .ToListAsync();

        var userDtos = new List<UserDTO>();
        foreach (var user in users)
        {
            var roles = await _userManager.GetRolesAsync(user);
            userDtos.Add(MapToDTO(user, roles.ToList()));
        }

        return new UserListResponseDTO
        {
            Users = userDtos,
            TotalCount = userDtos.Count
        };
    }

    public async Task<UserDTO?> GetUserByIdAsync(long id)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user == null)
            return null;

        var roles = await _userManager.GetRolesAsync(user);
        return MapToDTO(user, roles.ToList());
    }

    public async Task<UserDTO?> GetUserByEmailAsync(string email)
    {
        var user = await _userManager.FindByEmailAsync(email);
        if (user == null)
            return null;

        var roles = await _userManager.GetRolesAsync(user);
        return MapToDTO(user, roles.ToList());
    }

    public async Task<bool> UpdateUserAsync(long id, UserUpdateDTO updateDto)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user == null)
        {
            _logger.LogWarning("User with ID {UserId} not found for update", id);
            return false;
        }

        if (!string.IsNullOrWhiteSpace(updateDto.FirstName))
            user.FirstName = updateDto.FirstName;

        if (!string.IsNullOrWhiteSpace(updateDto.LastName))
            user.LastName = updateDto.LastName;

        if (!string.IsNullOrWhiteSpace(updateDto.Email) && updateDto.Email != user.Email)
        {
            var emailExists = await _userManager.FindByEmailAsync(updateDto.Email);
            if (emailExists != null && emailExists.Id != user.Id)
            {
                _logger.LogWarning("Email {Email} is already taken", updateDto.Email);
                return false;
            }
            user.Email = updateDto.Email;
            user.UserName = updateDto.Email; // Update username to match email
        }

        if (updateDto.IsActive.HasValue)
            user.IsActive = updateDto.IsActive.Value;

        user.UpdatedAt = DateTimeOffset.UtcNow;

        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
        {
            _logger.LogError("Failed to update user {UserId}. Errors: {Errors}",
                id, string.Join(", ", result.Errors.Select(e => e.Description)));
            return false;
        }

        // Update roles if provided
        if (updateDto.Roles != null)
        {
            await UpdateUserRolesAsync(id, updateDto.Roles);
        }

        _logger.LogInformation("User {UserId} updated successfully", id);
        return true;
    }

    public async Task<bool> ResetPasswordAsync(long id, string newPassword)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user == null)
        {
            _logger.LogWarning("User with ID {UserId} not found for password reset", id);
            return false;
        }

        // Remove existing password
        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        var result = await _userManager.ResetPasswordAsync(user, token, newPassword);

        if (!result.Succeeded)
        {
            _logger.LogError("Failed to reset password for user {UserId}. Errors: {Errors}",
                id, string.Join(", ", result.Errors.Select(e => e.Description)));
            return false;
        }

        _logger.LogInformation("Password reset successfully for user {UserId}", id);
        return true;
    }

    public async Task<bool> SetUserStatusAsync(long id, bool isActive)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user == null)
        {
            _logger.LogWarning("User with ID {UserId} not found for status update", id);
            return false;
        }

        user.IsActive = isActive;
        user.UpdatedAt = DateTimeOffset.UtcNow;

        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
        {
            _logger.LogError("Failed to update user status {UserId}. Errors: {Errors}",
                id, string.Join(", ", result.Errors.Select(e => e.Description)));
            return false;
        }

        _logger.LogInformation("User {UserId} status set to {Status}", id, isActive ? "Active" : "Inactive");
        return true;
    }

    public async Task<bool> DeleteUserAsync(long id)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user == null)
        {
            _logger.LogWarning("User with ID {UserId} not found for deletion", id);
            return false;
        }

        var result = await _userManager.DeleteAsync(user);
        if (!result.Succeeded)
        {
            _logger.LogError("Failed to delete user {UserId}. Errors: {Errors}",
                id, string.Join(", ", result.Errors.Select(e => e.Description)));
            return false;
        }

        _logger.LogInformation("User {UserId} deleted successfully", id);
        return true;
    }

    public async Task<bool> UpdateUserRolesAsync(long id, List<string> roles)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user == null)
        {
            _logger.LogWarning("User with ID {UserId} not found for role update", id);
            return false;
        }

        // Validate all roles exist
        foreach (var roleName in roles)
        {
            var roleExists = await _roleManager.RoleExistsAsync(roleName);
            if (!roleExists)
            {
                _logger.LogWarning("Role {RoleName} does not exist", roleName);
                return false;
            }
        }

        // Get current roles
        var currentRoles = await _userManager.GetRolesAsync(user);

        // Remove all current roles
        var removeResult = await _userManager.RemoveFromRolesAsync(user, currentRoles);
        if (!removeResult.Succeeded)
        {
            _logger.LogError("Failed to remove roles from user {UserId}. Errors: {Errors}",
                id, string.Join(", ", removeResult.Errors.Select(e => e.Description)));
            return false;
        }

        // Add new roles
        if (roles.Any())
        {
            var addResult = await _userManager.AddToRolesAsync(user, roles);
            if (!addResult.Succeeded)
            {
                _logger.LogError("Failed to add roles to user {UserId}. Errors: {Errors}",
                    id, string.Join(", ", addResult.Errors.Select(e => e.Description)));
                return false;
            }
        }

        _logger.LogInformation("Roles updated for user {UserId}", id);
        return true;
    }

    private static UserDTO MapToDTO(User user, List<string> roles)
    {
        return new UserDTO
        {
            Id = user.Id,
            UserName = user.UserName,
            Email = user.Email,
            FirstName = user.FirstName,
            LastName = user.LastName,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt,
            Roles = roles
        };
    }
}
