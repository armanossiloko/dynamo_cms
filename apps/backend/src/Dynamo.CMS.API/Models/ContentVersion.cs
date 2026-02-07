namespace Dynamo.CMS.API.Models;

public class ContentVersion : IEntity<int>
{
    public int Id { get; set; }
    public required string CollectionName { get; set; }
    public int EntryId { get; set; }
    public int VersionNumber { get; set; }
    public Dictionary<string, object> Data { get; set; } = [];
    public string? ChangeSummary { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public string? CreatedByName { get; set; }
    public bool IsCurrent { get; set; }
    public bool IsDeleted { get; set; }
}
