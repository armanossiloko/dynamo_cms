namespace Dynamo.CMS.API.Models;

public class MediaTransformation : IEntity<int>
{
    public int Id { get; set; }
    
    public long FileId { get; set; }
    
    public virtual UploadedFileEntity File { get; set; } = null!;
    
    public required string TransformationKey { get; set; }
    
    public required string FilePath { get; set; }
    
    public long? FileSize { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
