using System.Text.Json;
using Dynamo.CMS.API.Contracts;
using Dynamo.CMS.API.Data;
using Dynamo.CMS.API.Models;
using Microsoft.EntityFrameworkCore;
using KeyNotFoundException = System.Collections.Generic.KeyNotFoundException;

namespace Dynamo.CMS.API.Services;

public interface ISingleTypeService
{
    // CRUD for single type definitions
    Task<SingleTypeDto> CreateAsync(CreateSingleTypeRequest request);
    Task<SingleTypeDto?> GetByIdAsync(int id);
    Task<SingleTypeDto?> GetByApiIdAsync(string apiId);
    Task<IEnumerable<SingleTypeListItemDto>> GetAllAsync();
    Task<SingleTypeDto> UpdateAsync(int id, UpdateSingleTypeRequest request);
    Task DeleteAsync(int id);
    Task<SingleTypeFieldDto> AddFieldAsync(int singleTypeId, CreateFieldRequest request);
    Task<SingleTypeFieldDto> UpdateFieldAsync(int singleTypeId, int fieldId, UpdateFieldRequest request);
    Task DeleteFieldAsync(int singleTypeId, int fieldId);

    // Data operations
    Task<SingleTypeDataResponse> GetDataAsync(string apiId, string locale = "en");
    Task<SingleTypeDataResponse> UpdateDataAsync(string apiId, JsonElement data, string locale = "en");
    Task PublishAsync(string apiId, string locale = "en");
    Task UnpublishAsync(string apiId, string locale = "en");
    Task<SingleTypeDataResponse?> GetPublishedDataAsync(string apiId, string locale = "en");
}

public class SingleTypeService : ISingleTypeService
{
    private readonly AppDbContext _db;

