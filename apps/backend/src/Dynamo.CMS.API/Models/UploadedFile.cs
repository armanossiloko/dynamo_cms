using System.Text.Json.Serialization;

namespace Dynamo.CMS.API.Models;

public class UploadedFile
{
    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("displayName")]
    public string? DisplayName { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("uploadedAt")]
    public DateTimeOffset? UploadedAt { get; set; }

    [JsonPropertyName("location")]
    public required string Location { get; set; }

}
