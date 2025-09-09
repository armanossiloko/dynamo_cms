using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vivicasa.CMS.API.Models.Dto;
using Vivicasa.CMS.API.Services;

namespace Vivicasa.CMS.API.Controllers;

/// <summary>
/// Controller for managing user authentication and registration
/// </summary>
[ApiController]
[Route("api/identity")]
[Produces("application/json")]
public class IdentityController : ControllerBase
{
    private readonly IIdentityService _identityService;

    public IdentityController(IIdentityService identityService)
    {
        _identityService = identityService ?? throw new ArgumentNullException(nameof(identityService));
    }

    /// <summary>
    /// Registers a new user account (Admin only)
    /// </summary>
    /// <param name="request">User registration details</param>
    /// <returns>Authentication response with registration status</returns>
    /// <response code="200">Registration successful</response>
    /// <response code="400">Invalid input or user already exists</response>
    /// <response code="401">Unauthorized access</response>
    /// <response code="403">Insufficient permissions</response>
    [Authorize(Roles = "Admin")]
    [HttpPost("register")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
    {
        var response = await _identityService.RegisterAsync(request);
        if (!response.Success)
            return BadRequest(response);
        return Ok(response);
    }

    /// <summary>
    /// Authenticates a user and returns a JWT token
    /// </summary>
    /// <param name="request">Login credentials</param>
    /// <returns>Authentication response with JWT token</returns>
    /// <response code="200">Authentication successful</response>
    /// <response code="401">Invalid credentials</response>
    [HttpPost("login")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        var response = await _identityService.LoginAsync(request);
        if (!response.Success)
            return Unauthorized(response);
        return Ok(response);
    }
}