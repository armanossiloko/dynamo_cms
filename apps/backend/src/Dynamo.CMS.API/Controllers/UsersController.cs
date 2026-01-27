using Dynamo.CMS.API.Contracts;
using Dynamo.CMS.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Dynamo.API.Controllers;

/// <summary>
/// Controller for managing users
/// </summary>
[ApiController]
[Route("api/users")]
[Authorize(Roles = "Admin")]
[Produces("application/json")]
public class UsersController : ControllerBase
{
    private readonly IUserManagementService _userManagementService;
    private readonly ILogger<UsersController> _logger;

    public UsersController(
        IUserManagementService userManagementService,
        ILogger<UsersController> logger)
    {
        _userManagementService = userManagementService;
        _logger = logger;
    }

    /// <summary>
    /// Gets all users
    /// </summary>
    /// <returns>List of all users</returns>
    [HttpGet]
    [ProducesResponseType(typeof(UserListResponseDTO), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<UserListResponseDTO>> GetAllUsers()
    {
        var result = await _userManagementService.GetAllUsersAsync();
        return Ok(result);
    }

    /// <summary>
    /// Gets a user by ID
    /// </summary>
    /// <param name="id">User ID</param>
    /// <returns>User details</returns>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(UserDTO), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<UserDTO>> GetUserById(long id)
    {
        var user = await _userManagementService.GetUserByIdAsync(id);
        if (user == null)
            return NotFound(new { message = $"User with ID {id} not found." });

        return Ok(user);
    }

    /// <summary>
    /// Updates a user
    /// </summary>
    /// <param name="id">User ID</param>
    /// <param name="updateDto">User update data</param>
    /// <returns>Success status</returns>
    [HttpPut("{id}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> UpdateUser(long id, [FromBody] UserUpdateDTO updateDto)
    {
        var result = await _userManagementService.UpdateUserAsync(id, updateDto);
        if (!result)
            return BadRequest(new { message = "Failed to update user. Check if email is already taken." });

        return Ok(new { message = "User updated successfully." });
    }

    /// <summary>
    /// Resets a user's password
    /// </summary>
    /// <param name="id">User ID</param>
    /// <param name="resetDto">New password</param>
    /// <returns>Success status</returns>
    [HttpPost("{id}/reset-password")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> ResetPassword(long id, [FromBody] ResetPasswordDTO resetDto)
    {
        var result = await _userManagementService.ResetPasswordAsync(id, resetDto.NewPassword);
        if (!result)
            return BadRequest(new { message = "Failed to reset password. Password may not meet requirements." });

        return Ok(new { message = "Password reset successfully." });
    }

    /// <summary>
    /// Activates or deactivates a user
    /// </summary>
    /// <param name="id">User ID</param>
    /// <param name="isActive">True to activate, false to deactivate</param>
    /// <returns>Success status</returns>
    [HttpPatch("{id}/status")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> SetUserStatus(long id, [FromBody] bool isActive)
    {
        var result = await _userManagementService.SetUserStatusAsync(id, isActive);
        if (!result)
            return BadRequest(new { message = "Failed to update user status." });

        return Ok(new { message = $"User {(isActive ? "activated" : "deactivated")} successfully." });
    }

    /// <summary>
    /// Deletes a user
    /// </summary>
    /// <param name="id">User ID</param>
    /// <returns>Success status</returns>
    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> DeleteUser(long id)
    {
        var result = await _userManagementService.DeleteUserAsync(id);
        if (!result)
            return BadRequest(new { message = "Failed to delete user." });

        return Ok(new { message = "User deleted successfully." });
    }
}
