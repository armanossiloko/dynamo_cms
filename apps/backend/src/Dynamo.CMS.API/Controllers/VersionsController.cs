using Dynamo.CMS.API.Contracts;
using Dynamo.CMS.API.Models;
using Dynamo.CMS.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Dynamo.CMS.API.Controllers;

[ApiController]
[Route("api/versions")]
[Authorize]
public class VersionsController : ControllerBase
{
    private readonly IVersioningService _versioningService;
    private readonly ILogger<VersionsController> _logger;

    public VersionsController(IVersioningService versioningService, ILogger<VersionsController> logger)
    {
        _versioningService = versioningService;
        _logger = logger;
    }

    [HttpGet("{collectionName}/{entryId}")]
    public async Task<ActionResult<IEnumerable<ContentVersionDto>>> GetVersions(string collectionName, int entryId)
    {
        var versions = await _versioningService.GetVersionsAsync(collectionName, entryId);
        
        var dto = versions.Select(v => new ContentVersionDto
        {
            Id = v.Id,
            CollectionName = v.CollectionName,
            EntryId = v.EntryId,
            VersionNumber = v.VersionNumber,
            Data = v.Data,
            ChangeSummary = v.ChangeSummary,
            CreatedAt = v.CreatedAt,
            CreatedBy = v.CreatedBy,
            CreatedByName = v.CreatedByName,
            IsCurrent = v.IsCurrent
        });

        return Ok(dto);
    }

    [HttpGet("{versionId}")]
    public async Task<ActionResult<ContentVersionDto>> GetVersion(int versionId)
    {
        var version = await _versioningService.GetVersionAsync(versionId);
        if (version == null) return NotFound();

        var dto = new ContentVersionDto
        {
            Id = version.Id,
            CollectionName = version.CollectionName,
            EntryId = version.EntryId,
            VersionNumber = version.VersionNumber,
            Data = version.Data,
            ChangeSummary = version.ChangeSummary,
            CreatedAt = version.CreatedAt,
            CreatedBy = version.CreatedBy,
            CreatedByName = version.CreatedByName,
            IsCurrent = version.IsCurrent
        };

        return Ok(dto);
    }

    [HttpPost]
    public async Task<ActionResult<ContentVersionDto>> CreateVersion(CreateContentVersionDto dto)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "unknown";
        var userName = User.FindFirst(ClaimTypes.Name)?.Value;

        var version = await _versioningService.CreateVersionAsync(
            dto.CollectionName, 
            dto.EntryId, 
            dto.Data, 
            dto.ChangeSummary ?? "", 
            userId, 
            userName);

        var response = new ContentVersionDto
        {
            Id = version.Id,
            CollectionName = version.CollectionName,
            EntryId = version.EntryId,
            VersionNumber = version.VersionNumber,
            Data = version.Data,
            ChangeSummary = version.ChangeSummary,
            CreatedAt = version.CreatedAt,
            CreatedBy = version.CreatedBy,
            CreatedByName = version.CreatedByName,
            IsCurrent = version.IsCurrent
        };

        return CreatedAtAction(nameof(GetVersion), new { versionId = version.Id }, response);
    }

    [HttpPost("{versionId}/rollback")]
    public async Task<ActionResult<ContentVersionDto>> RollbackToVersion(int versionId)
    {
        var version = await _versioningService.RollbackToVersionAsync(versionId);
        if (version == null) return NotFound();

        var dto = new ContentVersionDto
        {
            Id = version.Id,
            CollectionName = version.CollectionName,
            EntryId = version.EntryId,
            VersionNumber = version.VersionNumber,
            Data = version.Data,
            ChangeSummary = version.ChangeSummary,
            CreatedAt = version.CreatedAt,
            CreatedBy = version.CreatedBy,
            CreatedByName = version.CreatedByName,
            IsCurrent = version.IsCurrent
        };

        return Ok(dto);
    }

    [HttpGet("compare")]
    public async Task<ActionResult<ContentVersionDiffDto>> CompareVersions(
        [FromQuery] int fromVersionId, 
        [FromQuery] int toVersionId)
    {
        var diff = await _versioningService.CompareVersionsAsync(fromVersionId, toVersionId);
        return Ok(diff);
    }

    [HttpDelete("{versionId}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> DeleteVersion(int versionId)
    {
        await _versioningService.DeleteVersionAsync(versionId);
        return NoContent();
    }
}
