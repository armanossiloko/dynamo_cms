namespace Dynamo.CMS.API.Contracts;

public class DataCollectionDTO
{
    public required string Name { get; set; }

    public required string DisplayName { get; set; }

    public List<DataCollectionColumnDTO> Columns { get; set; } = [];
}
