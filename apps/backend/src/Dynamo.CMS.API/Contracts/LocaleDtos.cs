namespace Dynamo.CMS.API.Contracts;

public class LocaleDto
{
    public int Id { get; set; }
    public required string Code { get; set; }
    public required string Name { get; set; }
    public string? NativeName { get; set; }
    public bool IsDefault { get; set; }
    public bool IsActive { get; set; }
    public bool IsRtl { get; set; }
    public string? FlagEmoji { get; set; }
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateLocaleDto
{
    public required string Code { get; set; }
    public required string Name { get; set; }
    public string? NativeName { get; set; }
    public bool IsDefault { get; set; }
    public bool IsRtl { get; set; }
    public string? FlagEmoji { get; set; }
    public int SortOrder { get; set; }
}

public class UpdateLocaleDto
{
    public string? Name { get; set; }
    public string? NativeName { get; set; }
    public bool? IsDefault { get; set; }
    public bool? IsActive { get; set; }
    public bool? IsRtl { get; set; }
    public string? FlagEmoji { get; set; }
    public int? SortOrder { get; set; }
}

public class TranslationDto
{
    public int Id { get; set; }
    public required string CollectionName { get; set; }
    public int EntryId { get; set; }
    public required string LocaleCode { get; set; }
    public Dictionary<string, object> TranslatedFields { get; set; } = [];
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }
    public bool IsComplete { get; set; }
    public int CompletionPercentage { get; set; }
}

public class CreateTranslationDto
{
    public required string CollectionName { get; set; }
    public int EntryId { get; set; }
    public required string LocaleCode { get; set; }
    public Dictionary<string, object> TranslatedFields { get; set; } = [];
    public bool IsComplete { get; set; }
    public int CompletionPercentage { get; set; }
}

public class UpdateTranslationDto
{
    public Dictionary<string, object>? TranslatedFields { get; set; }
    public bool? IsComplete { get; set; }
    public int? CompletionPercentage { get; set; }
}

public class TranslationStatusDto
{
    public required string CollectionName { get; set; }
    public int EntryId { get; set; }
    public required string DefaultLocale { get; set; }
    public List<LocaleTranslationStatusDto> LocaleStatuses { get; set; } = [];
}

public class LocaleTranslationStatusDto
{
    public required string LocaleCode { get; set; }
    public bool Exists { get; set; }
    public bool IsComplete { get; set; }
    public int CompletionPercentage { get; set; }
    public DateTime? LastUpdated { get; set; }
}
