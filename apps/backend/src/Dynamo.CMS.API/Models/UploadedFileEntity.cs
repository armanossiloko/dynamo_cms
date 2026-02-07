using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Dynamo.CMS.API.Models;

/// <summary>
/// Entity representing an uploaded file stored in the database.
/// Files are stored in the filesystem, and this entity tracks metadata and location.
/// </summary>
[Table("uploaded_files")]
public class UploadedFileEntity : IEntity<long>
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("id")]
    public long Id { get; set; }

    [Column("file_name")]
    [Required]
    [MaxLength(500)]
    public required string FileName { get; set; }

    [Column("original_file_name")]
    [MaxLength(500)]
    public string? OriginalFileName { get; set; }

    [Column("file_path")]
    [Required]
    [MaxLength(2000)]
    public required string FilePath { get; set; }

    [Column("content_type")]
    [MaxLength(255)]
    public string? ContentType { get; set; }

    [Column("file_size")]
    public long FileSize { get; set; }

    [Column("display_name")]
    [MaxLength(500)]
    public string? DisplayName { get; set; }

    [Column("description")]
    public string? Description { get; set; }

    [Column("collection_name")]
    [MaxLength(255)]
    public string? CollectionName { get; set; }

    [Column("record_id")]
    [MaxLength(255)]
    public string? RecordId { get; set; }

    [Column("column_name")]
    [MaxLength(255)]
    public string? ColumnName { get; set; }

    [Column("uploaded_at")]
    [Required]
    public DateTimeOffset UploadedAt { get; set; }

    [Column("uploaded_by")]
    public long? UploadedBy { get; set; }

    public virtual User? Uploader { get; set; }

    [Column("folder_id")]
    public int? FolderId { get; set; }

    public virtual MediaFolder? Folder { get; set; }

    [Column("metadata")]
    public Dictionary<string, object>? Metadata { get; set; }

    [Column("transformations")]
    public Dictionary<string, object>? Transformations { get; set; }

    [Column("focal_point_x")]
    public decimal? FocalPointX { get; set; }

    [Column("focal_point_y")]
    public decimal? FocalPointY { get; set; }

    [Column("tags")]
    public List<string>? Tags { get; set; }

    [Column("alt_text")]
    [MaxLength(500)]
    public string? AltText { get; set; }

    public virtual ICollection<MediaTransformation> CachedTransformations { get; set; } = [];
}

