using System.Text.Json.Serialization;

namespace Dynamo.CMS.API.Models;

public class Reference
{
    [JsonPropertyName("dataCollection")]
    public required string DataCollection { get; set; }
    [JsonPropertyName("property")]
    public required string Property { get; set; }
    [JsonPropertyName("value")]
    public object? Value { get; set; }
}
