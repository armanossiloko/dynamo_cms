namespace Dynamo.CMS.API.Models;

public class MediaFolder : IEntity<int>
{
    public int Id { get; set; }
    
    public required string Name { get; set; }
    
    public int? ParentId { get; set; }
    
    public virtual MediaFolder? Parent { get; set; }
    
    public virtual ICollection<MediaFolder> Children { get; set; } = [];
    
    public required string Path { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    public string? CreatedBy { get; set; }
    
    public virtual ICollection<UploadedFileEntity> Files { get; set; } = [];
}
