using Dynamo.CMS.API.Contracts;
using Dynamo.CMS.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Dynamo.CMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ComponentsController : ControllerBase
{
    private readonly IComponentService _componentService;

    public ComponentsController(IComponentService componentService)
    {
        _componentService = componentService;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<List<ComponentDto>>> GetAll()
    {
        var components = await _componentService.GetAllComponentsAsync();
        return Ok(components);
    }

    [HttpGet("categories")]
    [AllowAnonymous]
    public async Task<ActionResult<List<ComponentCategoryDto>>> GetCategories()
    {
        var categories = await _componentService.GetCategoriesAsync();
        return Ok(categories);
    }

    [HttpGet("category/{category}")]
    [AllowAnonymous]
    public async Task<ActionResult<List<ComponentDto>>> GetByCategory(string category)
    {
        var components = await _componentService.GetComponentsByCategoryAsync(category);
        return Ok(components);
    }

    [HttpGet("{name}")]
    [AllowAnonymous]
    public async Task<ActionResult<ComponentDto>> GetByName(string name)
    {
        var component = await _componentService.GetComponentByNameAsync(name);
        if (component == null)
        {
            return NotFound();
        }
        return Ok(component);
    }

    [HttpGet("id/{id}")]
    [AllowAnonymous]
    public async Task<ActionResult<ComponentDto>> GetById(int id)
    {
        var component = await _componentService.GetComponentByIdAsync(id);
        if (component == null)
        {
            return NotFound();
        }
        return Ok(component);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ComponentDto>> Create([FromBody] CreateComponentDto dto)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system";
            var component = await _componentService.CreateComponentAsync(dto, userId);
            return CreatedAtAction(nameof(GetByName), new { name = component.Name }, component);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ComponentDto>> Update(int id, [FromBody] UpdateComponentDto dto)
    {
        var component = await _componentService.UpdateComponentAsync(id, dto);
        if (component == null)
        {
            return NotFound();
        }
        return Ok(component);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            var result = await _componentService.DeleteComponentAsync(id);
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

    [HttpPost("validate")]
    public async Task<ActionResult<ComponentValidationResultDto>> Validate([FromBody] ValidateComponentDto dto)
    {
        var result = await _componentService.ValidateComponentAsync(dto.ComponentName, dto.Data);
        return Ok(result);
    }
}
