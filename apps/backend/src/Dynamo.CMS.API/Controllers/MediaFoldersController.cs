using Dynamo.CMS.API.Contracts;
using Dynamo.CMS.API.Data;
using Dynamo.CMS.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Dynamo.CMS.API.Controllers;

[ApiController]
[Route("api/media/folders")]
[Authorize]
public class MediaFoldersController : ControllerBase
{
    private readonly AppDbContext _context;

    public MediaFoldersController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<List<MediaFolderDto>>> GetAll()
    {
        var folders = await _context.MediaFolders
            .Include(f => f.Children)
            .ToListAsync();

        var folderDtos = folders.Select(f => new MediaFolderDto
        {
            Id = f.Id,
            Name = f.Name,
            ParentId = f.ParentId,
            Path = f.Path,
            CreatedAt = f.CreatedAt,
            FileCount = f.Files.Count,
            Children = f.Children.Select(c => new MediaFolderDto
            {
                Id = c.Id,
                Name = c.Name,
                ParentId = c.ParentId,
                Path = c.Path,
                CreatedAt = c.CreatedAt,
                FileCount = c.Files.Count
            }).ToList()
        }).ToList();

        return Ok(folderDtos);
    }

    [HttpGet("tree")]
    public async Task<ActionResult<List<MediaFolderDto>>> GetTree()
    {
        var rootFolders = await _context.MediaFolders
            .Where(f => f.ParentId == null)
            .Select(f => new MediaFolderDto
            {
                Id = f.Id,
                Name = f.Name,
                ParentId = f.ParentId,
                Path = f.Path,
                CreatedAt = f.CreatedAt,
                FileCount = f.Files.Count
            })
            .ToListAsync();

        // Initialize children after fetching from database
        foreach (var folder in rootFolders)
        {
            folder.Children = new List<MediaFolderDto>();
        }

        foreach (var folder in rootFolders)
        {
            await LoadChildrenAsync(folder);
        }

        return Ok(rootFolders);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<MediaFolderDto>> GetById(int id)
    {
        var folder = await _context.MediaFolders
            .Include(f => f.Children)
            .FirstOrDefaultAsync(f => f.Id == id);

        if (folder == null)
        {
            return NotFound();
        }

        var dto = new MediaFolderDto
        {
            Id = folder.Id,
            Name = folder.Name,
            ParentId = folder.ParentId,
            Path = folder.Path,
            CreatedAt = folder.CreatedAt,
            FileCount = folder.Files.Count,
            Children = folder.Children.Select(c => new MediaFolderDto
            {
                Id = c.Id,
                Name = c.Name,
                ParentId = c.ParentId,
                Path = c.Path,
                CreatedAt = c.CreatedAt,
                FileCount = c.Files.Count
            }).ToList()
        };

        return Ok(dto);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Editor")]
    public async Task<ActionResult<MediaFolderDto>> Create([FromBody] CreateMediaFolderDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        string path;
        if (dto.ParentId.HasValue)
        {
            var parent = await _context.MediaFolders.FindAsync(dto.ParentId.Value);
            if (parent == null)
            {
                return BadRequest(new { error = "Parent folder not found" });
            }
            path = $"{parent.Path}/{dto.Name}";
        }
        else
        {
            path = dto.Name;
        }

        var folder = new MediaFolder
        {
            Name = dto.Name,
            ParentId = dto.ParentId,
            Path = path,
            CreatedBy = userId
        };

        _context.MediaFolders.Add(folder);
        await _context.SaveChangesAsync();

        var result = new MediaFolderDto
        {
            Id = folder.Id,
            Name = folder.Name,
            ParentId = folder.ParentId,
            Path = folder.Path,
            CreatedAt = folder.CreatedAt,
            FileCount = 0,
            Children = new List<MediaFolderDto>()
        };

        return CreatedAtAction(nameof(GetById), new { id = folder.Id }, result);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,Editor")]
    public async Task<ActionResult<MediaFolderDto>> Update(int id, [FromBody] UpdateMediaFolderDto dto)
    {
        var folder = await _context.MediaFolders.FindAsync(id);
        if (folder == null)
        {
            return NotFound();
        }

        if (dto.Name != null)
        {
            folder.Name = dto.Name;
            // Update path
            if (folder.ParentId.HasValue)
            {
                var parent = await _context.MediaFolders.FindAsync(folder.ParentId.Value);
                folder.Path = parent != null ? $"{parent.Path}/{dto.Name}" : dto.Name;
            }
            else
            {
                folder.Path = dto.Name;
            }
        }

        if (dto.ParentId.HasValue && dto.ParentId != folder.ParentId)
        {
            folder.ParentId = dto.ParentId;
            // Update path
            if (dto.ParentId.Value > 0)
            {
                var parent = await _context.MediaFolders.FindAsync(dto.ParentId.Value);
                folder.Path = parent != null ? $"{parent.Path}/{folder.Name}" : folder.Name;
            }
            else
            {
                folder.Path = folder.Name;
            }
        }

        folder.UpdatedAt = DateTime.UtcNow;
        _context.MediaFolders.Update(folder);
        await _context.SaveChangesAsync();

        var result = new MediaFolderDto
        {
            Id = folder.Id,
            Name = folder.Name,
            ParentId = folder.ParentId,
            Path = folder.Path,
            CreatedAt = folder.CreatedAt,
            FileCount = folder.Files.Count,
            Children = new List<MediaFolderDto>()
        };

        return Ok(result);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var folder = await _context.MediaFolders.FindAsync(id);
        if (folder == null)
        {
            return NotFound();
        }

        _context.MediaFolders.Remove(folder);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private async Task LoadChildrenAsync(MediaFolderDto folderDto)
    {
        var children = await _context.MediaFolders
            .Where(f => f.ParentId == folderDto.Id)
            .Select(f => new MediaFolderDto
            {
                Id = f.Id,
                Name = f.Name,
                ParentId = f.ParentId,
                Path = f.Path,
                CreatedAt = f.CreatedAt,
                FileCount = f.Files.Count
            })
            .ToListAsync();

        // Initialize children after fetching
        foreach (var child in children)
        {
            child.Children = new List<MediaFolderDto>();
        }

        folderDto.Children = children;

        foreach (var child in folderDto.Children)
        {
            await LoadChildrenAsync(child);
        }
    }
}
