using Dynamo.CMS.API.Data;
using Dynamo.CMS.API.Models;
using Microsoft.EntityFrameworkCore;

namespace Dynamo.CMS.API.Services;

/// <summary>
/// Service for handling file uploads and creating file entities
/// </summary>
public interface IFileUploadService
{
    /// <summary>
    /// Uploads files and creates UploadedFileEntity records in the database
    /// </summary>
    /// <param name="files">Files to upload</param>
    /// <param name="collectionName">Name of the collection</param>
    /// <param name="columnName">Name of the column</param>
    /// <param name="recordId">Optional record ID if updating existing record</param>
    /// <param name="userId">Optional user ID who uploaded the files</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of UploadedFile DTOs representing the uploaded files</returns>
    Task<List<UploadedFile>> UploadFilesAsync(
        IFormFile[] files,
        string collectionName,
        string columnName,
        string? recordId = null,
        long? userId = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Deletes a file entity and its physical file
    /// </summary>
    Task<bool> DeleteFileAsync(long fileId, CancellationToken cancellationToken = default);
}

public class FileUploadService : IFileUploadService
{
    private readonly IFileManager _fileManager;
    private readonly AppDbContext _context;
    private readonly ILogger<FileUploadService> _logger;

    public FileUploadService(
        IFileManager fileManager,
        AppDbContext context,
        ILogger<FileUploadService> logger)
    {
        _fileManager = fileManager;
        _context = context;
        _logger = logger;
    }

    public async Task<List<UploadedFile>> UploadFilesAsync(
        IFormFile[] files,
        string collectionName,
        string columnName,
        string? recordId = null,
        long? userId = null,
        CancellationToken cancellationToken = default)
    {
        var uploadedFiles = new List<UploadedFile>();

        foreach (var file in files)
        {
            if (file.Length == 0)
                continue;

            try
            {
                // Build sub-path for file organization
                var subPath = new List<string>();
                if (!string.IsNullOrEmpty(recordId))
                {
                    subPath.Add(recordId);
                }
                subPath.Add(columnName);

                // Upload file to filesystem
                var filePath = await _fileManager.UploadAsync(
                    file,
                    collectionName,
                    subPath.ToArray(),
                    cancellationToken);

                // Create entity in database
                var fileEntity = new UploadedFileEntity
                {
                    FileName = System.IO.Path.GetFileName(filePath),
                    OriginalFileName = file.FileName,
                    FilePath = filePath,
                    ContentType = file.ContentType,
                    FileSize = file.Length,
                    CollectionName = collectionName,
                    ColumnName = columnName,
                    RecordId = recordId,
                    UploadedAt = DateTimeOffset.UtcNow,
                    UploadedBy = userId
                };

                _context.UploadedFiles.Add(fileEntity);
                await _context.SaveChangesAsync(cancellationToken);

                // Create DTO for response
                var uploadedFile = new UploadedFile
                {
                    Id = fileEntity.Id.ToString(),
                    DisplayName = fileEntity.DisplayName ?? fileEntity.OriginalFileName,
                    Description = fileEntity.Description,
                    UploadedAt = fileEntity.UploadedAt,
                    Location = fileEntity.FilePath
                };

                uploadedFiles.Add(uploadedFile);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading file {FileName} for collection {CollectionName}, column {ColumnName}",
                    file.FileName, collectionName, columnName);
                throw;
            }
        }

        return uploadedFiles;
    }

    public async Task<bool> DeleteFileAsync(long fileId, CancellationToken cancellationToken = default)
    {
        var fileEntity = await _context.UploadedFiles
            .FirstOrDefaultAsync(f => f.Id == fileId, cancellationToken);

        if (fileEntity == null)
        {
            return false;
        }

        try
        {
            // Delete physical file
            _fileManager.Delete(fileEntity.FilePath);

            // Delete entity
            _context.UploadedFiles.Remove(fileEntity);
            await _context.SaveChangesAsync(cancellationToken);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting file {FileId} at path {FilePath}", fileId, fileEntity.FilePath);
            return false;
        }
    }
}

