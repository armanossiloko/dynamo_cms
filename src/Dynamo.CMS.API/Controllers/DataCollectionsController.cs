using Dynamo.CMS.API.Contracts;
using Dynamo.CMS.API.Data;
using Dynamo.CMS.API.Extensions;
using Dynamo.CMS.API.Mapping;
using Dynamo.CMS.API.Models;
using Dynamo.CMS.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Data;

namespace Dynamo.API.Controllers;

[ApiController]
[Route("api/collections")]
//[Authorize]
public class DataCollectionsController : ControllerBase
{
    private readonly ILogger<DataCollectionsController> _logger;
    private readonly AppDbContext _context;
    private readonly PostgreSQLGenerator _sqlGenerator;
    private readonly CatalogMapper _catalogMapper;

    public DataCollectionsController(
        ILogger<DataCollectionsController> logger,
        AppDbContext context,
        PostgreSQLGenerator sqlGenerator,
        CatalogMapper catalogMapper
        )
    {
        _logger = logger;
        _context = context;
        _sqlGenerator = sqlGenerator;
        _catalogMapper = catalogMapper;
    }

    [HttpGet]
    public IActionResult GetDataCollections()
    {
        var dataCollections = _context.DataCollections
            .AsNoTracking()
            .Include(d => d.Columns)
            .Select(dataCollection => _catalogMapper.ToDataCollectionDTO(dataCollection))
            .ToList();

        return Ok(dataCollections);
    }

    [HttpPost]
    public IActionResult CreateTable(DataCollectionCreationDTO contract)
    {
        try
        {
            var dataCollections = _context.DataCollections.AsNoTracking().Include(d => d.Columns).ToList();

            var dataCollection = dataCollections.SingleOrDefault(d => d.Name == contract.Name);
            if (dataCollection is not null)
            {
                return BadRequest();
            }

            var baseTypes = _context.BaseTypes.AsNoTracking().ToList();
            var referencedDataCollections = new List<ReferenceDTO>();
            var createColumns = contract.Columns.Select(c =>
            {
                var baseType = baseTypes.First(b => b.Name == c.BaseTypeName);
                if (c.Reference is not null)
                {
                    referencedDataCollections.Add(c.Reference);
                }

                return new TableColumnInfo
                {
                    DbDataType = baseType.DbDataType,
                    Nullable = c.Nullable,
                    Name = c.Name,
                    DisplayName = c.DisplayName,
                    Unique = c.Unique,
                    AutoIncrement = c.AutoIncrement,
                };
            }).ToList();

            var referenceValid = referencedDataCollections.Count == 0 || referencedDataCollections.Any(rdf =>
            {
                var referencedDataCollection = dataCollections.FirstOrDefault(df => df.Name == rdf.DataCollection);
                return referencedDataCollection is not null && referencedDataCollection.Columns.Any(c => c.Name == rdf.Property);
            });
            if (!referenceValid)
            {
                return NotFound(new
                {
                    message = $"Some DataCollections not found."
                });
            }

            var createStatement = _sqlGenerator.GenerateCreateTableSql(contract.Name, createColumns);

            dataCollection = new DataCollection
            {
                Name = contract.Name,
                DisplayName = contract.DisplayName,
            };
            var columns = contract.Columns.Select(c => new DataCollectionColumn
            {
                DataCollection = dataCollection,
                BaseTypeName = baseTypes.First(b => b.Name == c.BaseTypeName).Name,
                Name = c.Name,
                DisplayName = c.DisplayName,
                Nullable = c.Nullable,
                Visible = c.Visible,
                Unique = c.Unique,
                AutoIncrement = c.AutoIncrement,
            }).ToList();
            _context.DataCollections.Add(dataCollection);
            _context.DataCollectionColumns.AddRange(columns);
            _context.SaveChanges();

            _context.Execute(createStatement);
            return Ok();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Transaction rolled back: {Message}", ex.Message);
            return StatusCode(500, ex);
        }
    }

    [HttpPatch]
    public IActionResult AlterTable([FromQuery] string dataCollectionName, [FromBody] DataCollectionUpdateDTO contract)
    {
        var result = new List<string>();
        try
        {
            var dataCollection = _context.DataCollections.AsNoTracking().Include(d => d.Columns).FirstOrDefault(d => d.Name == dataCollectionName);
            if (dataCollection is null)
            {
                return NotFound();
            }

            var baseTypes = _context.BaseTypes.AsNoTracking().ToList();

            foreach (var column in contract.Columns)
            {
                BaseType? baseType = null;
                if (!string.IsNullOrWhiteSpace(column.BaseTypeName))
                {
                    baseType = baseTypes.First(b => b.Name == column.BaseTypeName);
                }

                var alterStatement = _sqlGenerator.GenerateAlterTableSql(dataCollection.Name, column.Action, new TableColumnInfo
                {
                    Name = column.Name,
                    DbDataType = baseType?.DbDataType,
                    OldName = column.OldName,
                    Nullable = column.Nullable ?? true,
                    DisplayName = column.DisplayName,
                });
                _context.Execute(alterStatement);

                switch (column.Action)
                {
                    case ColumnAlterationType.Add:
                        {
                            if (baseType is null)
                            {
                                throw new Exception("BaseType must be defined for new columns.");
                            }

                            var newColumn = new DataCollectionColumn
                            {
                                Name = column.Name,
                                DisplayName = column.DisplayName,
                                Nullable = column.Nullable ?? true,
                                Visible = column.Visible ?? true,
                                BaseTypeName = baseType.Name,
                                Unique = column.Unique ?? false,
                                AutoIncrement = column.AutoIncrement ?? false,
                            };
                            dataCollection.Columns.Add(newColumn);
                            break;
                        }
                    case ColumnAlterationType.Rename:
                    case ColumnAlterationType.ChangeType:
                        {
                            var oldColumn = dataCollection.Columns.FirstOrDefault(c => c.Name == (column.OldName ?? column.Name) && c.DataCollectionName == dataCollection.Name)!;
                            // Define when something is null or not (e.g Name vs OldName)
                            oldColumn.DisplayName = column.DisplayName ?? oldColumn.DisplayName;
                            oldColumn.Name = column.Name;
                            if (baseType is not null)
                            {
                                oldColumn.BaseTypeName = baseType.Name;
                            }
                            if (column.Visible.HasValue)
                            {
                                oldColumn.Visible = column.Visible.Value;
                            }
                            if (column.Nullable.HasValue && column.Nullable.Value)
                            {
                                // Nullability can only be set to true, not removed (because existing data wouldn't have any value)
                                oldColumn.Nullable = column.Nullable.Value;
                            }

                            // Uniqueness can NOT be changed - because existing data would potentially collide
                            // AutoIncrement can NOT be changed - because existing data would potentially collide

                            _context.Update(oldColumn);
                            break;
                        }
                    case ColumnAlterationType.Drop:
                        {
                            var oldColumn = dataCollection.Columns.FirstOrDefault(c => c.Name == (column.OldName ?? column.Name) && c.DataCollectionName == dataCollection.Name)!;

                            // Remove link with DataCollection
                            dataCollection.Columns.Remove(oldColumn);

                            // Remove Column altogether
                            _context.DataCollectionColumns.Remove(oldColumn);
                            break;
                        }
                }

                result.Add(alterStatement);
            }

            dataCollection.DisplayName = contract.DisplayName ?? dataCollection.DisplayName;
            _context.Update(dataCollection);
            _context.SaveChanges();

            return Ok();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Transaction rolled back: {Message}", ex.Message);
            return StatusCode(500, ex);
        }
    }
}