    public SingleTypeService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<SingleTypeDto> CreateAsync(CreateSingleTypeRequest request)
    {
        var singleType = new SingleType
        {
            Name = request.Name,
            ApiId = request.ApiId.ToLowerInvariant(),
            Description = request.Description,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.SingleTypes.Add(singleType);
        await _db.SaveChangesAsync();

        // Add fields
        if (request.Fields.Any())
        {
            foreach (var fieldRequest in request.Fields)
            {
                var field = MapToField(fieldRequest, singleType.Id);
                _db.SingleTypeFields.Add(field);

                // Add options if present
                if (fieldRequest.Options != null && fieldRequest.Options.Any())
                {
                    await _db.SaveChangesAsync(); // Save field first to get ID
                    foreach (var option in fieldRequest.Options)
                    {
                        _db.FieldOptions.Add(new FieldOption
                        {
                            FieldId = field.Id,
                            Label = option.Label,
                            Value = option.Value,
                            DisplayOrder = option.DisplayOrder
                        });
                    }
                }
            }
            await _db.SaveChangesAsync();
        }

        return await GetByIdAsync(singleType.Id) ?? throw new InvalidOperationException("Failed to retrieve created single type");
    }

    public async Task<SingleTypeDto?> GetByIdAsync(int id)
    {
        var singleType = await _db.SingleTypes
            .Include(st => st.Fields)
            .FirstOrDefaultAsync(st => st.Id == id);

        if (singleType == null) return null;

        var fields = await _db.SingleTypeFields
            .Where(f => f.SingleTypeId == id)
            .OrderBy(f => f.DisplayOrder)
            .ToListAsync();

        var fieldDtos = new List<SingleTypeFieldDto>();
        foreach (var field in fields)
        {
            var options = await _db.FieldOptions
                .Where(o => o.FieldId == field.Id)
                .OrderBy(o => o.DisplayOrder)
                .Select(o => new FieldOptionDto
                {
                    Label = o.Label,
                    Value = o.Value,
                    DisplayOrder = o.DisplayOrder
                })
                .ToListAsync();

            fieldDtos.Add(MapToFieldDto(field, options));
        }

        return new SingleTypeDto
        {
            Id = singleType.Id,
            Name = singleType.Name,
            ApiId = singleType.ApiId,
            Description = singleType.Description,
            IsPublished = singleType.IsPublished,
            CreatedAt = singleType.CreatedAt,
            UpdatedAt = singleType.UpdatedAt,
            Fields = fieldDtos
        };
    }

    public async Task<SingleTypeDto?> GetByApiIdAsync(string apiId)
    {
        var singleType = await _db.SingleTypes
            .FirstOrDefaultAsync(st => st.ApiId == apiId.ToLowerInvariant());

        return singleType == null ? null : await GetByIdAsync(singleType.Id);
    }

    public async Task<IEnumerable<SingleTypeListItemDto>> GetAllAsync()
    {
        var singleTypes = await _db.SingleTypes
            .Include(st => st.Fields)
            .OrderBy(st => st.Name)
            .ToListAsync();

        return singleTypes.Select(st => new SingleTypeListItemDto
        {
            Id = st.Id,
            Name = st.Name,
            ApiId = st.ApiId,
            Description = st.Description,
            IsPublished = st.IsPublished,
            UpdatedAt = st.UpdatedAt,
            FieldCount = st.Fields.Count
        });
    }

    public async Task<SingleTypeDto> UpdateAsync(int id, UpdateSingleTypeRequest request)
    {
        var singleType = await _db.SingleTypes.FindAsync(id);
        if (singleType == null)
            throw new KeyNotFoundException($"Single type with ID {id} not found");

        if (request.Name != null) singleType.Name = request.Name;
        if (request.Description != null) singleType.Description = request.Description;
        singleType.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return await GetByIdAsync(id) ?? throw new InvalidOperationException("Failed to retrieve updated single type");
    }

    public async Task DeleteAsync(int id)
    {
        var singleType = await _db.SingleTypes.FindAsync(id);
        if (singleType == null)
            throw new KeyNotFoundException($"Single type with ID {id} not found");

        _db.SingleTypes.Remove(singleType);
        await _db.SaveChangesAsync();
    }

    public async Task<SingleTypeFieldDto> AddFieldAsync(int singleTypeId, CreateFieldRequest request)
    {
        var singleType = await _db.SingleTypes.FindAsync(singleTypeId);
        if (singleType == null)
            throw new KeyNotFoundException($"Single type with ID {singleTypeId} not found");

        var field = MapToField(request, singleTypeId);
        _db.SingleTypeFields.Add(field);
        await _db.SaveChangesAsync();

        // Add options if present
        if (request.Options != null && request.Options.Any())
        {
            foreach (var option in request.Options)
            {
                _db.FieldOptions.Add(new FieldOption
                {
                    FieldId = field.Id,
                    Label = option.Label,
                    Value = option.Value,
                    DisplayOrder = option.DisplayOrder
                });
            }
            await _db.SaveChangesAsync();
        }

        var options = await _db.FieldOptions
            .Where(o => o.FieldId == field.Id)
            .OrderBy(o => o.DisplayOrder)
            .Select(o => new FieldOptionDto
            {
                Label = o.Label,
                Value = o.Value,
                DisplayOrder = o.DisplayOrder
            })
            .ToListAsync();

        return MapToFieldDto(field, options);
    }

    public async Task<SingleTypeFieldDto> UpdateFieldAsync(int singleTypeId, int fieldId, UpdateFieldRequest request)
    {
        var field = await _db.SingleTypeFields
            .FirstOrDefaultAsync(f => f.Id == fieldId && f.SingleTypeId == singleTypeId);

        if (field == null)
            throw new KeyNotFoundException($"Field with ID {fieldId} not found in single type {singleTypeId}");

        if (request.Name != null) field.Name = request.Name;
        if (request.ApiId != null) field.ApiId = request.ApiId;
        if (request.Type != null) field.Type = request.Type;
        if (request.Required.HasValue) field.Required = request.Required.Value;
        if (request.Unique.HasValue) field.Unique = request.Unique.Value;
        if (request.MaxLength.HasValue) field.MaxLength = request.MaxLength;
        if (request.MinLength.HasValue) field.MinLength = request.MinLength;
        if (request.Placeholder != null) field.Placeholder = request.Placeholder;
        if (request.Description != null) field.Description = request.Description;
        if (request.DefaultValue != null) field.DefaultValue = request.DefaultValue;

        await _db.SaveChangesAsync();

        var options = await _db.FieldOptions
            .Where(o => o.FieldId == field.Id)
            .OrderBy(o => o.DisplayOrder)
            .Select(o => new FieldOptionDto
            {
                Label = o.Label,
                Value = o.Value,
                DisplayOrder = o.DisplayOrder
            })
            .ToListAsync();

        return MapToFieldDto(field, options);
    }

    public async Task DeleteFieldAsync(int singleTypeId, int fieldId)
    {
        var field = await _db.SingleTypeFields
            .FirstOrDefaultAsync(f => f.Id == fieldId && f.SingleTypeId == singleTypeId);

        if (field == null)
            throw new KeyNotFoundException($"Field with ID {fieldId} not found in single type {singleTypeId}");

        _db.SingleTypeFields.Remove(field);
        await _db.SaveChangesAsync();
    }

    public async Task<SingleTypeDataResponse> GetDataAsync(string apiId, string locale = "en")
    {
        var singleType = await _db.SingleTypes
            .Include(st => st.Fields)
            .FirstOrDefaultAsync(st => st.ApiId == apiId.ToLowerInvariant());

        if (singleType == null)
            throw new KeyNotFoundException($"Single type '{apiId}' not found");

        var data = await _db.SingleTypeData
            .FirstOrDefaultAsync(d => d.SingleTypeId == singleType.Id && d.Locale == locale);

        var fields = await _db.SingleTypeFields
            .Where(f => f.SingleTypeId == singleType.Id)
            .OrderBy(f => f.DisplayOrder)
            .ToListAsync();

        var fieldDtos = new List<SingleTypeFieldDto>();
        foreach (var field in fields)
        {
            var options = await _db.FieldOptions
                .Where(o => o.FieldId == field.Id)
                .OrderBy(o => o.DisplayOrder)
                .Select(o => new FieldOptionDto
                {
                    Label = o.Label,
                    Value = o.Value,
                    DisplayOrder = o.DisplayOrder
                })
                .ToListAsync();

            fieldDtos.Add(MapToFieldDto(field, options));
        }

        // If no data exists, return empty response with schema
        if (data == null)
        {
            return new SingleTypeDataResponse
            {
                SingleTypeId = singleType.Id,
                ApiId = singleType.ApiId,
                Name = singleType.Name,
                Fields = fieldDtos,
                Data = null,
                Status = ContentStatus.Draft,
                Version = 0,
                Locale = locale
            };
        }

        return new SingleTypeDataResponse
        {
            SingleTypeId = singleType.Id,
            ApiId = singleType.ApiId,
            Name = singleType.Name,
            Fields = fieldDtos,
            Data = data.Data,
            Status = data.Status,
            Version = data.Version,
            PublishedAt = data.PublishedAt,
            Locale = data.Locale,
            CreatedAt = data.CreatedAt,
            UpdatedAt = data.UpdatedAt
        };
    }

    public async Task<SingleTypeDataResponse> UpdateDataAsync(string apiId, JsonElement data, string locale = "en")
    {
        var singleType = await _db.SingleTypes
            .Include(st => st.Fields)
            .FirstOrDefaultAsync(st => st.ApiId == apiId.ToLowerInvariant());

        if (singleType == null)
            throw new KeyNotFoundException($"Single type '{apiId}' not found");

        // Upsert logic
        var existingData = await _db.SingleTypeData
            .FirstOrDefaultAsync(d => d.SingleTypeId == singleType.Id && d.Locale == locale);

        if (existingData == null)
        {
            existingData = new SingleTypeData
            {
                SingleTypeId = singleType.Id,
                Locale = locale,
                Data = JsonDocument.Parse(data.GetRawText()),
                Status = ContentStatus.Draft,
                Version = 1,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _db.SingleTypeData.Add(existingData);
        }
        else
        {
            existingData.Data = JsonDocument.Parse(data.GetRawText());
            existingData.UpdatedAt = DateTime.UtcNow;
            existingData.Version++;
            _db.SingleTypeData.Update(existingData);
        }

        await _db.SaveChangesAsync();

        return await GetDataAsync(apiId, locale);
    }

    public async Task PublishAsync(string apiId, string locale = "en")
    {
        var singleType = await _db.SingleTypes
            .FirstOrDefaultAsync(st => st.ApiId == apiId.ToLowerInvariant());

        if (singleType == null)
            throw new KeyNotFoundException($"Single type '{apiId}' not found");

        var data = await _db.SingleTypeData
            .FirstOrDefaultAsync(d => d.SingleTypeId == singleType.Id && d.Locale == locale);

        if (data == null)
            throw new InvalidOperationException($"No data found for single type '{apiId}' in locale '{locale}'");

        data.Status = ContentStatus.Published;
        data.PublishedAt = DateTime.UtcNow;
        data.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
    }

    public async Task UnpublishAsync(string apiId, string locale = "en")
    {
        var singleType = await _db.SingleTypes
            .FirstOrDefaultAsync(st => st.ApiId == apiId.ToLowerInvariant());

        if (singleType == null)
            throw new KeyNotFoundException($"Single type '{apiId}' not found");

        var data = await _db.SingleTypeData
            .FirstOrDefaultAsync(d => d.SingleTypeId == singleType.Id && d.Locale == locale);

        if (data == null)
            throw new InvalidOperationException($"No data found for single type '{apiId}' in locale '{locale}'");

        data.Status = ContentStatus.Draft;
        data.PublishedAt = null;
        data.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
    }

    public async Task<SingleTypeDataResponse?> GetPublishedDataAsync(string apiId, string locale = "en")
    {
        var singleType = await _db.SingleTypes
            .FirstOrDefaultAsync(st => st.ApiId == apiId.ToLowerInvariant());

        if (singleType == null) return null;

        var data = await _db.SingleTypeData
            .FirstOrDefaultAsync(d => d.SingleTypeId == singleType.Id && d.Locale == locale && d.Status == ContentStatus.Published);

        if (data == null) return null;

        var fields = await _db.SingleTypeFields
            .Where(f => f.SingleTypeId == singleType.Id)
            .OrderBy(f => f.DisplayOrder)
            .ToListAsync();

        var fieldDtos = new List<SingleTypeFieldDto>();
        foreach (var field in fields)
        {
            var options = await _db.FieldOptions
                .Where(o => o.FieldId == field.Id)
                .OrderBy(o => o.DisplayOrder)
                .Select(o => new FieldOptionDto
                {
                    Label = o.Label,
                    Value = o.Value,
                    DisplayOrder = o.DisplayOrder
                })
                .ToListAsync();

            fieldDtos.Add(MapToFieldDto(field, options));
        }

        return new SingleTypeDataResponse
        {
            SingleTypeId = singleType.Id,
            ApiId = singleType.ApiId,
            Name = singleType.Name,
            Fields = fieldDtos,
            Data = data.Data,
            Status = data.Status,
            Version = data.Version,
            PublishedAt = data.PublishedAt,
            Locale = data.Locale,
            CreatedAt = data.CreatedAt,
            UpdatedAt = data.UpdatedAt
        };
    }

    private static SingleTypeField MapToField(CreateFieldRequest request, int singleTypeId)
    {
        return new SingleTypeField
        {
            SingleTypeId = singleTypeId,
            Name = request.Name,
            ApiId = request.ApiId,
            Type = request.Type,
            Required = request.Required,
            Unique = request.Unique,
            MaxLength = request.MaxLength,
            MinLength = request.MinLength,
            MaxValue = request.MaxValue,
            MinValue = request.MinValue,
            Precision = request.Precision,
            Scale = request.Scale,
            Placeholder = request.Placeholder,
            Description = request.Description,
            DefaultValue = request.DefaultValue,
            ValidationRegex = request.ValidationRegex,
            RelatedCollectionId = request.RelatedCollectionId,
            RelatedCollectionName = request.RelatedCollectionName,
            RelationType = request.RelationType,
            DisplayOrder = request.DisplayOrder
        };
    }

    private static SingleTypeFieldDto MapToFieldDto(SingleTypeField field, List<FieldOptionDto> options)
    {
        return new SingleTypeFieldDto
        {
            Id = field.Id,
            Name = field.Name,
            ApiId = field.ApiId,
            Type = field.Type,
            Required = field.Required,
            Unique = field.Unique,
            MaxLength = field.MaxLength,
            MinLength = field.MinLength,
            MaxValue = field.MaxValue,
            MinValue = field.MinValue,
            Precision = field.Precision,
            Scale = field.Scale,
            Placeholder = field.Placeholder,
            Description = field.Description,
            DefaultValue = field.DefaultValue,
            ValidationRegex = field.ValidationRegex,
            RelatedCollectionName = field.RelatedCollectionName,
            RelationType = field.RelationType,
            Hidden = field.Hidden,
            DisplayOrder = field.DisplayOrder,
            Options = options.Any() ? options : null
        };
    }
}
