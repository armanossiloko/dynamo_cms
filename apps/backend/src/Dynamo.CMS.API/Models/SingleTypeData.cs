using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;

namespace Dynamo.CMS.API.Models;

/// <summary>
/// Stores the actual data for a single type.
/// Since single types have only one entry per type,
/// this table has a 1:1 relationship with SingleType per locale.
/// </summary>
[Table("dynamo_single_type_data")]
public class SingleTypeData : IEntity<int>
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("id")]
    public int Id { get; set; }

    [Column("single_type_id")]
    public int SingleTypeId { get; set; }
    public virtual SingleType SingleType { get; set; } = null!;

    /// <summary>
    /// Enforce single row per SingleType at database level
    /// </summary>
    [Column("singleton_key")]
    public int SingletonKey { get; set; } = 1;

    /// <summary>
    /// Actual data stored as JSONB
    /// </summary>
    [Column("data")]
    public JsonDocument Data { get; set; } = null!;

    [Column("status")]
    public ContentStatus Status { get; set; } = ContentStatus.Draft;

    [Column("version")]
    public int Version { get; set; } = 1;

    [Column("published_at")]
    public DateTime? PublishedAt { get; set; }

    [Column("locale")]
    [MaxLength(10)]
    public string Locale { get; set; } = "en";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [Column("created_by")]
    public long? CreatedBy { get; set; }

    [Column("updated_by")]
    public long? UpdatedBy { get; set; }
}
