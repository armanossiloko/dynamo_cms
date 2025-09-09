using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using Dynamo.CMS.API.Models;
using Dynamo.CMS.API.Models.Dto;

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
        ILogger<IdentityService> logger)
    {
        _userManager = userManager;
        _jwtService = jwtService;
        _logger = logger;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        _logger.LogInformation("Admin attempting to register user with email: {Email}", request.Email);

        var userExists = await _userManager.FindByEmailAsync(request.Email);
        if (userExists != null)
        {
            _logger.LogWarning("Registration failed: User with email {Email} already exists", request.Email);
            return new AuthResponse
            {
                Success = false,
                Message = "User already exists"
            };
        }

        var user = new User
        {
            Email = request.Email,
            UserName = request.Email,
            FirstName = request.FirstName,
            LastName = request.LastName
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
            Message = "User created successfully"
        };
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        _logger.LogInformation("Login attempt for user: {Email}", request.Email);

        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null)
        {
            _logger.LogWarning("Login failed: User {Email} not found", request.Email);
            return new AuthResponse
            {
                Success = false,
                Message = "Invalid credentials"
            };
        }

        var validPassword = await _userManager.CheckPasswordAsync(user, request.Password);
        if (!validPassword)
        {
            _logger.LogWarning("Login failed: Invalid password for user {Email}", request.Email);
            return new AuthResponse
            {
                Success = false,
                Message = "Invalid credentials"
            };
        }

        var token = await _jwtService.GenerateJwtTokenAsync(user);

        _logger.LogInformation("User {Email} logged in successfully", request.Email);
        return new AuthResponse
        {
            Success = true,
            Token = token,
            Email = user.Email
        };
    }
}
