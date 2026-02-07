using Dynamo.CMS.API.Contracts;
using Dynamo.CMS.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Dynamo.CMS.API.Controllers;

[ApiController]
[Route("api/translations")]
[Authorize]
public class TranslationsController : ControllerBase
{
    private readonly ILocalizationService _localizationService;

    public TranslationsController(ILocalizationService localizationService)
    {
        _localizationService = localizationService;
    }

    [HttpGet("{collection}/{entryId}")]
    [AllowAnonymous]
    public async Task<ActionResult<TranslationStatusDto>> GetTranslationStatus(string collection, int entryId)
    {
        var status = await _localizationService.GetTranslationStatusAsync(collection, entryId);
        return Ok(status);
    }

    [HttpGet("{collection}/{entryId}/{localeCode}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetTranslation(string collection, int entryId, string localeCode)
    {
        var translation = await _localizationService.GetTranslationAsync(collection, entryId, localeCode);
        if (translation == null)
        {
            return NotFound();
        }

        var dto = new TranslationDto
        {
            Id = translation.Id,
            CollectionName = translation.CollectionName,
            EntryId = translation.EntryId,
            LocaleCode = translation.LocaleCode,
            TranslatedFields = translation.TranslatedFields,
            CreatedAt = translation.CreatedAt,
            UpdatedAt = translation.UpdatedAt,
            CreatedBy = translation.CreatedBy,
            UpdatedBy = translation.UpdatedBy,
            IsComplete = translation.IsComplete,
            CompletionPercentage = translation.CompletionPercentage
        };

        return Ok(dto);
    }

    [HttpPost]
    public async Task<ActionResult<TranslationDto>> Create([FromBody] CreateTranslationDto dto)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system";
            var translation = await _localizationService.CreateTranslationAsync(dto, userId);

            var result = new TranslationDto
            {
                Id = translation.Id,
                CollectionName = translation.CollectionName,
                EntryId = translation.EntryId,
                LocaleCode = translation.LocaleCode,
                TranslatedFields = translation.TranslatedFields,
                CreatedAt = translation.CreatedAt,
                UpdatedAt = translation.UpdatedAt,
                CreatedBy = translation.CreatedBy,
                UpdatedBy = translation.UpdatedBy,
                IsComplete = translation.IsComplete,
                CompletionPercentage = translation.CompletionPercentage
            };

            return CreatedAtAction(nameof(GetTranslation), 
                new { collection = translation.CollectionName, entryId = translation.EntryId, localeCode = translation.LocaleCode }, 
                result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<TranslationDto>> Update(int id, [FromBody] UpdateTranslationDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system";
        var translation = await _localizationService.UpdateTranslationAsync(id, dto, userId);
        
        if (translation == null)
        {
            return NotFound();
        }

        var result = new TranslationDto
        {
            Id = translation.Id,
            CollectionName = translation.CollectionName,
            EntryId = translation.EntryId,
            LocaleCode = translation.LocaleCode,
            TranslatedFields = translation.TranslatedFields,
            CreatedAt = translation.CreatedAt,
            UpdatedAt = translation.UpdatedAt,
            CreatedBy = translation.CreatedBy,
            UpdatedBy = translation.UpdatedBy,
            IsComplete = translation.IsComplete,
            CompletionPercentage = translation.CompletionPercentage
        };

        return Ok(result);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin,Editor")]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await _localizationService.DeleteTranslationAsync(id);
        if (!result)
        {
            return NotFound();
        }
        return NoContent();
    }
}
