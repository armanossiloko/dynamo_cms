namespace Dynamo.CMS.API.Contracts;

public class DataCollectionUpdateDTO
{
    // DataCollection names cannot be updated right now - it would require updating the table name.
    //public required string Name { get; set; }
    public string? DisplayName { get; set; }
    public required List<ColumnAlterationDTO> Columns { get; set; }
}