using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace Dynamo.CMS.API.Models;

[Table("collections")]
public class DataCollection
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.None)]
    [Column("name")]
    public required string Name { get; set; }

    [Column("display_name")]
    public required string DisplayName { get; set; }

    public virtual List<DataCollectionColumn> Columns { get; set; } = [];
}
