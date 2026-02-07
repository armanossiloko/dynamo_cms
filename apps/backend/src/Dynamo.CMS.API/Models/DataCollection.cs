using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace Dynamo.CMS.API.Models;

[Table("dynamo_collections")]
public class DataCollection
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.None)]
    [Column("name")]
    public required string Name { get; set; }

    [Column("display_name")]
    public required string DisplayName { get; set; }

    [Column("enable_i18n")]
    public bool EnableI18n { get; set; }

    [Column("available_locales")]
    public List<string> AvailableLocales { get; set; } = ["en"];

    [Column("default_locale")]
    public string DefaultLocale { get; set; } = "en";

    [Column("translatable_fields")]
    public List<string> TranslatableFields { get; set; } = [];

    public virtual List<DataCollectionColumn> Columns { get; set; } = [];
}
