using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Dynamo.CMS.API.Models;

[Table("dynamo_single_types")]
public class SingleType : IEntity<int>
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("id")]
    public int Id { get; set; }

    [Column("name")]
    [MaxLength(255)]
    public required string Name { get; set; }

    [Column("description")]
    public string? Description { get; set; }

    [Column("api_id")]
    [MaxLength(255)]
    public required string ApiId { get; set; }

    [Column("is_published")]
    public bool IsPublished { get; set; } = false;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [Column("created_by")]
    public long? CreatedBy { get; set; }

    [Column("updated_by")]
    public long? UpdatedBy { get; set; }

    [Column("plugin")]
    [MaxLength(100)]
    public string? Plugin { get; set; }

    public virtual List<SingleTypeField> Fields { get; set; } = [];
}

[Table("dynamo_single_type_fields")]
public class SingleTypeField : IEntity<int>
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("id")]
    public int Id { get; set; }

    [Column("single_type_id")]
    public int SingleTypeId { get; set; }
    public virtual SingleType SingleType { get; set; } = null!;

    [Column("name")]
    [MaxLength(255)]
    public required string Name { get; set; }

    [Column("api_id")]
    [MaxLength(255)]
    public required string ApiId { get; set; }

    [Column("type")]
    [MaxLength(50)]
    public required string Type { get; set; }

    [Column("required")]
    public bool Required { get; set; } = false;

    [Column("unique_constraint")]
    public bool Unique { get; set; } = false;

    [Column("default_value")]
    public string? DefaultValue { get; set; }

    [Column("validation_regex")]
    public string? ValidationRegex { get; set; }

    [Column("max_length")]
    public int? MaxLength { get; set; }

    [Column("min_length")]
    public int? MinLength { get; set; }

    [Column("max_value")]
    public int? MaxValue { get; set; }

    [Column("min_value")]
    public int? MinValue { get; set; }

    [Column("precision")]
    public int? Precision { get; set; }

    [Column("scale")]
    public int? Scale { get; set; }

    [Column("related_collection_id")]
    public int? RelatedCollectionId { get; set; }

    [Column("related_collection_name")]
    [MaxLength(255)]
    public string? RelatedCollectionName { get; set; }

    [Column("relation_type")]
    public RelationType? RelationType { get; set; }

    [Column("placeholder")]
    [MaxLength(500)]
    public string? Placeholder { get; set; }

    [Column("description")]
    public string? Description { get; set; }

    [Column("hidden")]
    public bool Hidden { get; set; } = false;

    [Column("display_order")]
    public int DisplayOrder { get; set; } = 0;

    [Column("custom_properties")]
    public string? CustomProperties { get; set; }

    public virtual List<FieldOption>? Options { get; set; }
}

public enum RelationType
{
    OneToOne,
    OneToMany,
    ManyToOne,
    ManyToMany
}

[Table("dynamo_field_options")]
public class FieldOption : IEntity<int>
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("id")]
    public int Id { get; set; }

    [Column("field_id")]
    public int FieldId { get; set; }

    [Column("label")]
    [MaxLength(255)]
    public required string Label { get; set; }

    [Column("value")]
    [MaxLength(255)]
    public required string Value { get; set; }

    [Column("display_order")]
    public int DisplayOrder { get; set; } = 0;
}
