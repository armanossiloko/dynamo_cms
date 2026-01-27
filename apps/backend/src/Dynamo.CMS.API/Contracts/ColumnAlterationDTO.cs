namespace Dynamo.CMS.API.Contracts;

public class ColumnAlterationDTO
{
    public string? OldName { get; set; }
    public required string Name { get; set; }
    public string? DisplayName { get; set; }
    public string? BaseTypeName { get; set; }
    public ColumnAlterationType Action { get; set; }
    public bool? Nullable { get; set; }
    public bool? Visible { get; set; }
    public bool? Unique { get; set; }
    public bool? AutoIncrement { get; set; }
}