using Microsoft.AspNetCore.Identity;
using Dynamo.CMS.API.Models;
using Dynamo.CMS.API.Contracts;

namespace Dynamo.CMS.API.Services;

public interface IIdentityService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request);
    Task<AuthResponse> LoginAsync(LoginRequest request);
}

public class IdentityService : IIdentityService
{
    private readonly UserManager<User> _userManager;
    private readonly IJwtService _jwtService;
    private readonly ILogger<IdentityService> _logger;

    public IdentityService(
        UserManager<User> userManager,
        IJwtService jwtService,
        ILogger<IdentityService> logger
        )
    {
        _userManager = userManager;
        _jwtService = jwtService;
        _logger = logger;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        _logger.LogInformation("Admin attempting to register user with email: {Email}", request.Email);

        var userExists = await _userManager.FindByEmailAsync(request.Email);
        if (userExists is not null)
        {
            _logger.LogWarning("Registration failed: User with email {Email} already exists.", request.Email);
            return new AuthResponse
            {
                Success = false,
                Message = "EMAIL_ALREADY_TAKEN"
            };
        }

        userExists = await _userManager.FindByNameAsync(request.UserName);
        if (userExists is not null)
        {
            _logger.LogWarning("Registration failed: User with username {UserName} already exists.", request.UserName);
            return new AuthResponse
            {
                Success = false,
                Message = "USERNAME_ALREADY_TAKEN"
            };
        }

        var user = new User
        {
            Email = request.Email,
            UserName = request.UserName,
            FirstName = request.FirstName,
            LastName = request.LastName,
            IsActive = true,

        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            _logger.LogError("Failed to create user {Email}. Errors: {Errors}",
                request.Email, string.Join(", ", result.Errors.Select(e => e.Description)));

            return new AuthResponse
            {
                Success = false,
                Message = string.Join(", ", result.Errors.Select(e => e.Description))
            };
        }

        await _userManager.AddToRoleAsync(user, "User");

        _logger.LogInformation("User {Email} registered successfully by admin", request.Email);
        return new AuthResponse
        {
            Success = true,
            Email = user.Email,
            Message = "USER_CREATED_SUCCESSFULLY"
        };
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        User? user = null;
        if (!string.IsNullOrEmpty(request.Email))
        {
            _logger.LogDebug("Login attempt for user with email {Email}", request.Email);
            user = await _userManager.FindByEmailAsync(request.Email);
        }
        else if (!string.IsNullOrEmpty(request.UserName))
        {
            _logger.LogDebug("Login attempt for user with username {UserName}", request.UserName);
            user = await _userManager.FindByNameAsync(request.UserName);
        }

        if (user is null)
        {
            _logger.LogWarning("Login failed: User {Email} not found", request.Email);
            return new AuthResponse
            {
                Success = false,
                Message = "INVALID_CREDENTIALS"
            };
        }

        var validPassword = await _userManager.CheckPasswordAsync(user, request.Password);
        if (!validPassword)
        {
            _logger.LogWarning("Login failed; invalid password for user {Email}", request.Email);
            return new AuthResponse
            {
                Success = false,
                Message = "INVALID_CREDENTIALS"
            };
        }

        if (!user.IsActive)
        {
            _logger.LogWarning("Login failed; user {Email} is inactive.", request.Email);
            return new AuthResponse
            {
                Success = false,
                Message = "USER_INACTIVE"
            };
        }

        var token = await _jwtService.GenerateTokenAsync(user);

        _logger.LogInformation("User {Email} logged in successfully", request.Email);
        return new AuthResponse
        {
            Success = true,
            AccessToken = token,
            Email = user.Email
        };
    }
}
