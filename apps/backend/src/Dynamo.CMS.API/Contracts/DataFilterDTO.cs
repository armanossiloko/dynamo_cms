using System.Text.Json.Serialization;

namespace Dynamo.CMS.API.Contracts;

public class DataFilterDTO
{
    public string? OrderByDesc { get; set; }
    public string? OrderBy { get; set; }
    public int? Page { get; set; }
    public int? Count { get; set; }
    public FilterConditionDTO? Where { get; set; }
}

public enum FilterType { AND, OR }

public class FilterConditionDTO
{
    [JsonPropertyName("field")]
    public string? Field { get; set; }

    [JsonPropertyName("operator")]
    public string? Operator { get; set; }

    [JsonPropertyName("value")]
    public object? Value { get; set; }

    [JsonPropertyName("filter")]
    public FilterType? Filter { get; set; }

    [JsonPropertyName("conditions")]
    public List<FilterConditionDTO>? Conditions { get; set; }
}