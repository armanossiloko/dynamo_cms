using Dynamo.CMS.API.Data;
using Dynamo.CMS.API.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using System.Text.Json;

namespace Dynamo.CMS.API.Services;

public interface IDynamicSwaggerService
{
    Task<OpenApiDocument> GenerateCollectionOpenApiAsync(string collectionName);
    Task<IEnumerable<string>> GetAvailableCollectionsAsync();
    Task<OpenApiDocument> GenerateAllCollectionsOpenApiAsync();
}

public class DynamicSwaggerService : IDynamicSwaggerService
{
    private readonly AppDbContext _context;
    private readonly ILogger<DynamicSwaggerService> _logger;

    public DynamicSwaggerService(AppDbContext context, ILogger<DynamicSwaggerService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<IEnumerable<string>> GetAvailableCollectionsAsync()
    {
        return await _context.DataCollections
            .AsNoTracking()
            .Select(dc => dc.Name)
            .ToListAsync();
    }

    public async Task<OpenApiDocument> GenerateCollectionOpenApiAsync(string collectionName)
    {
        var dataCollection = await _context.DataCollections
            .AsNoTracking()
            .Include(d => d.Columns)
            .FirstOrDefaultAsync(d => d.Name == collectionName);

        if (dataCollection == null)
        {
            throw new ArgumentException($"Collection '{collectionName}' not found.");
        }

        var document = new OpenApiDocument
        {
            Info = new OpenApiInfo
            {
                Title = $"{dataCollection.DisplayName} API",
                Version = "1.0.0",
                Description = $"API for {dataCollection.DisplayName} collection"
            },
            Servers = new List<OpenApiServer>
            {
                new OpenApiServer { Url = "/" }
            },
            Paths = new OpenApiPaths(),
            Components = new OpenApiComponents
            {
                Schemas = new Dictionary<string, OpenApiSchema>(),
                SecuritySchemes = new Dictionary<string, OpenApiSecurityScheme>
                {
                    ["Bearer"] = new OpenApiSecurityScheme
                    {
                        Type = SecuritySchemeType.Http,
                        Scheme = "bearer",
                        BearerFormat = "JWT",
                        Description = "JWT Authorization header using the Bearer scheme"
                    }
                }
            },
            SecurityRequirements = new List<OpenApiSecurityRequirement>
            {
                new OpenApiSecurityRequirement
                {
                    [new OpenApiSecurityScheme
                    {
                        Reference = new OpenApiReference
                        {
                            Type = ReferenceType.SecurityScheme,
                            Id = "Bearer"
                        }
                    }] = new List<string>()
                }
            }
        };

        // Generate schemas for the collection
        GenerateSchemas(document, dataCollection);

        // Generate paths for CRUD operations
        GeneratePaths(document, dataCollection);

        return document;
    }

    public async Task<OpenApiDocument> GenerateAllCollectionsOpenApiAsync()
    {
        var collections = await _context.DataCollections
            .AsNoTracking()
            .Include(d => d.Columns)
            .ToListAsync();

        var document = new OpenApiDocument
        {
            Info = new OpenApiInfo
            {
                Title = "Dynamo CMS Collections API",
                Version = "1.0.0",
                Description = "API for all Dynamo CMS collections"
            },
            Servers = new List<OpenApiServer>
            {
                new OpenApiServer { Url = "/" }
            },
            Paths = new OpenApiPaths(),
            Components = new OpenApiComponents
            {
                Schemas = new Dictionary<string, OpenApiSchema>(),
                SecuritySchemes = new Dictionary<string, OpenApiSecurityScheme>
                {
                    ["Bearer"] = new OpenApiSecurityScheme
                    {
                        Type = SecuritySchemeType.Http,
                        Scheme = "bearer",
                        BearerFormat = "JWT",
                        Description = "JWT Authorization header using the Bearer scheme"
                    }
                }
            },
            SecurityRequirements = new List<OpenApiSecurityRequirement>
            {
                new OpenApiSecurityRequirement
                {
                    [new OpenApiSecurityScheme
                    {
                        Reference = new OpenApiReference
                        {
                            Type = ReferenceType.SecurityScheme,
                            Id = "Bearer"
                        }
                    }] = new List<string>()
                }
            }
        };

        // Generate schemas and paths for all collections
        foreach (var collection in collections)
        {
            GenerateSchemas(document, collection);
            GeneratePaths(document, collection);
        }

        return document;
    }

    private void GenerateSchemas(OpenApiDocument document, DataCollection collection)
    {
        var schemaName = $"{collection.Name}Item";
        var createSchemaName = $"Create{collection.Name}";
        var updateSchemaName = $"Update{collection.Name}";

        // Main item schema
        var itemSchema = new OpenApiSchema
        {
            Type = "object",
            Properties = new Dictionary<string, OpenApiSchema>()
        };

        // Create schema (for POST requests)
        var createSchema = new OpenApiSchema
        {
            Type = "object",
            Properties = new Dictionary<string, OpenApiSchema>(),
            Required = new HashSet<string>()
        };

        // Update schema (for PUT requests)
        var updateSchema = new OpenApiSchema
        {
            Type = "object",
            Properties = new Dictionary<string, OpenApiSchema>()
        };

        foreach (var column in collection.Columns.Where(c => c.Visible))
        {
            var columnSchema = GetColumnSchema(column);
            var columnName = column.Name;

            // Add to main item schema
            itemSchema.Properties[columnName] = columnSchema;

            // Add to create schema (excluding auto-increment fields)
            if (!column.AutoIncrement)
            {
                createSchema.Properties[columnName] = columnSchema;
                if (!column.Nullable)
                {
                    createSchema.Required.Add(columnName);
                }
            }

            // Add to update schema (all fields optional for updates)
            updateSchema.Properties[columnName] = columnSchema;
        }

        // Add ID field to main schema
        var primaryKeyColumn = collection.Columns.FirstOrDefault(c => c.AutoIncrement) ?? 
                               collection.Columns.FirstOrDefault(c => c.Unique);
        if (primaryKeyColumn != null)
        {
            itemSchema.Properties["id"] = new OpenApiSchema
            {
                Type = "string",
                Description = "Primary key identifier"
            };
        }

        // Response schema for paginated results
        var responseSchema = new OpenApiSchema
        {
            Type = "object",
            Properties = new Dictionary<string, OpenApiSchema>
            {
                ["data"] = new OpenApiSchema
                {
                    Type = "array",
                    Items = new OpenApiSchema
                    {
                        Reference = new OpenApiReference
                        {
                            Type = ReferenceType.Schema,
                            Id = schemaName
                        }
                    }
                },
                ["totalCount"] = new OpenApiSchema { Type = "integer" },
                ["page"] = new OpenApiSchema { Type = "integer" },
                ["pageSize"] = new OpenApiSchema { Type = "integer" },
                ["totalPages"] = new OpenApiSchema { Type = "integer" }
            }
        };

        document.Components.Schemas[schemaName] = itemSchema;
        document.Components.Schemas[createSchemaName] = createSchema;
        document.Components.Schemas[updateSchemaName] = updateSchema;
        document.Components.Schemas[$"{collection.Name}Response"] = responseSchema;
    }

    private void GeneratePaths(OpenApiDocument document, DataCollection collection)
    {
        var collectionName = collection.Name;
        var basePath = $"/api/data/{collectionName}";

        // GET /api/data/{collectionName} - List items
        var listOperation = new OpenApiOperation
        {
            Summary = $"Get all {collection.DisplayName}",
            Description = $"Retrieve a paginated list of {collection.DisplayName.ToLower()}",
            Tags = new List<OpenApiTag> { new OpenApiTag { Name = collection.DisplayName } },
            Parameters = new List<OpenApiParameter>
            {
                new OpenApiParameter
                {
                    Name = "page",
                    In = ParameterLocation.Query,
                    Schema = new OpenApiSchema { Type = "integer", Default = new Microsoft.OpenApi.Any.OpenApiInteger(1) },
                    Description = "Page number"
                },
                new OpenApiParameter
                {
                    Name = "count",
                    In = ParameterLocation.Query,
                    Schema = new OpenApiSchema { Type = "integer", Default = new Microsoft.OpenApi.Any.OpenApiInteger(50) },
                    Description = "Number of items per page"
                },
                new OpenApiParameter
                {
                    Name = "orderBy",
                    In = ParameterLocation.Query,
                    Schema = new OpenApiSchema { Type = "string" },
                    Description = "Field to order by"
                },
                new OpenApiParameter
                {
                    Name = "orderByDesc",
                    In = ParameterLocation.Query,
                    Schema = new OpenApiSchema { Type = "boolean" },
                    Description = "Order in descending order"
                }
            },
            Responses = new OpenApiResponses
            {
                ["200"] = new OpenApiResponse
                {
                    Description = "Successful response",
                    Content = new Dictionary<string, OpenApiMediaType>
                    {
                        ["application/json"] = new OpenApiMediaType
                        {
                            Schema = new OpenApiSchema
                            {
                                Reference = new OpenApiReference
                                {
                                    Type = ReferenceType.Schema,
                                    Id = $"{collectionName}Response"
                                }
                            }
                        }
                    }
                }
            }
        };

        // POST /api/data/{collectionName} - Create item
        var createOperation = new OpenApiOperation
        {
            Summary = $"Create new {collection.DisplayName}",
            Description = $"Create a new {collection.DisplayName.ToLower()}",
            Tags = new List<OpenApiTag> { new OpenApiTag { Name = collection.DisplayName } },
            RequestBody = new OpenApiRequestBody
            {
                Required = true,
                Content = new Dictionary<string, OpenApiMediaType>
                {
                    ["application/json"] = new OpenApiMediaType
                    {
                        Schema = new OpenApiSchema
                        {
                            Reference = new OpenApiReference
                            {
                                Type = ReferenceType.Schema,
                                Id = $"Create{collectionName}"
                            }
                        }
                    }
                }
            },
            Responses = new OpenApiResponses
            {
                ["201"] = new OpenApiResponse
                {
                    Description = "Created successfully"
                }
            }
        };

        // GET /api/data/{collectionName}/{id} - Get single item
        var getByIdOperation = new OpenApiOperation
        {
            Summary = $"Get {collection.DisplayName} by ID",
            Description = $"Retrieve a specific {collection.DisplayName.ToLower()} by its ID",
            Tags = new List<OpenApiTag> { new OpenApiTag { Name = collection.DisplayName } },
            Parameters = new List<OpenApiParameter>
            {
                new OpenApiParameter
                {
                    Name = "id",
                    In = ParameterLocation.Path,
                    Required = true,
                    Schema = new OpenApiSchema { Type = "string" },
                    Description = "Item identifier"
                }
            },
            Responses = new OpenApiResponses
            {
                ["200"] = new OpenApiResponse
                {
                    Description = "Successful response",
                    Content = new Dictionary<string, OpenApiMediaType>
                    {
                        ["application/json"] = new OpenApiMediaType
                        {
                            Schema = new OpenApiSchema
                            {
                                Reference = new OpenApiReference
                                {
                                    Type = ReferenceType.Schema,
                                    Id = $"{collectionName}Item"
                                }
                            }
                        }
                    }
                }
            }
        };

        // PUT /api/data/{collectionName}/{id} - Update item
        var updateOperation = new OpenApiOperation
        {
            Summary = $"Update {collection.DisplayName}",
            Description = $"Update an existing {collection.DisplayName.ToLower()}",
            Tags = new List<OpenApiTag> { new OpenApiTag { Name = collection.DisplayName } },
            Parameters = new List<OpenApiParameter>
            {
                new OpenApiParameter
                {
                    Name = "id",
                    In = ParameterLocation.Path,
                    Required = true,
                    Schema = new OpenApiSchema { Type = "string" },
                    Description = "Item identifier"
                }
            },
            RequestBody = new OpenApiRequestBody
            {
                Required = true,
                Content = new Dictionary<string, OpenApiMediaType>
                {
                    ["application/json"] = new OpenApiMediaType
                    {
                        Schema = new OpenApiSchema
                        {
                            Reference = new OpenApiReference
                            {
                                Type = ReferenceType.Schema,
                                Id = $"Update{collectionName}"
                            }
                        }
                    }
                }
            },
            Responses = new OpenApiResponses
            {
                ["200"] = new OpenApiResponse
                {
                    Description = "Updated successfully"
                }
            }
        };

        // DELETE /api/data/{collectionName}/{id} - Delete item
        var deleteOperation = new OpenApiOperation
        {
            Summary = $"Delete {collection.DisplayName}",
            Description = $"Delete a {collection.DisplayName.ToLower()}",
            Tags = new List<OpenApiTag> { new OpenApiTag { Name = collection.DisplayName } },
            Parameters = new List<OpenApiParameter>
            {
                new OpenApiParameter
                {
                    Name = "id",
                    In = ParameterLocation.Path,
                    Required = true,
                    Schema = new OpenApiSchema { Type = "string" },
                    Description = "Item identifier"
                }
            },
            Responses = new OpenApiResponses
            {
                ["200"] = new OpenApiResponse
                {
                    Description = "Deleted successfully"
                }
            }
        };

        // POST /api/data/{collectionName}/bulk - Bulk insert
        var bulkCreateOperation = new OpenApiOperation
        {
            Summary = $"Bulk create {collection.DisplayName}",
            Description = $"Create multiple {collection.DisplayName.ToLower()} at once",
            Tags = new List<OpenApiTag> { new OpenApiTag { Name = collection.DisplayName } },
            RequestBody = new OpenApiRequestBody
            {
                Required = true,
                Content = new Dictionary<string, OpenApiMediaType>
                {
                    ["application/json"] = new OpenApiMediaType
                    {
                        Schema = new OpenApiSchema
                        {
                            Type = "object",
                            Properties = new Dictionary<string, OpenApiSchema>
                            {
                                ["data"] = new OpenApiSchema
                                {
                                    Type = "array",
                                    Items = new OpenApiSchema
                                    {
                                        Reference = new OpenApiReference
                                        {
                                            Type = ReferenceType.Schema,
                                            Id = $"Create{collectionName}"
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            Responses = new OpenApiResponses
            {
                ["201"] = new OpenApiResponse
                {
                    Description = "Bulk created successfully"
                }
            }
        };

        // Add paths to document
        document.Paths[basePath] = new OpenApiPathItem
        {
            Operations = new Dictionary<OperationType, OpenApiOperation>
            {
                [OperationType.Get] = listOperation,
                [OperationType.Post] = createOperation
            }
        };

        document.Paths[$"{basePath}/{{id}}"] = new OpenApiPathItem
        {
            Operations = new Dictionary<OperationType, OpenApiOperation>
            {
                [OperationType.Get] = getByIdOperation,
                [OperationType.Put] = updateOperation,
                [OperationType.Delete] = deleteOperation
            }
        };

        document.Paths[$"{basePath}/bulk"] = new OpenApiPathItem
        {
            Operations = new Dictionary<OperationType, OpenApiOperation>
            {
                [OperationType.Post] = bulkCreateOperation
            }
        };
    }

    private OpenApiSchema GetColumnSchema(DataCollectionColumn column)
    {
        var schema = new OpenApiSchema();

        switch (column.BaseTypeName.ToLower())
        {
            case "string":
            case "text":
                schema.Type = "string";
                break;
            case "integer":
                schema.Type = "integer";
                break;
            case "decimal":
            case "float":
            case "double":
                schema.Type = "number";
                break;
            case "boolean":
                schema.Type = "boolean";
                break;
            case "datetime":
                schema.Type = "string";
                schema.Format = "date-time";
                break;
            case "date":
                schema.Type = "string";
                schema.Format = "date";
                break;
            case "json":
                schema.Type = "object";
                break;
            default:
                schema.Type = "string";
                break;
        }

        if (column.Nullable)
        {
            schema.Nullable = true;
        }

        return schema;
    }
}