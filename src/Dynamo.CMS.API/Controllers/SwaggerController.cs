using Dynamo.CMS.API.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.OpenApi.Writers;

namespace Dynamo.CMS.API.Controllers;

/// <summary>
/// Controller for serving dynamic Swagger/OpenAPI documents for collections
/// </summary>
[ApiController]
[Route("api/swagger")]
public class SwaggerController : ControllerBase
{
    private readonly IDynamicSwaggerService _dynamicSwaggerService;
    private readonly ILogger<SwaggerController> _logger;

    public SwaggerController(
        IDynamicSwaggerService dynamicSwaggerService,
        ILogger<SwaggerController> logger)
    {
        _dynamicSwaggerService = dynamicSwaggerService;
        _logger = logger;
    }

    /// <summary>
    /// Get all available collections for Swagger documentation
    /// </summary>
    /// <returns>List of collection names</returns>
    [HttpGet("collections")]
    [ProducesResponseType(typeof(IEnumerable<string>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAvailableCollections()
    {
        try
        {
            var collections = await _dynamicSwaggerService.GetAvailableCollectionsAsync();
            return Ok(collections);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving available collections");
            return Problem(
                detail: "An error occurred while retrieving collections.",
                statusCode: StatusCodes.Status500InternalServerError,
                title: "Internal Server Error"
            );
        }
    }

    /// <summary>
    /// Get OpenAPI document for a specific collection
    /// </summary>
    /// <param name="collectionName">Name of the collection</param>
    /// <param name="format">Output format (json or yaml)</param>
    /// <returns>OpenAPI document for the collection</returns>
    [HttpGet("{collectionName}")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetCollectionSwagger(string collectionName, [FromQuery] string format = "json")
    {
        try
        {
            var document = await _dynamicSwaggerService.GenerateCollectionOpenApiAsync(collectionName);

            if (format.ToLower() == "yaml")
            {
                var yamlWriter = new StringWriter();
                document.SerializeAsV3(new OpenApiYamlWriter(yamlWriter));
                return Content(yamlWriter.ToString(), "application/x-yaml");
            }
            else
            {
                var jsonWriter = new StringWriter();
                document.SerializeAsV3(new OpenApiJsonWriter(jsonWriter));
                return Content(jsonWriter.ToString(), "application/json");
            }
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Collection '{CollectionName}' not found", collectionName);
            return Problem(
                detail: ex.Message,
                statusCode: StatusCodes.Status404NotFound,
                title: "Collection Not Found"
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating Swagger for collection '{CollectionName}'", collectionName);
            return Problem(
                detail: "An error occurred while generating the OpenAPI document.",
                statusCode: StatusCodes.Status500InternalServerError,
                title: "Internal Server Error"
            );
        }
    }

    /// <summary>
    /// Get OpenAPI document for all collections
    /// </summary>
    /// <param name="format">Output format (json or yaml)</param>
    /// <returns>OpenAPI document for all collections</returns>
    [HttpGet("all")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetAllCollectionsSwagger([FromQuery] string format = "json")
    {
        try
        {
            var document = await _dynamicSwaggerService.GenerateAllCollectionsOpenApiAsync();

            if (format.ToLower() == "yaml")
            {
                var yamlWriter = new StringWriter();
                document.SerializeAsV3(new OpenApiYamlWriter(yamlWriter));
                return Content(yamlWriter.ToString(), "application/x-yaml");
            }
            else
            {
                var jsonWriter = new StringWriter();
                document.SerializeAsV3(new OpenApiJsonWriter(jsonWriter));
                return Content(jsonWriter.ToString(), "application/json");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating Swagger for all collections");
            return Problem(
                detail: "An error occurred while generating the OpenAPI document.",
                statusCode: StatusCodes.Status500InternalServerError,
                title: "Internal Server Error"
            );
        }
    }
}
