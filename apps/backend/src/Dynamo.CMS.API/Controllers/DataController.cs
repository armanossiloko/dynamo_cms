using Dynamo.CMS.API.Contracts;
using Dynamo.CMS.API.Data;
using Dynamo.CMS.API.Extensions;
using Dynamo.CMS.API.Models;
using Dynamo.CMS.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Data;
using System.Text.Json;

namespace Dynamo.CMS.API.Controllers;

/// <summary>
/// Controller for managing data operations on dynamic collections
/// </summary>
[ApiController]
[Route("api/data/{collectionName}")]
[Produces("application/json")]
[Authorize]
public class DataController : ControllerBase
{
    private readonly ILogger<DataController> _logger;
    private readonly AppDbContext _context;
    private readonly PostgreSQLGenerator _sqlGenerator;
    private readonly IFileUploadService _fileUploadService;
    private readonly ISlugService _slugService;

    public DataController(
        ILogger<DataController> logger,
        AppDbContext context,
        PostgreSQLGenerator sqlGenerator,
        IFileUploadService fileUploadService,
        ISlugService slugService
        )
    {
        _logger = logger;
        _context = context;
        _sqlGenerator = sqlGenerator;
        _fileUploadService = fileUploadService;
        _slugService = slugService;
    }

    /// <summary>
    /// Retrieves data from a collection with optional filtering, pagination, and sorting
    /// </summary>
    /// <param name="collectionName">Name of the collection</param>
    /// <param name="filter">Optional filtering and pagination parameters</param>
    /// <returns>Paginated data from the collection</returns>
    [HttpGet]
    [ProducesResponseType(typeof(DataResponseDTO), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetData(string collectionName, [FromQuery] DataFilterDTO? filter = null)
    {
        try
        {
            // Validate collection exists
            var dataCollection = await _context.DataCollections
                .AsNoTracking()
                .Include(d => d.Columns)
                .FirstOrDefaultAsync(d => d.Name == collectionName);

            if (dataCollection == null)
            {
                return Problem(
                    detail: $"Collection '{collectionName}' not found.",
                    statusCode: StatusCodes.Status404NotFound,
                    title: "Collection Not Found"
                );
            }

            // Get visible columns only
            var visibleColumns = dataCollection.Columns.Where(c => c.Visible).ToList();

            // Generate SELECT query
            var selectQuery = _sqlGenerator.GenerateSelectSql(
                collectionName,
                visibleColumns,
                filter?.OrderBy,
                filter?.OrderByDesc,
                filter?.Page,
                filter?.Count,
                filter?.Where
            );

            // Execute query and get results
            var results = _context.GetDbRecords(selectQuery).ToList();

            // Calculate pagination info
            var page = filter?.Page ?? 1;
            var pageSize = filter?.Count ?? 50;
            var totalCount = results.Count;
            var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);

            var response = new DataResponseDTO
            {
                Data = results,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
                TotalPages = totalPages
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving data from collection '{CollectionName}'", collectionName);
            return Problem(
                detail: "An error occurred while retrieving data.",
                statusCode: StatusCodes.Status500InternalServerError,
                title: "Internal Server Error",
                instance: HttpContext.Request.Path
            );
        }
    }

    /// <summary>
    /// Retrieves a specific record by ID from a collection
    /// </summary>
    /// <param name="collectionName">Name of the collection</param>
    /// <param name="id">ID of the record to retrieve</param>
    /// <returns>The requested record</returns>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(Dictionary<string, object?>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetDataById(string collectionName, string id)
    {
        try
        {
            // Validate collection exists
            var dataCollection = await _context.DataCollections
                .AsNoTracking()
                .Include(d => d.Columns)
                .FirstOrDefaultAsync(d => d.Name == collectionName);

            if (dataCollection == null)
            {
                return Problem(
                    detail: $"Collection '{collectionName}' not found.",
                    statusCode: StatusCodes.Status404NotFound,
                    title: "Collection Not Found"
                );
            }

            // Find the primary key column (auto-increment or first unique column)
            var primaryKeyColumn = dataCollection.Columns.FirstOrDefault(c => c.AutoIncrement) ?? dataCollection.Columns.FirstOrDefault(c => c.Unique);

            if (primaryKeyColumn == null)
            {
                return Problem(
                    detail: "Collection does not have a primary key column.",
                    statusCode: StatusCodes.Status400BadRequest,
                    title: "Invalid Collection Structure"
                );
            }

            // Get visible columns
            var visibleColumns = dataCollection.Columns.Where(c => c.Visible).ToList();

            // Create filter for the specific ID
            var whereCondition = new FilterConditionDTO
            {
                Field = primaryKeyColumn.Name,
                Operator = "=",
                Value = id
            };

            // Generate SELECT query
            var selectQuery = _sqlGenerator.GenerateSelectSql(
                collectionName,
                visibleColumns,
                where: whereCondition
            );

            // Execute query
            var result = _context.GetDbRecords(selectQuery).FirstOrDefault();

            if (result == null)
            {
                return Problem(
                    detail: $"Record with ID '{id}' not found in collection '{collectionName}'.",
                    statusCode: StatusCodes.Status404NotFound,
                    title: "Record Not Found"
                );
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving record {Id} from collection '{CollectionName}'", id, collectionName);
            return Problem(
                detail: "An error occurred while retrieving the record.",
                statusCode: StatusCodes.Status500InternalServerError,
                title: "Internal Server Error",
                instance: HttpContext.Request.Path
            );
        }
    }

    /// <summary>
    /// Inserts new data into a collection. Supports both JSON and multipart/form-data for file uploads.
    /// </summary>
    /// <param name="collectionName">Name of the collection</param>
    /// <returns>Success response with inserted record</returns>
    [HttpPost]
    [Consumes("application/json", "multipart/form-data")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> InsertData(string collectionName)
    {
        try
        {
            // Validate collection exists
            var dataCollection = await _context.DataCollections
                .AsNoTracking()
                .Include(d => d.Columns)
                .FirstOrDefaultAsync(d => d.Name == collectionName);

            if (dataCollection == null)
            {
                return Problem(
                    detail: $"Collection '{collectionName}' not found.",
                    statusCode: StatusCodes.Status404NotFound,
                    title: "Collection Not Found"
                );
            }

            // Get current user ID if authenticated
            long? userId = null;
            if (User.Identity?.IsAuthenticated == true && long.TryParse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value, out var parsedUserId))
            {
                userId = parsedUserId;
            }

            // Parse data from request (JSON or form)
            Dictionary<string, object?> data;
            if (Request.HasFormContentType)
            {
                // Extract form data from request
                data = [];

                // Get all form fields (excluding files, which are handled separately)
                foreach (var key in Request.Form.Keys)
                {
                    if (Request.Form[key].Count > 0)
                    {
                        var value = Request.Form[key].ToString();
                        // Try to parse as appropriate type
                        if (DateTimeOffset.TryParse(value, out var dateValue))
                        {
                            data[key] = dateValue;
                        }
                        else if (bool.TryParse(value, out var boolValue))
                        {
                            data[key] = boolValue;
                        }
                        else if (decimal.TryParse(value, out var decimalValue))
                        {
                            data[key] = decimalValue;
                        }
                        else if (long.TryParse(value, out var longValue))
                        {
                            data[key] = longValue;
                        }
                        else if (int.TryParse(value, out var intValue))
                        {
                            data[key] = intValue;
                        }
                        else
                        {
                            data[key] = value;
                        }
                    }
                }

                // Process file uploads for file-type columns
                await ProcessFileUploadsAsync(dataCollection, data, collectionName, null, userId);
            }
            else
            {
                // Read JSON data from body
                Request.Body.Position = 0; // Reset stream position
                using var reader = new StreamReader(Request.Body, leaveOpen: true);
                var jsonString = await reader.ReadToEndAsync();
                data = JsonSerializer.Deserialize<Dictionary<string, object?>>(jsonString) ?? [];

                // Resolve media library file references (file IDs) to UploadedFile objects
                await ResolveMediaLibraryFileReferencesAsync(dataCollection, data);
            }

            // Process slug fields - auto-generate slugs from source fields
            await ProcessSlugFieldsAsync(dataCollection, data);

            // Get base types for reference handling
            var baseTypes = await _context.BaseTypes.AsNoTracking().ToListAsync();

            // Convert data to JsonElement for processing
            var jsonElement = JsonSerializer.SerializeToElement(data);
            var dataList = new List<JsonElement> { jsonElement };

            // Generate INSERT statements
            var insertQueries = _sqlGenerator.GenerateInsertIntoSql(
                collectionName,
                dataList,
                dataCollection.Columns.ToList(),
                baseTypes
            ).ToList();

            if (!insertQueries.Any())
            {
                return Problem(
                    detail: "No valid data to insert.",
                    statusCode: StatusCodes.Status400BadRequest,
                    title: "Invalid Data"
                );
            }

            // Execute the insert
            var insertQuery = insertQueries.First();
            var parameters = insertQuery.Parameters ?? new Dictionary<string, object?>();

            await _context.ExecuteAsync(insertQuery.Query, parameters);

            // Return the inserted data
            return CreatedAtAction(nameof(GetDataById), new { collectionName, id = "new" }, data);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error inserting data into collection '{CollectionName}'", collectionName);
            return Problem(
                detail: "An error occurred while inserting data.",
                statusCode: StatusCodes.Status500InternalServerError,
                title: "Internal Server Error",
                instance: HttpContext.Request.Path
            );
        }
    }

    /// <summary>
    /// Updates existing data in a collection. Supports both JSON and multipart/form-data for file uploads.
    /// </summary>
    /// <param name="collectionName">Name of the collection</param>
    /// <param name="id">ID of the record to update</param>
    /// <returns>Success response with updated record</returns>
    [HttpPut("{id}")]
    [Consumes("application/json", "multipart/form-data")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> UpdateData(string collectionName, string id, [FromBody] DataUpdateDTO? updateData = null, [FromForm] Dictionary<string, object?>? formData = null)
    {
        try
        {
            // Validate collection exists
            var dataCollection = await _context.DataCollections
                .AsNoTracking()
                .Include(d => d.Columns)
                .FirstOrDefaultAsync(d => d.Name == collectionName);

            if (dataCollection == null)
            {
                return Problem(
                    detail: $"Collection '{collectionName}' not found.",
                    statusCode: StatusCodes.Status404NotFound,
                    title: "Collection Not Found"
                );
            }

            // Get current user ID if authenticated
            long? userId = null;
            if (User.Identity?.IsAuthenticated == true && long.TryParse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value, out var parsedUserId))
            {
                userId = parsedUserId;
            }

            // Parse data from request (JSON or form)
            Dictionary<string, object?> data;
            if (Request.HasFormContentType)
            {
                // Extract form data from request
                data = new Dictionary<string, object?>();

                // Get all form fields (excluding files, which are handled separately)
                foreach (var key in Request.Form.Keys)
                {
                    if (Request.Form[key].Count > 0)
                    {
                        var value = Request.Form[key].ToString();
                        // Try to parse as appropriate type
                        if (DateTimeOffset.TryParse(value, out var dateValue))
                        {
                            data[key] = dateValue;
                        }
                        else if (bool.TryParse(value, out var boolValue))
                        {
                            data[key] = boolValue;
                        }
                        else if (decimal.TryParse(value, out var decimalValue))
                        {
                            data[key] = decimalValue;
                        }
                        else if (long.TryParse(value, out var longValue))
                        {
                            data[key] = longValue;
                        }
                        else if (int.TryParse(value, out var intValue))
                        {
                            data[key] = intValue;
                        }
                        else
                        {
                            data[key] = value;
                        }
                    }
                }

                // Process file uploads for file-type columns
                await ProcessFileUploadsAsync(dataCollection, data, collectionName, id, userId);
            }
            else
            {
                // Read JSON data from body
                Request.Body.Position = 0; // Reset stream position
                using var reader = new StreamReader(Request.Body, leaveOpen: true);
                var jsonString = await reader.ReadToEndAsync();
                var jsonData = JsonSerializer.Deserialize<DataUpdateDTO>(jsonString);
                data = jsonData?.Data ?? new Dictionary<string, object?>();

                // Resolve media library file references (file IDs) to UploadedFile objects
                await ResolveMediaLibraryFileReferencesAsync(dataCollection, data);
            }

            // Process slug fields - auto-generate slugs from source fields if slug not provided
            await ProcessSlugFieldsAsync(dataCollection, data);

            // Find the primary key column
            var primaryKeyColumn = dataCollection.Columns
                .FirstOrDefault(c => c.AutoIncrement) ??
                dataCollection.Columns.FirstOrDefault(c => c.Unique);

            if (primaryKeyColumn == null)
            {
                return Problem(
                    detail: "Collection does not have a primary key column.",
                    statusCode: StatusCodes.Status400BadRequest,
                    title: "Invalid Collection Structure"
                );
            }

            // Build UPDATE query
            var setClauses = data
                .Where(kvp => kvp.Key != primaryKeyColumn.Name) // Don't update the primary key
                .Select(kvp => $"\"{kvp.Key}\" = @{kvp.Key}")
                .ToList();

            if (!setClauses.Any())
            {
                return Problem(
                    detail: "No fields to update.",
                    statusCode: StatusCodes.Status400BadRequest,
                    title: "Invalid Update Request"
                );
            }

            var updateQuery = $@"
                UPDATE ""{collectionName}""
                SET {string.Join(", ", setClauses)}
                WHERE ""{primaryKeyColumn.Name}"" = @{primaryKeyColumn.Name}";

            // Prepare parameters
            var parameters = new Dictionary<string, object?>(data)
            {
                [primaryKeyColumn.Name] = id
            };

            // Execute update
            var rowsAffected = await _context.ExecuteAsync(updateQuery, parameters);

            if (rowsAffected == 0)
            {
                return Problem(
                    detail: $"Record with ID '{id}' not found in collection '{collectionName}'.",
                    statusCode: StatusCodes.Status404NotFound,
                    title: "Record Not Found"
                );
            }

            // Return updated data
            return Ok(new { message = "Record updated successfully.", data = data });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating record {Id} in collection '{CollectionName}'", id, collectionName);
            return Problem(
                detail: "An error occurred while updating the record.",
                statusCode: StatusCodes.Status500InternalServerError,
                title: "Internal Server Error",
                instance: HttpContext.Request.Path
            );
        }
    }

    /// <summary>
    /// Deletes a record from a collection
    /// </summary>
    /// <param name="collectionName">Name of the collection</param>
    /// <param name="id">ID of the record to delete</param>
    /// <returns>Success response</returns>
    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> DeleteData(string collectionName, string id)
    {
        try
        {
            // Validate collection exists
            var dataCollection = await _context.DataCollections
                .AsNoTracking()
                .Include(d => d.Columns)
                .FirstOrDefaultAsync(d => d.Name == collectionName);

            if (dataCollection == null)
            {
                return Problem(
                    detail: $"Collection '{collectionName}' not found.",
                    statusCode: StatusCodes.Status404NotFound,
                    title: "Collection Not Found"
                );
            }

            // Find the primary key column
            var primaryKeyColumn = dataCollection.Columns
                .FirstOrDefault(c => c.AutoIncrement) ??
                dataCollection.Columns.FirstOrDefault(c => c.Unique);

            if (primaryKeyColumn == null)
            {
                return Problem(
                    detail: "Collection does not have a primary key column.",
                    statusCode: StatusCodes.Status400BadRequest,
                    title: "Invalid Collection Structure"
                );
            }

            // Build DELETE query
            var deleteQuery = $@"
                DELETE FROM ""{collectionName}""
                WHERE ""{primaryKeyColumn.Name}"" = @{primaryKeyColumn.Name}";

            var parameters = new Dictionary<string, object?>
            {
                [primaryKeyColumn.Name] = id
            };

            // Execute delete
            var rowsAffected = await _context.ExecuteAsync(deleteQuery, parameters);

            if (rowsAffected == 0)
            {
                return Problem(
                    detail: $"Record with ID '{id}' not found in collection '{collectionName}'.",
                    statusCode: StatusCodes.Status404NotFound,
                    title: "Record Not Found"
                );
            }

            return Ok(new { message = "Record deleted successfully." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting record {Id} from collection '{CollectionName}'", id, collectionName);
            return Problem(
                detail: "An error occurred while deleting the record.",
                statusCode: StatusCodes.Status500InternalServerError,
                title: "Internal Server Error",
                instance: HttpContext.Request.Path
            );
        }
    }

    /// <summary>
    /// Resolves media library file ID references to UploadedFile objects
    /// </summary>
    private async Task ResolveMediaLibraryFileReferencesAsync(
        DataCollection dataCollection,
        Dictionary<string, object?> data)
    {
        var fileColumns = dataCollection.Columns
            .Where(c => c.BaseTypeName == "file" || c.BaseTypeName == "file[]")
            .ToList();

        foreach (var column in fileColumns)
        {
            if (!data.ContainsKey(column.Name))
                continue;

            var value = data[column.Name];
            if (value == null)
                continue;

            try
            {
                // Check if value is a file ID (number or string number)
                long? fileId = null;
                if (value is JsonElement jsonElement)
                {
                    if (jsonElement.ValueKind == JsonValueKind.Number && jsonElement.TryGetInt64(out var id))
                    {
                        fileId = id;
                    }
                    else if (jsonElement.ValueKind == JsonValueKind.String && long.TryParse(jsonElement.GetString(), out var stringId))
                    {
                        fileId = stringId;
                    }
                    else if (jsonElement.ValueKind == JsonValueKind.Object)
                    {
                        // Already an UploadedFile object, skip
                        continue;
                    }
                }
                else if (value is long longValue)
                {
                    fileId = longValue;
                }
                else if (value is int intValue)
                {
                    fileId = intValue;
                }
                else if (value is string stringValue && long.TryParse(stringValue, out var parsedId))
                {
                    fileId = parsedId;
                }
                else if (value is List<object> listValue)
                {
                    // Handle array of file IDs
                    var resolvedFiles = new List<UploadedFile>();
                    foreach (var item in listValue)
                    {
                        long? itemFileId = null;
                        if (item is JsonElement itemElement)
                        {
                            if (itemElement.ValueKind == JsonValueKind.Number && itemElement.TryGetInt64(out var itemId))
                            {
                                itemFileId = itemId;
                            }
                            else if (itemElement.ValueKind == JsonValueKind.String && long.TryParse(itemElement.GetString(), out var itemStringId))
                            {
                                itemFileId = itemStringId;
                            }
                            else if (itemElement.ValueKind == JsonValueKind.Object)
                            {
                                // Already an UploadedFile object
                                var fileObj = JsonSerializer.Deserialize<UploadedFile>(itemElement);
                                if (fileObj != null)
                                {
                                    resolvedFiles.Add(fileObj);
                                }
                                continue;
                            }
                        }
                        else if (item is long itemLong)
                        {
                            itemFileId = itemLong;
                        }
                        else if (item is int itemInt)
                        {
                            itemFileId = itemInt;
                        }
                        else if (item is string itemString && long.TryParse(itemString, out var parsedItemId))
                        {
                            itemFileId = parsedItemId;
                        }

                        if (itemFileId.HasValue)
                        {
                            var fileEntity = await _context.UploadedFiles
                                .FirstOrDefaultAsync(f => f.Id == itemFileId.Value);

                            if (fileEntity != null)
                            {
                                resolvedFiles.Add(new UploadedFile
                                {
                                    Id = fileEntity.Id.ToString(),
                                    DisplayName = fileEntity.DisplayName ?? fileEntity.OriginalFileName ?? fileEntity.FileName,
                                    Description = fileEntity.Description,
                                    UploadedAt = fileEntity.UploadedAt,
                                    Location = fileEntity.FilePath
                                });
                            }
                        }
                    }
                    data[column.Name] = resolvedFiles;
                    continue;
                }

                // Resolve single file ID
                if (fileId.HasValue)
                {
                    var fileEntity = await _context.UploadedFiles
                        .FirstOrDefaultAsync(f => f.Id == fileId.Value);

                    if (fileEntity != null)
                    {
                        data[column.Name] = new UploadedFile
                        {
                            Id = fileEntity.Id.ToString(),
                            DisplayName = fileEntity.DisplayName ?? fileEntity.OriginalFileName ?? fileEntity.FileName,
                            Description = fileEntity.Description,
                            UploadedAt = fileEntity.UploadedAt,
                            Location = fileEntity.FilePath
                        };
                    }
                    else
                    {
                        _logger.LogWarning("Media library file with ID {FileId} not found for column {ColumnName}", fileId.Value, column.Name);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error resolving media library file reference for column {ColumnName}", column.Name);
                // Continue processing other columns
            }
        }
    }

    /// <summary>
    /// Processes file uploads for file-type columns in the data dictionary
    /// </summary>
    private async Task ProcessFileUploadsAsync(
        DataCollection dataCollection,
        Dictionary<string, object?> data,
        string collectionName,
        string? recordId,
        long? userId)
    {
        var fileColumns = dataCollection.Columns
            .Where(c => c.BaseTypeName == "file" || c.BaseTypeName == "file[]")
            .ToList();

        if (!fileColumns.Any())
        {
            return; // No file columns, nothing to process
        }

        _logger.LogInformation("Processing file uploads for {FileColumnCount} file columns in collection {CollectionName}",
            fileColumns.Count, collectionName);

        // Log all available files for debugging
        if (Request.Form.Files != null && Request.Form.Files.Any())
        {
            var fileNames = Request.Form.Files.Select(f => $"{f.Name}: {f.FileName} ({f.Length} bytes)").ToList();
            _logger.LogInformation("Received {FileCount} files: {FileNames}",
                Request.Form.Files.Count, string.Join(", ", fileNames));
        }
        else
        {
            _logger.LogInformation("No files received in request. Form has {FormKeyCount} keys: {FormKeys}",
                Request.Form.Keys.Count, string.Join(", ", Request.Form.Keys));
        }

        foreach (var column in fileColumns)
        {
            // Check if files were uploaded for this column
            if (Request.Form.Files != null && Request.Form.Files.Any(f => f.Name == column.Name))
            {
                var files = Request.Form.Files
                    .Where(f => f.Name == column.Name)
                    .ToArray();

                _logger.LogInformation("Found {FileCount} file(s) for column {ColumnName} (type: {BaseType})",
                    files.Length, column.Name, column.BaseTypeName);

                if (files.Length > 0)
                {
                    try
                    {
                        // Upload files and create entities
                        var uploadedFiles = await _fileUploadService.UploadFilesAsync(
                            files,
                            collectionName,
                            column.Name,
                            recordId,
                            userId);

                        _logger.LogInformation("Successfully uploaded {UploadedCount} file(s) for column {ColumnName}",
                            uploadedFiles.Count, column.Name);

                        // Set the data value based on column type
                        if (column.BaseTypeName == "file")
                        {
                            // Single file - take the first uploaded file
                            var singleFile = uploadedFiles.FirstOrDefault();
                            if (singleFile != null)
                            {
                                data[column.Name] = singleFile;
                                _logger.LogDebug("Set single file for column {ColumnName}: {FileId}",
                                    column.Name, singleFile.Id);
                            }
                        }
                        else if (column.BaseTypeName == "file[]")
                        {
                            // Multiple files - set as array
                            data[column.Name] = uploadedFiles;
                            _logger.LogDebug("Set {FileCount} files for column {ColumnName}",
                                uploadedFiles.Count, column.Name);
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error uploading files for column {ColumnName}", column.Name);
                        throw;
                    }
                }
            }
            else
            {
                _logger.LogDebug("No files found for column {ColumnName}", column.Name);
            }
        }
    }

    /// <summary>
    /// Performs bulk insert of multiple records
    /// </summary>
    /// <param name="collectionName">Name of the collection</param>
    /// <param name="data">Bulk data to insert</param>
    /// <returns>Success response with count of inserted records</returns>
    [HttpPost("bulk")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> BulkInsertData(string collectionName, [FromBody] DataBulkInsertDTO data)
    {
        try
        {
            // Validate collection exists
            var dataCollection = await _context.DataCollections
                .AsNoTracking()
                .Include(d => d.Columns)
                .FirstOrDefaultAsync(d => d.Name == collectionName);

            if (dataCollection == null)
            {
                return Problem(
                    detail: $"Collection '{collectionName}' not found.",
                    statusCode: StatusCodes.Status404NotFound,
                    title: "Collection Not Found"
                );
            }

            if (data.Data.Count == 0)
            {
                return Problem(
                    detail: "No data provided for bulk insert.",
                    statusCode: StatusCodes.Status400BadRequest,
                    title: "Invalid Bulk Insert Request"
                );
            }

            // Get base types for reference handling
            var baseTypes = await _context.BaseTypes.AsNoTracking().ToListAsync();

            // Convert data to JsonElement list
            var jsonDataList = data.Data.Select(d => JsonSerializer.SerializeToElement(d)).ToList();

            // Generate INSERT statements
            var insertQueries = _sqlGenerator.GenerateInsertIntoSql(
                collectionName,
                jsonDataList,
                dataCollection.Columns.ToList(),
                baseTypes
            ).ToList();

            if (insertQueries.Count == 0)
            {
                return Problem(
                    detail: "No valid data to insert.",
                    statusCode: StatusCodes.Status400BadRequest,
                    title: "Invalid Data"
                );
            }

            // Execute all inserts
            var insertedCount = 0;
            foreach (var insertQuery in insertQueries)
            {
                var parameters = insertQuery.Parameters ?? [];
                await _context.ExecuteAsync(insertQuery.Query, parameters);
                insertedCount++;
            }

            return CreatedAtAction(nameof(GetData), new { collectionName }, new
            {
                message = $"Successfully inserted {insertedCount} records.",
                count = insertedCount
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error performing bulk insert into collection '{CollectionName}'", collectionName);
            return Problem(
                detail: "An error occurred while performing bulk insert.",
                statusCode: StatusCodes.Status500InternalServerError,
                title: "Internal Server Error",
                instance: HttpContext.Request.Path
            );
        }
    }

    /// <summary>
    /// Processes slug fields by auto-generating slugs from their configured source fields
    /// </summary>
    private async Task ProcessSlugFieldsAsync(
        DataCollection dataCollection,
        Dictionary<string, object?> data)
    {
        var slugColumns = dataCollection.Columns
            .Where(c => c.BaseTypeName == "slug")
            .ToList();

        if (!slugColumns.Any())
            return;

        foreach (var slugColumn in slugColumns)
        {
            // If slug already provided by user, skip auto-generation
            if (data.ContainsKey(slugColumn.Name) && data[slugColumn.Name] != null)
                continue;

            // Parse custom properties to find source field
            string? sourceField = null;
            if (!string.IsNullOrEmpty(slugColumn.CustomProperties))
            {
                try
                {
                    var customProps = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(slugColumn.CustomProperties);
                    if (customProps != null && customProps.TryGetValue("sourceField", out var sourceFieldElement))
                    {
                        sourceField = sourceFieldElement.GetString();
                    }
                }
                catch (JsonException ex)
                {
                    _logger.LogWarning(ex, "Failed to parse custom properties for slug column {ColumnName}", slugColumn.Name);
                }
            }

            // Default to "title" or "name" field if no source field configured
            if (string.IsNullOrEmpty(sourceField))
            {
                sourceField = dataCollection.Columns.FirstOrDefault(c => c.Name.Equals("title", StringComparison.OrdinalIgnoreCase))?.Name
                    ?? dataCollection.Columns.FirstOrDefault(c => c.Name.Equals("name", StringComparison.OrdinalIgnoreCase))?.Name;
            }

            if (string.IsNullOrEmpty(sourceField) || !data.ContainsKey(sourceField))
                continue;

            var sourceValue = data[sourceField]?.ToString();
            if (string.IsNullOrEmpty(sourceValue))
                continue;

            // Generate slug
            string slug;
            if (slugColumn.Unique)
            {
                // For unique slugs, check existing values in the collection
                var existingSlugs = await GetExistingSlugsAsync(dataCollection.Name, slugColumn.Name);
                slug = _slugService.GenerateUniqueSlug(sourceValue, existingSlugs);
            }
            else
            {
                slug = _slugService.GenerateSlug(sourceValue);
            }

            data[slugColumn.Name] = slug;
            _logger.LogDebug("Generated slug '{Slug}' for column {ColumnName} from {SourceField}", slug, slugColumn.Name, sourceField);
        }
    }

    /// <summary>
    /// Gets all existing slug values from a collection for uniqueness checks
    /// </summary>
    private async Task<List<string>> GetExistingSlugsAsync(string collectionName, string slugColumnName)
    {
        try
        {
            var query = $"SELECT \"{slugColumnName}\" FROM \"{collectionName}\" WHERE \"{slugColumnName}\" IS NOT NULL";
            var results = _context.GetDbRecords(query);
            return results.Select(r => r[slugColumnName]?.ToString() ?? string.Empty)
                .Where(s => !string.IsNullOrEmpty(s))
                .ToList();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to get existing slugs for collection {CollectionName}, column {ColumnName}", collectionName, slugColumnName);
            return new List<string>();
        }
    }
}