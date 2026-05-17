using Dynamo.CMS.API.Contracts;
using Dynamo.CMS.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Dynamo.CMS.API.Controllers;

[ApiController]
[Route("api/api-keys")]
[Authorize]
[Produces("application/json")]
public class ApiKeysController : ControllerBase
{
    private readonly IApiKeyService _apiKeyService;
    private readonly ILogger<ApiKeysController> _logger;

    public ApiKeysController(
        IApiKeyService apiKeyService,
        ILogger<ApiKeysController> logger)
    {
        _apiKeyService = apiKeyService;
        _logger = logger;
    }

    private long GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return long.Parse(userIdClaim ?? "0");
    }

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<ApiKeyListItemDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IEnumerable<ApiKeyListItemDto>>> GetAll()
    {
        var userId = GetUserId();
        var keys = await _apiKeyService.ListByUserAsync(userId);
        return Ok(keys);
    }

    [HttpGet("{id}")]
    [ProducesResponseType(typeof(ApiKeyListItemDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiKeyListItemDto>> GetById(int id)
    {
        var key = await _apiKeyService.GetAsync(id);
        if (key == null)
            return NotFound(new { message = "API key not found" });

        var userId = GetUserId();
        if (key.UserId != userId && !User.IsInRole("Admin"))
            return Forbid();

        return Ok(new ApiKeyListItemDto
        {
            Id = key.Id,
            Name = key.Name,
            Scope = key.Scope.ToString(),
            AllowedCollections = key.AllowedCollections,
            ExpiresAt = key.ExpiresAt,
            IsActive = key.IsActive,
            CreatedAt = key.CreatedAt,
            UpdatedAt = key.UpdatedAt,
            LastUsedAt = key.LastUsedAt
        });
    }

    [HttpPost]
    [ProducesResponseType(typeof(ApiKeyDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiKeyDto>> Create([FromBody] CreateApiKeyDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { message = "Name is required" });

        var userId = GetUserId();
        var result = await _apiKeyService.GenerateAsync(dto, userId);
        
        _logger.LogInformation("API key created: {KeyName}", dto.Name);
        
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id}")]
    [ProducesResponseType(typeof(ApiKeyListItemDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiKeyListItemDto>> Update(int id, [FromBody] UpdateApiKeyDto dto)
    {
        var existing = await _apiKeyService.GetAsync(id);
        if (existing == null)
            return NotFound(new { message = "API key not found" });

        var userId = GetUserId();
        if (existing.UserId != userId && !User.IsInRole("Admin"))
            return Forbid();

        var result = await _apiKeyService.UpdateAsync(id, dto);

        return Ok(new ApiKeyListItemDto
        {
            Id = result.Id,
            Name = result.Name,
            Scope = result.Scope.ToString(),
            AllowedCollections = result.AllowedCollections,
            ExpiresAt = result.ExpiresAt,
            IsActive = result.IsActive,
            CreatedAt = result.CreatedAt,
            UpdatedAt = result.UpdatedAt,
            LastUsedAt = result.LastUsedAt
        });
    }

    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Delete(int id)
    {
        var existing = await _apiKeyService.GetAsync(id);
        if (existing == null)
            return NotFound(new { message = "API key not found" });

        var userId = GetUserId();
        if (existing.UserId != userId && !User.IsInRole("Admin"))
            return Forbid();

        await _apiKeyService.DeleteAsync(id);
        
        _logger.LogInformation("API key deleted: {KeyId}", id);
        
        return NoContent();
    }

    [HttpPost("{id}/regenerate")]
    [ProducesResponseType(typeof(ApiKeyDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiKeyDto>> Regenerate(int id)
    {
        var existing = await _apiKeyService.GetAsync(id);
        if (existing == null)
            return NotFound(new { message = "API key not found" });

        var userId = GetUserId();
        if (existing.UserId != userId && !User.IsInRole("Admin"))
            return Forbid();

        var result = await _apiKeyService.RegenerateAsync(id);
        
        _logger.LogInformation("API key regenerated: {KeyId}", id);
        
        return Ok(result);
    }

    [HttpPost("validate")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiKeyValidationResultDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiKeyValidationResultDto>> Validate([FromBody] ApiKeyValidateDto dto)
    {
        var result = await _apiKeyService.ValidateWithResultAsync(dto.Key);
        return Ok(result);
    }
}