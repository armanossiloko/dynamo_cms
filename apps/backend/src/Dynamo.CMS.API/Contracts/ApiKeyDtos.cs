namespace Dynamo.CMS.API.Contracts;

public class ApiKeyListItemDto
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string Scope { get; set; }
    public List<string>? AllowedCollections { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? LastUsedAt { get; set; }
}

public class ApiKeyDto : ApiKeyListItemDto
{
    public string? PlainKey { get; set; } // Only populated on create
}

public class CreateApiKeyDto
{
    public required string Name { get; set; }
    public string? Scope { get; set; } = "ReadOnly";
    public List<string>? AllowedCollections { get; set; }
    public DateTime? ExpiresAt { get; set; }
}

public class UpdateApiKeyDto
{
    public string? Name { get; set; }
    public string? Scope { get; set; }
    public List<string>? AllowedCollections { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public bool? IsActive { get; set; }
}

public class ApiKeyValidateDto
{
    public required string Key { get; set; }
}

public class ApiKeyValidationResultDto
{
    public bool IsValid { get; set; }
    public string? Error { get; set; }
    public string? Scope { get; set; }
    public List<string>? AllowedCollections { get; set; }
}