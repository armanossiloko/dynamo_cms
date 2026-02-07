using Dynamo.CMS.API.Contracts;
using Dynamo.CMS.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Dynamo.CMS.API.Controllers;

[ApiController]
[Route("api/media")]
[Authorize]
public class MediaTransformationController : ControllerBase
{
    private readonly IImageProcessingService _imageProcessingService;

    public MediaTransformationController(IImageProcessingService imageProcessingService)
    {
        _imageProcessingService = imageProcessingService;
    }

    [HttpGet("{id}/transform")]
    [AllowAnonymous]
    public async Task<IActionResult> Transform(int id, [FromQuery] ImageTransformRequestDto request)
    {
        var stream = await _imageProcessingService.TransformImageAsync(id, request);
        if (stream == null)
        {
            return NotFound();
        }

        var contentType = request.Format?.ToLower() switch
        {
            "png" => "image/png",
            "webp" => "image/webp",
            _ => "image/jpeg"
        };

        return File(stream, contentType);
    }

    [HttpGet("{id}/metadata")]
    public async Task<ActionResult<ImageMetadataDto>> GetMetadata(int id)
    {
        try
        {
            var metadata = await _imageProcessingService.GetImageMetadataAsync(id);
            return Ok(metadata);
        }
        catch (ArgumentException)
        {
            return NotFound();
        }
    }

    [HttpPost("{id}/focal-point")]
    public async Task<IActionResult> SetFocalPoint(int id, [FromBody] FocalPointDto focalPoint)
    {
        var result = await _imageProcessingService.SetFocalPointAsync(id, focalPoint);
        if (!result)
        {
            return NotFound();
        }
        return Ok();
    }

    [HttpPost("{id}/crop")]
    public async Task<IActionResult> Crop(int id, [FromBody] ImageCropRequestDto request)
    {
        var stream = await _imageProcessingService.CropImageAsync(id, request);
        if (stream == null)
        {
            return NotFound();
        }

        return File(stream, "image/jpeg");
    }

    [HttpPost("{id}/rotate")]
    public async Task<IActionResult> Rotate(int id, [FromBody] ImageRotateRequestDto request)
    {
        var stream = await _imageProcessingService.RotateImageAsync(id, request);
        if (stream == null)
        {
            return NotFound();
        }

        return File(stream, "image/jpeg");
    }
}
