using Dynamo.CMS.API.Contracts;
using Dynamo.CMS.API.Data;
using Dynamo.CMS.API.Models;
using Dynamo.CMS.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.IO.Abstractions;

namespace Dynamo.CMS.API.Controllers;

/// <summary>
/// Controller for managing the media library (Strapi-like file management)
/// </summary>
[ApiController]
[Route("api/media")]
[Produces("application/json")]
[Authorize]
public class MediaLibraryController : ControllerBase
{
    private readonly ILogger<MediaLibraryController> _logger;
    private readonly AppDbContext _context;
    private readonly IFileManager _fileManager;
    private readonly IFileSystem _fileSystem;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public MediaLibraryController(
        ILogger<MediaLibraryController> logger,
        AppDbContext context,
        IFileManager fileManager,
        IFileSystem fileSystem,
        IHttpContextAccessor httpContextAccessor)
    {
        _logger = logger;
        _context = context;
        _fileManager = fileManager;
        _fileSystem = fileSystem;
        _httpContextAccessor = httpContextAccessor;
    }

    /// <summary>
    /// Uploads one or more files to the media library
    /// </summary>
    [HttpPost("upload")]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(typeof(List<MediaFileDTO>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UploadFiles(
        [FromForm] MediaFileUploadDTO? metadata = null,
        [FromForm] string? folder = null)
    {
        try
        {
            if (Request.Form.Files == null || !Request.Form.Files.Any())
            {
                return Problem(
                    detail: "No files provided.",
                    statusCode: StatusCodes.Status400BadRequest,
                    title: "No Files"
                );
            }

            // Get current user ID
            long? userId = null;
            if (User.Identity?.IsAuthenticated == true && 
                long.TryParse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value, out var parsedUserId))
            {
                userId = parsedUserId;
            }

            var uploadedFiles = new List<MediaFileDTO>();

            foreach (var file in Request.Form.Files)
            {
                if (file.Length == 0)
                    continue;

                try
                {
                    // Upload to media library folder
                    var collectionName = "media-library";
                    var subPath = string.IsNullOrEmpty(folder) 
                        ? Array.Empty<string>() 
                        : new[] { folder };

                    var filePath = await _fileManager.UploadAsync(
                        file,
                        collectionName,
                        subPath,
                        CancellationToken.None);

                    int? folderId = null;
                    if (!string.IsNullOrWhiteSpace(folder))
                    {
                        var mediaFolder = await _context.MediaFolders
                            .FirstOrDefaultAsync(f => f.Name == folder);
                        folderId = mediaFolder?.Id;
                    }

                    // Create entity
                    var fileEntity = new UploadedFileEntity
                    {
                        FileName = _fileSystem.Path.GetFileName(filePath),
                        OriginalFileName = file.FileName,
                        FilePath = filePath,
                        ContentType = file.ContentType,
                        FileSize = file.Length,
                        DisplayName = metadata?.DisplayName ?? file.FileName,
                        Description = metadata?.Description,
                        CollectionName = null, // Media library files aren't tied to a collection
                        RecordId = null,
                        ColumnName = null,
                        UploadedAt = DateTimeOffset.UtcNow,
                        UploadedBy = userId,
                        FolderId = folderId
                    };

                    _context.UploadedFiles.Add(fileEntity);
                    await _context.SaveChangesAsync();

                    await _context.Entry(fileEntity).Reference(f => f.Folder).LoadAsync();

                    // Create DTO
                    var mediaFile = MapToMediaFileDTO(fileEntity);
                    uploadedFiles.Add(mediaFile);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error uploading file {FileName}", file.FileName);
                    // Continue with other files
                }
            }

            return Ok(uploadedFiles);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading files to media library");
            return Problem(
                detail: "An error occurred while uploading files.",
                statusCode: StatusCodes.Status500InternalServerError,
                title: "Upload Error"
            );
        }
    }

    /// <summary>
    /// Gets a paginated list of files in the media library with optional filtering
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(MediaFileListResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetFiles([FromQuery] MediaFileFilterDTO? filter = null)
    {
        try
        {
            var query = _context.UploadedFiles
                .Include(f => f.Uploader)
                .Include(f => f.Folder)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(filter?.Folder))
            {
                var folderName = filter.Folder.Trim();
                query = query.Where(f => f.Folder != null && f.Folder.Name == folderName);
            }

            // Apply filters
            if (!string.IsNullOrWhiteSpace(filter?.Search))
            {
                var search = filter.Search.ToLower();
                query = query.Where(f =>
                    (f.OriginalFileName != null && f.OriginalFileName.ToLower().Contains(search)) ||
                    (f.DisplayName != null && f.DisplayName.ToLower().Contains(search)) ||
                    (f.Description != null && f.Description.ToLower().Contains(search)));
            }

            if (!string.IsNullOrWhiteSpace(filter?.ContentType))
            {
                query = query.Where(f => f.ContentType != null && f.ContentType.Contains(filter.ContentType));
            }

            if (!string.IsNullOrWhiteSpace(filter?.Extension))
            {
                var ext = filter.Extension.StartsWith(".") ? filter.Extension : "." + filter.Extension;
                query = query.Where(f => f.FileName.EndsWith(ext, StringComparison.OrdinalIgnoreCase));
            }

            if (filter?.UploadedBy.HasValue == true)
            {
                query = query.Where(f => f.UploadedBy == filter.UploadedBy.Value);
            }

            if (filter?.UploadedAfter.HasValue == true)
            {
                query = query.Where(f => f.UploadedAt >= filter.UploadedAfter.Value);
            }

            if (filter?.UploadedBefore.HasValue == true)
            {
                query = query.Where(f => f.UploadedAt <= filter.UploadedBefore.Value);
            }

            if (filter?.MinSize.HasValue == true)
            {
                query = query.Where(f => f.FileSize >= filter.MinSize.Value);
            }

            if (filter?.MaxSize.HasValue == true)
            {
                query = query.Where(f => f.FileSize <= filter.MaxSize.Value);
            }

            // Apply sorting
            query = (filter?.SortBy?.ToLower()) switch
            {
                "name" => filter?.SortDescending == true
                    ? query.OrderByDescending(f => f.DisplayName ?? f.OriginalFileName ?? f.FileName)
                    : query.OrderBy(f => f.DisplayName ?? f.OriginalFileName ?? f.FileName),
                "size" => filter?.SortDescending == true
                    ? query.OrderByDescending(f => f.FileSize)
                    : query.OrderBy(f => f.FileSize),
                "uploadedat" or "date" => filter?.SortDescending == true
                    ? query.OrderByDescending(f => f.UploadedAt)
                    : query.OrderBy(f => f.UploadedAt),
                _ => query.OrderByDescending(f => f.UploadedAt) // Default: newest first
            };

            // Get total count before pagination
            var totalCount = await query.CountAsync();

            // Apply pagination
            var page = filter?.Page ?? 1;
            var pageSize = filter?.PageSize ?? 50;
            var skip = (page - 1) * pageSize;

            var files = await query
                .Skip(skip)
                .Take(pageSize)
                .ToListAsync();

            var mediaFiles = files.Select(MapToMediaFileDTO).ToList();

            var response = new MediaFileListResponse
            {
                Data = mediaFiles,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling((double)totalCount / pageSize)
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving media library files");
            return Problem(
                detail: "An error occurred while retrieving files.",
                statusCode: StatusCodes.Status500InternalServerError,
                title: "Retrieval Error"
            );
        }
    }

    /// <summary>
    /// Gets a specific file from the media library by ID
    /// </summary>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(MediaFileDTO), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetFile(long id)
    {
        try
        {
            var fileEntity = await _context.UploadedFiles
                .Include(f => f.Uploader)
                .FirstOrDefaultAsync(f => f.Id == id && f.CollectionName == null);

            if (fileEntity == null)
            {
                return NotFound(new { message = "File not found." });
            }

            var mediaFile = MapToMediaFileDTO(fileEntity);
            return Ok(mediaFile);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving file {FileId}", id);
            return Problem(
                detail: "An error occurred while retrieving the file.",
                statusCode: StatusCodes.Status500InternalServerError,
                title: "Retrieval Error"
            );
        }
    }

    /// <summary>
    /// Updates metadata for a media file
    /// </summary>
    [HttpPut("{id}")]
    [ProducesResponseType(typeof(MediaFileDTO), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateFile(long id, [FromBody] MediaFileUpdateDTO updateDto)
    {
        try
        {
            var fileEntity = await _context.UploadedFiles
                .FirstOrDefaultAsync(f => f.Id == id && f.CollectionName == null);

            if (fileEntity == null)
            {
                return NotFound(new { message = "File not found." });
            }

            if (!string.IsNullOrWhiteSpace(updateDto.DisplayName))
            {
                fileEntity.DisplayName = updateDto.DisplayName;
            }

            if (updateDto.Description != null)
            {
                fileEntity.Description = updateDto.Description;
            }

            await _context.SaveChangesAsync();

            await _context.Entry(fileEntity).Reference(f => f.Uploader).LoadAsync();
            var mediaFile = MapToMediaFileDTO(fileEntity);

            return Ok(mediaFile);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating file {FileId}", id);
            return Problem(
                detail: "An error occurred while updating the file.",
                statusCode: StatusCodes.Status500InternalServerError,
                title: "Update Error"
            );
        }
    }

    /// <summary>
    /// Deletes a file from the media library
    /// </summary>
    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteFile(long id)
    {
        try
        {
            var fileEntity = await _context.UploadedFiles
                .FirstOrDefaultAsync(f => f.Id == id && f.CollectionName == null);

            if (fileEntity == null)
            {
                return NotFound(new { message = "File not found." });
            }

            // Delete physical file
            try
            {
                if (_fileSystem.File.Exists(fileEntity.FilePath))
                {
                    _fileSystem.File.Delete(fileEntity.FilePath);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not delete physical file {FilePath}", fileEntity.FilePath);
            }

            // Delete entity
            _context.UploadedFiles.Remove(fileEntity);
            await _context.SaveChangesAsync();

            return Ok(new { message = "File deleted successfully." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting file {FileId}", id);
            return Problem(
                detail: "An error occurred while deleting the file.",
                statusCode: StatusCodes.Status500InternalServerError,
                title: "Delete Error"
            );
        }
    }

    /// <summary>
    /// Serves/downloads a file from the media library
    /// </summary>
    [HttpGet("{id}/file")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ServeFile(long id, [FromQuery] bool download = false)
    {
        try
        {
            var fileEntity = await _context.UploadedFiles
                .FirstOrDefaultAsync(f => f.Id == id);

            if (fileEntity == null)
            {
                return NotFound(new { message = "File not found." });
            }

            if (!_fileSystem.File.Exists(fileEntity.FilePath))
            {
                return NotFound(new { message = "Physical file not found." });
            }

            var fileBytes = await _fileSystem.File.ReadAllBytesAsync(fileEntity.FilePath);
            var contentType = fileEntity.ContentType ?? "application/octet-stream";
            var fileName = fileEntity.OriginalFileName ?? fileEntity.FileName;

            if (download)
            {
                return File(fileBytes, contentType, fileName);
            }

            return File(fileBytes, contentType);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error serving file {FileId}", id);
            return Problem(
                detail: "An error occurred while serving the file.",
                statusCode: StatusCodes.Status500InternalServerError,
                title: "File Serving Error"
            );
        }
    }

    /// <summary>
    /// Bulk deletes multiple files
    /// </summary>
    [HttpDelete("bulk")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> BulkDeleteFiles([FromBody] List<long> fileIds)
    {
        try
        {
            var files = await _context.UploadedFiles
                .Where(f => fileIds.Contains(f.Id) && f.CollectionName == null)
                .ToListAsync();

            var deletedCount = 0;
            foreach (var file in files)
            {
                try
                {
                    if (_fileSystem.File.Exists(file.FilePath))
                    {
                        _fileSystem.File.Delete(file.FilePath);
                    }
                    _context.UploadedFiles.Remove(file);
                    deletedCount++;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Error deleting file {FileId}", file.Id);
                }
            }

            await _context.SaveChangesAsync();

            return Ok(new { 
                message = $"Successfully deleted {deletedCount} of {fileIds.Count} files.",
                deletedCount = deletedCount,
                requestedCount = fileIds.Count
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error bulk deleting files");
            return Problem(
                detail: "An error occurred while deleting files.",
                statusCode: StatusCodes.Status500InternalServerError,
                title: "Bulk Delete Error"
            );
        }
    }

    /// <summary>
    /// Maps UploadedFileEntity to MediaFileDTO
    /// </summary>
    private MediaFileDTO MapToMediaFileDTO(UploadedFileEntity entity)
    {
        var extension = _fileSystem.Path.GetExtension(entity.FileName).ToLower();
        var contentType = entity.ContentType ?? "application/octet-stream";
        
        var isImage = contentType.StartsWith("image/");
        var isVideo = contentType.StartsWith("video/");
        var isDocument = contentType.Contains("pdf") || 
                        contentType.Contains("word") || 
                        contentType.Contains("excel") ||
                        contentType.Contains("powerpoint") ||
                        contentType.Contains("text") ||
                        extension is ".doc" or ".docx" or ".xls" or ".xlsx" or ".ppt" or ".pptx" or ".txt" or ".pdf";

        // Generate URL for file access
        var request = _httpContextAccessor.HttpContext?.Request;
        var scheme = request?.Scheme ?? "http";
        var host = request?.Host.Value ?? "localhost:7000";
        var fileUrl = $"{scheme}://{host}/api/media/{entity.Id}/file";

        return new MediaFileDTO
        {
            Id = entity.Id,
            FileName = entity.FileName,
            OriginalFileName = entity.OriginalFileName,
            DisplayName = entity.DisplayName ?? entity.OriginalFileName ?? entity.FileName,
            Description = entity.Description,
            ContentType = entity.ContentType,
            FileSize = entity.FileSize,
            Url = fileUrl,
            ThumbnailUrl = isImage ? fileUrl : null, // For images, URL can serve as thumbnail
            UploadedAt = entity.UploadedAt,
            UploadedBy = entity.UploadedBy,
            UploaderName = entity.Uploader?.UserName ?? entity.Uploader?.Email,
            CollectionName = entity.CollectionName,
            RecordId = entity.RecordId,
            ColumnName = entity.ColumnName,
            Extension = extension,
            IsImage = isImage,
            IsVideo = isVideo,
            IsDocument = isDocument,
            Folder = entity.Folder?.Name
        };
    }
}

