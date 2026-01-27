namespace Dynamo.CMS.API.Contracts;

public class DataUpdateDTO
{
    public required Dictionary<string, object?> Data { get; set; }
}

public class DataDeleteDTO
{
    public required Dictionary<string, object?> Where { get; set; }
}

public class DataBulkInsertDTO
{
    public required List<Dictionary<string, object?>> Data { get; set; }
}

public class DataResponseDTO
{
    public required List<Dictionary<string, object?>> Data { get; set; }
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
}
