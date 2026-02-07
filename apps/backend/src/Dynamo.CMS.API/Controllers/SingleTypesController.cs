using Dynamo.CMS.API.Contracts;
using Dynamo.CMS.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using KeyNotFoundException = System.Collections.Generic.KeyNotFoundException;

namespace Dynamo.CMS.API.Controllers;

[ApiController]
[Route("api/admin/single-types")]
[Authorize]
public class SingleTypesController : ControllerBase
{
    private readonly ISingleTypeService _service;

    public SingleTypesController(ISingleTypeService service)
    {
        _service = service;
    }

    /// <summary>
    /// Get all single types
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<SingleTypeListItemDto>), 200)]
    public async Task<ActionResult<IEnumerable<SingleTypeListItemDto>>> GetAll()
    {
        var singleTypes = await _service.GetAllAsync();
        return Ok(singleTypes);
    }

    /// <summary>
    /// Get single type by ID
    /// </summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(SingleTypeDto), 200)]
    [ProducesResponseType(404)]
    public async Task<ActionResult<SingleTypeDto>> Get(int id)
    {
        var singleType = await _service.GetByIdAsync(id);
        if (singleType == null)
            return NotFound();
        return Ok(singleType);
    }

    /// <summary>
    /// Get single type by API ID
    /// </summary>
    [HttpGet("by-api-id/{apiId}")]
    [ProducesResponseType(typeof(SingleTypeDto), 200)]
    [ProducesResponseType(404)]
    public async Task<ActionResult<SingleTypeDto>> GetByApiId(string apiId)
    {
        var singleType = await _service.GetByApiIdAsync(apiId);
        if (singleType == null)
            return NotFound();
        return Ok(singleType);
    }

    /// <summary>
    /// Create a new single type
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(SingleTypeDto), 201)]
    [ProducesResponseType(400)]
    public async Task<ActionResult<SingleTypeDto>> Create([FromBody] CreateSingleTypeRequest request)
    {
        try
        {
            var singleType = await _service.CreateAsync(request);
            return CreatedAtAction(nameof(Get), new { id = singleType.Id }, singleType);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Update single type structure
    /// </summary>
    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(SingleTypeDto), 200)]
    [ProducesResponseType(404)]
    public async Task<ActionResult<SingleTypeDto>> Update(int id, [FromBody] UpdateSingleTypeRequest request)
    {
        try
        {
            var singleType = await _service.UpdateAsync(id, request);
            return Ok(singleType);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    /// <summary>
    /// Delete single type
    /// </summary>
    [HttpDelete("{id:int}")]
    [ProducesResponseType(204)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            await _service.DeleteAsync(id);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    /// <summary>
    /// Add field to single type
    /// </summary>
    [HttpPost("{id:int}/fields")]
    [ProducesResponseType(typeof(SingleTypeFieldDto), 200)]
    [ProducesResponseType(404)]
    public async Task<ActionResult<SingleTypeFieldDto>> AddField(int id, [FromBody] CreateFieldRequest request)
    {
        try
        {
            var field = await _service.AddFieldAsync(id, request);
            return Ok(field);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    /// <summary>
    /// Update field in single type
    /// </summary>
    [HttpPut("{id:int}/fields/{fieldId:int}")]
    [ProducesResponseType(typeof(SingleTypeFieldDto), 200)]
    [ProducesResponseType(404)]
    public async Task<ActionResult<SingleTypeFieldDto>> UpdateField(int id, int fieldId, [FromBody] UpdateFieldRequest request)
    {
        try
        {
            var field = await _service.UpdateFieldAsync(id, fieldId, request);
            return Ok(field);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    /// <summary>
    /// Delete field from single type
    /// </summary>
    [HttpDelete("{id:int}/fields/{fieldId:int}")]
    [ProducesResponseType(204)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> DeleteField(int id, int fieldId)
    {
        try
        {
            await _service.DeleteFieldAsync(id, fieldId);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    /// <summary>
    /// Get single type content data
    /// </summary>
    [HttpGet("{apiId}/content")]
    [ProducesResponseType(typeof(SingleTypeDataResponse), 200)]
    [ProducesResponseType(404)]
    public async Task<ActionResult<SingleTypeDataResponse>> GetContent(string apiId, [FromQuery] string locale = "en")
    {
        try
        {
            var data = await _service.GetDataAsync(apiId, locale);
            return Ok(data);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    /// <summary>
    /// Update single type content data
    /// </summary>
    [HttpPut("{apiId}/content")]
    [ProducesResponseType(typeof(SingleTypeDataResponse), 200)]
    [ProducesResponseType(404)]
    public async Task<ActionResult<SingleTypeDataResponse>> UpdateContent(string apiId, [FromBody] JsonElement data, [FromQuery] string locale = "en")
    {
        try
        {
            var result = await _service.UpdateDataAsync(apiId, data, locale);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    /// <summary>
    /// Publish single type content
    /// </summary>
    [HttpPost("{apiId}/content/publish")]
    [ProducesResponseType(typeof(SingleTypeDataResponse), 200)]
    [ProducesResponseType(404)]
    public async Task<ActionResult<SingleTypeDataResponse>> Publish(string apiId, [FromQuery] string locale = "en")
    {
        try
        {
            await _service.PublishAsync(apiId, locale);
            return Ok(await _service.GetDataAsync(apiId, locale));
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Unpublish single type content
    /// </summary>
    [HttpPost("{apiId}/content/unpublish")]
    [ProducesResponseType(typeof(SingleTypeDataResponse), 200)]
    [ProducesResponseType(404)]
    public async Task<ActionResult<SingleTypeDataResponse>> Unpublish(string apiId, [FromQuery] string locale = "en")
    {
        try
        {
            await _service.UnpublishAsync(apiId, locale);
            return Ok(await _service.GetDataAsync(apiId, locale));
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}

/// <summary>
/// Public API for single types (read-only, published content only)
/// </summary>
[ApiController]
[Route("api/single-types")]
public class SingleTypesPublicController : ControllerBase
{
    private readonly ISingleTypeService _service;

    public SingleTypesPublicController(ISingleTypeService service)
    {
        _service = service;
    }

    /// <summary>
    /// Get published single type content (public API)
    /// </summary>
    [HttpGet("{apiId}")]
    [ProducesResponseType(typeof(SingleTypePublicResponse), 200)]
    [ProducesResponseType(404)]
    public async Task<ActionResult<SingleTypePublicResponse>> Get(string apiId, [FromQuery] string locale = "en")
    {
        var data = await _service.GetPublishedDataAsync(apiId, locale);
        if (data == null)
            return NotFound();

        var response = new SingleTypePublicResponse
        {
            Data = data.Data,
            Meta = new SingleTypeMetaDto
            {
                PublishedAt = data.PublishedAt,
                Locale = data.Locale
            }
        };

        return Ok(response);
    }

    /// <summary>
    /// Preview single type content (requires authentication)
    /// </summary>
    [HttpGet("{apiId}/preview")]
    [Authorize]
    [ProducesResponseType(typeof(SingleTypePublicResponse), 200)]
    [ProducesResponseType(404)]
    public async Task<ActionResult<SingleTypePublicResponse>> GetPreview(string apiId, [FromQuery] string locale = "en")
    {
        try
        {
            var data = await _service.GetDataAsync(apiId, locale);
            return Ok(new SingleTypePublicResponse
            {
                Data = data.Data,
                Meta = new SingleTypeMetaDto
                {
                    PublishedAt = data.PublishedAt,
                    Locale = data.Locale,
                    Status = data.Status.ToString(),
                    Version = data.Version
                }
            });
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }
}
