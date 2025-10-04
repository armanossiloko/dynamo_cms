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

    public DataController(
        ILogger<DataController> logger,
        AppDbContext context,
        PostgreSQLGenerator sqlGenerator)
    {
        _logger = logger;
        _context = context;
        _sqlGenerator = sqlGenerator;
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
    /// Inserts new data into a collection
    /// </summary>
    /// <param name="collectionName">Name of the collection</param>
    /// <param name="data">Data to insert</param>
    /// <returns>Success response with inserted record</returns>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> InsertData(string collectionName, [FromBody] Dictionary<string, object?> data)
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

            // Get base types for reference handling
            var baseTypes = await _context.BaseTypes.AsNoTracking().ToListAsync();

            // Convert data to JsonElement for processing
            var jsonData = JsonSerializer.SerializeToElement(data);
            var dataList = new List<JsonElement> { jsonData };

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
    /// Updates existing data in a collection
    /// </summary>
    /// <param name="collectionName">Name of the collection</param>
    /// <param name="id">ID of the record to update</param>
    /// <param name="data">Updated data</param>
    /// <returns>Success response with updated record</returns>
    [HttpPut("{id}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> UpdateData(string collectionName, string id, [FromBody] DataUpdateDTO updateData)
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

            // Build UPDATE query
            var setClauses = updateData.Data
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
            var parameters = new Dictionary<string, object?>(updateData.Data)
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
            return Ok(new { message = "Record updated successfully.", data = updateData.Data });
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

            if (!data.Data.Any())
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

            if (!insertQueries.Any())
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
                var parameters = insertQuery.Parameters ?? new Dictionary<string, object?>();
                await _context.ExecuteAsync(insertQuery.Query, parameters);
                insertedCount++;
            }

            return CreatedAtAction(nameof(GetData), new { collectionName }, new { 
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
}