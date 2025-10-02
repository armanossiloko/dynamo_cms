using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace Dynamo.CMS.API.Models;

/// <summary>
///     Represents a link between the application (C#) data type and the database (e.g PostgreSQL) data type.
///     <para>
///         The PostgreSQL equivalent of the C# type <see cref="string"/> can be <see langword="varchar"/> or <see langword="text"/>, so 
///         <see cref="DbDataType"/> would be equal to `text`, while <see cref="DataType"/> would be equal to "string".
///     </para>
/// </summary>
[Table("base_types")]
public class BaseType
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.None)]
    [Column("name")]
    public required string Name { get; set; }

    [Column("display_name")]
    public string? DisplayName { get; set; }

    [Column("description")]
    public string? Description { get; set; }

    /// <summary>
    /// Represents the name of this type inside the configured database.
    /// </summary>
    [Column("db_data_type")]
    public required string DbDataType { get; set; }

    /// <summary>
    /// Represents the name of this type inside the C# application / API.
    /// </summary>
    [Column("data_type")]
    public required string DataType { get; set; }
}
