namespace Dynamo.CMS.API.Contracts;

public class DataCollectionCreationDTO
{
    public required string Name { get; set; }
    public required string DisplayName { get; set; }
    public required List<ColumnCreationDTO> Columns { get; set; }
}

public class ColumnCreationDTO
{
    public required string Name { get; set; }
    public string? DisplayName { get; set; }
    public required string BaseTypeName { get; set; }
    public bool Nullable { get; set; } = true;
    public bool Visible { get; set; } = true;
    public bool Unique { get; set; } = false;
    public bool AutoIncrement { get; set; } = false;
    public ReferenceDTO? Reference { get; set; }
}

public class ReferenceDTO
{
    public required string DataCollection { get; set; }
    public required string Property { get; set; }
    public object? Value { get; set; } = null;
}