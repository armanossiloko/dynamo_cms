using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace Dynamo.CMS.API.Models;

[Table("dynamo_data_collection_columns")]
public class DataCollectionColumn : IEntity<long>
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("id")]
    public long Id { get; set; }

    [Column("name")]
    public required string Name { get; set; }

    [Column("display_name")]
    public string? DisplayName { get; set; }

    [Column("nullable")]
    public required bool Nullable { get; set; }

    [Column("visible")]
    public required bool Visible { get; set; }

    [Column("unique")]
    public required bool Unique { get; set; }

    [Column("auto_increment")]
    public required bool AutoIncrement { get; set; }

    [Column("data_collection_name")]
    public string DataCollectionName { get; set; } = null!;
    public virtual DataCollection? DataCollection { get; set; }

    [Column("base_type")]
    public string BaseTypeName { get; set; } = null!;
    public virtual BaseType? BaseType { get; set; }
}
