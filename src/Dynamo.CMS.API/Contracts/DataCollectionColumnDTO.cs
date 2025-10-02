namespace Dynamo.CMS.API.Contracts;

public class DataCollectionColumnDTO
{
    public required string Name { get; set; }

    public string? DisplayName { get; set; }

    public required string BaseType { get; set; }

    public required bool Nullable { get; set; }

    public required bool Visible { get; set; }
}