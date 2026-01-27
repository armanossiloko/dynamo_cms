namespace Dynamo.CMS.API.Contracts;

public class DataInsertDTO
{
    public required string Table { get; init; }
    public required List<object> Data { get; init; }
}