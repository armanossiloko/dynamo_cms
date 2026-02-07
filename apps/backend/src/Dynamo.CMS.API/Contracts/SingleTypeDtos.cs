using System.Text.Json;
using Dynamo.CMS.API.Models;

namespace Dynamo.CMS.API.Contracts;

// Request DTOs
public record CreateSingleTypeRequest
{
    public required string Name { get; init; }
    public required string ApiId { get; init; }
    public string? Description { get; init; }
    public List<CreateFieldRequest> Fields { get; init; } = [];
}

public record UpdateSingleTypeRequest
{
    public string? Name { get; init; }
    public string? Description { get; init; }
    public List<CreateFieldRequest>? Fields { get; init; }
}

public record CreateFieldRequest
{
    public required string Name { get; init; }
    public required string ApiId { get; init; }
    public required string Type { get; init; }
    public bool Required { get; init; }
    public bool Unique { get; init; }
    public int? MaxLength { get; init; }
    public int? MinLength { get; init; }
    public int? MaxValue { get; init; }
    public int? MinValue { get; init; }
    public int? Precision { get; init; }
    public int? Scale { get; init; }
    public string? Placeholder { get; init; }
    public string? Description { get; init; }
    public string? DefaultValue { get; init; }
    public string? ValidationRegex { get; init; }
    public int? RelatedCollectionId { get; init; }
    public string? RelatedCollectionName { get; init; }
    public RelationType? RelationType { get; init; }
    public int DisplayOrder { get; init; }
    public List<FieldOptionDto>? Options { get; init; }
}

public record UpdateFieldRequest
{
    public string? Name { get; init; }
    public string? ApiId { get; init; }
    public string? Type { get; init; }
    public bool? Required { get; init; }
    public bool? Unique { get; init; }
    public int? MaxLength { get; init; }
    public int? MinLength { get; init; }
    public string? Placeholder { get; init; }
    public string? Description { get; init; }
    public string? DefaultValue { get; init; }
}

public record FieldOptionDto
{
    public required string Label { get; init; }
    public required string Value { get; init; }
    public int DisplayOrder { get; init; }
}

// Response DTOs
public record SingleTypeListItemDto
{
    public int Id { get; init; }
    public required string Name { get; init; }
    public required string ApiId { get; init; }
    public string? Description { get; init; }
    public bool IsPublished { get; init; }
    public DateTime UpdatedAt { get; init; }
    public int FieldCount { get; init; }
}

public record SingleTypeDto
{
    public int Id { get; init; }
    public required string Name { get; init; }
    public required string ApiId { get; init; }
    public string? Description { get; init; }
    public bool IsPublished { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
    public List<SingleTypeFieldDto> Fields { get; init; } = [];
}

public record SingleTypeFieldDto
{
    public int Id { get; init; }
    public required string Name { get; init; }
    public required string ApiId { get; init; }
    public required string Type { get; init; }
    public bool Required { get; init; }
    public bool Unique { get; init; }
    public int? MaxLength { get; init; }
    public int? MinLength { get; init; }
    public int? MaxValue { get; init; }
    public int? MinValue { get; init; }
    public int? Precision { get; init; }
    public int? Scale { get; init; }
    public string? Placeholder { get; init; }
    public string? Description { get; init; }
    public string? DefaultValue { get; init; }
    public string? ValidationRegex { get; init; }
    public string? RelatedCollectionName { get; init; }
    public RelationType? RelationType { get; init; }
    public bool Hidden { get; init; }
    public int DisplayOrder { get; init; }
    public List<FieldOptionDto>? Options { get; init; }
}

public record SingleTypeDataResponse
{
    public int SingleTypeId { get; init; }
    public required string ApiId { get; init; }
    public required string Name { get; init; }
    public List<SingleTypeFieldDto> Fields { get; init; } = [];
    public JsonDocument? Data { get; init; }
    public ContentStatus Status { get; init; }
    public int Version { get; init; }
    public DateTime? PublishedAt { get; init; }
    public string Locale { get; init; } = "en";
    public DateTime? CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
}

public record SingleTypePublicResponse
{
    public JsonDocument? Data { get; init; }
    public SingleTypeMetaDto Meta { get; init; } = new();
}

public record SingleTypeMetaDto
{
    public DateTime? PublishedAt { get; init; }
    public string Locale { get; init; } = "en";
    public string? Status { get; init; }
    public int? Version { get; init; }
}

public record ValidationResult
{
    public bool IsValid { get; init; }
    public List<ValidationError> Errors { get; init; } = [];
}

public record ValidationError
{
    public required string Field { get; init; }
    public required string Message { get; init; }
}
