namespace Dynamo.CMS.API.Models;

public class ContentTranslation : IEntity<int>
{
    public int Id { get; set; }
    
    public required string CollectionName { get; set; }
    
    public int EntryId { get; set; }
    
    public required string LocaleCode { get; set; }
    
    public virtual Locale Locale { get; set; } = null!;
    
    public Dictionary<string, object> TranslatedFields { get; set; } = [];
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    public string? CreatedBy { get; set; }
    
    public string? UpdatedBy { get; set; }
    
    public bool IsComplete { get; set; }
    
    public int CompletionPercentage { get; set; }
}
