using Microsoft.AspNetCore.Mvc;

namespace Dynamo.CMS.API.Controllers;

/// <summary>
/// Controller for managing user authentication and registration
/// </summary>
[ApiController]
[Route("api/data/{collectionName}")]
[Produces("application/json")]
public class DataController : ControllerBase
{
    public DataController()
    {
    }

    [HttpGet]
    public IActionResult GetData(string collectionName)
    {
        return Ok();
    }

}
