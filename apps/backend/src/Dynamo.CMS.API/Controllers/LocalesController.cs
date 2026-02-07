using Dynamo.CMS.API.Contracts;
using Dynamo.CMS.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Dynamo.CMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class LocalesController : ControllerBase
{
    private readonly ILocalizationService _localizationService;

    public LocalesController(ILocalizationService localizationService)
    {
        _localizationService = localizationService;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<List<LocaleDto>>> GetAll()
    {
        var locales = await _localizationService.GetAllLocalesAsync();
        return Ok(locales);
    }

    [HttpGet("default")]
    [AllowAnonymous]
    public async Task<ActionResult<LocaleDto>> GetDefault()
    {
        var locale = await _localizationService.GetDefaultLocaleAsync();
        if (locale == null)
        {
            return NotFound();
        }
        return Ok(locale);
    }

    [HttpGet("{code}")]
    [AllowAnonymous]
    public async Task<ActionResult<LocaleDto>> GetByCode(string code)
    {
        var locale = await _localizationService.GetLocaleByCodeAsync(code);
        if (locale == null)
        {
            return NotFound();
        }
        return Ok(locale);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<LocaleDto>> Create([FromBody] CreateLocaleDto dto)
    {
        try
        {
            var locale = await _localizationService.CreateLocaleAsync(dto);
            return CreatedAtAction(nameof(GetByCode), new { code = locale.Code }, locale);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<LocaleDto>> Update(int id, [FromBody] UpdateLocaleDto dto)
    {
        var locale = await _localizationService.UpdateLocaleAsync(id, dto);
        if (locale == null)
        {
            return NotFound();
        }
        return Ok(locale);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            var result = await _localizationService.DeleteLocaleAsync(id);
            if (!result)
            {
                return NotFound();
            }
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}
