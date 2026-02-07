namespace Dynamo.CMS.API.Models;

public class ComponentDefinition : IEntity<int>
{
    public int Id { get; set; }
    
    public required string Name { get; set; }
    
    public required string DisplayName { get; set; }
    
    public string? Description { get; set; }
    
    public string Category { get; set; } = "Content";
    
    public string? Icon { get; set; }
    
    public required Dictionary<string, object> Schema { get; set; }
    
    public Dictionary<string, object>? DefaultData { get; set; }
    
    public Dictionary<string, object>? ValidationRules { get; set; }
    
    public bool IsSystem { get; set; }
    
    public bool IsActive { get; set; } = true;
    
    public bool AllowMultiple { get; set; } = true;
    
    public int? MaxInstances { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    public string? CreatedBy { get; set; }
}
