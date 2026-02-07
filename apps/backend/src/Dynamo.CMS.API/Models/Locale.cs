namespace Dynamo.CMS.API.Models;

public class Locale : IEntity<int>
{
    public int Id { get; set; }
    
    public required string Code { get; set; }
    
    public required string Name { get; set; }
    
    public string? NativeName { get; set; }
    
    public bool IsDefault { get; set; }
    
    public bool IsActive { get; set; } = true;
    
    public bool IsRtl { get; set; }
    
    public string? FlagEmoji { get; set; }
    
    public int SortOrder { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    public virtual ICollection<ContentTranslation> ContentTranslations { get; set; } = [];
}
