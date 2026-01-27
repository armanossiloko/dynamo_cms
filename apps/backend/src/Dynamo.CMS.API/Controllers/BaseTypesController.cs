using Dynamo.CMS.API.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Dynamo.API.Controllers;

[Route("api/basetypes")]
[ApiController]
public class BaseTypesController : ControllerBase
{
    private readonly AppDbContext _context;

    public BaseTypesController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public IActionResult GetBaseTypes()
    {
        var baseTypes = _context.BaseTypes.AsNoTracking().ToList();
        return Ok(baseTypes);
    }

}
