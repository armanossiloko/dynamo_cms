namespace Dynamo.CMS.API.Models;

public enum ApiKeyScope
{
    ReadOnly,
    Write,
    Full
}

public class ApiKey : IEntity<int>
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string KeyHash { get; set; }
    public ApiKeyScope Scope { get; set; } = ApiKeyScope.ReadOnly;
    public List<string>? AllowedCollections { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastUsedAt { get; set; }
    public string? CreatedBy { get; set; }
    
    public long UserId { get; set; }
    public User? User { get; set; }
}