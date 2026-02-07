namespace Dynamo.CMS.API.Contracts;

public class WebhookDto
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string Url { get; set; }
    public string HttpMethod { get; set; } = "POST";
    public List<string> Events { get; set; } = [];
    public Dictionary<string, string>? Headers { get; set; }
    public bool IsActive { get; set; }
    public int TimeoutSeconds { get; set; }
    public int MaxRetries { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? LastTriggeredAt { get; set; }
    public int SuccessCount { get; set; }
    public int FailureCount { get; set; }
    public string? LastError { get; set; }
}

public class CreateWebhookDto
{
    public required string Name { get; set; }
    public required string Url { get; set; }
    public string? HttpMethod { get; set; } = "POST";
    public List<string>? Events { get; set; }
    public Dictionary<string, string>? Headers { get; set; }
    public string? SecretKey { get; set; }
    public int? TimeoutSeconds { get; set; } = 30;
    public int? MaxRetries { get; set; } = 3;
}

public class UpdateWebhookDto
{
    public string? Name { get; set; }
    public string? Url { get; set; }
    public string? HttpMethod { get; set; }
    public List<string>? Events { get; set; }
    public Dictionary<string, string>? Headers { get; set; }
    public bool? IsActive { get; set; }
    public string? SecretKey { get; set; }
    public int? TimeoutSeconds { get; set; }
    public int? MaxRetries { get; set; }
}

public class WebhookDeliveryDto
{
    public int Id { get; set; }
    public int WebhookId { get; set; }
    public string EventName { get; set; } = string.Empty;
    public int? StatusCode { get; set; }
    public bool IsSuccess { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime SentAt { get; set; }
    public int DurationMs { get; set; }
    public int RetryCount { get; set; }
}

public class WebhookDeliveryDetailDto : WebhookDeliveryDto
{
    public Dictionary<string, object> Payload { get; set; } = [];
    public string? Response { get; set; }
    public Dictionary<string, string>? ResponseHeaders { get; set; }
    public DateTime? CompletedAt { get; set; }
}

public class WebhookTestDto
{
    public required string EventName { get; set; }
    public Dictionary<string, object>? Payload { get; set; }
}

public class WebhookStatsDto
{
    public int TotalWebhooks { get; set; }
    public int ActiveWebhooks { get; set; }
    public int TotalDeliveries24h { get; set; }
    public int SuccessRate24h { get; set; }
    public int FailedDeliveries24h { get; set; }
}

public class ScheduledJobDto
{
    public int Id { get; set; }
    public required string JobType { get; set; }
    public required string CollectionName { get; set; }
    public int EntryId { get; set; }
    public DateTime ScheduledAt { get; set; }
    public bool IsCompleted { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateScheduledJobDto
{
    public required string JobType { get; set; }
    public required string CollectionName { get; set; }
    public int EntryId { get; set; }
    public DateTime ScheduledAt { get; set; }
}

public class ContentVersionDto
{
    public int Id { get; set; }
    public required string CollectionName { get; set; }
    public int EntryId { get; set; }
    public int VersionNumber { get; set; }
    public Dictionary<string, object> Data { get; set; } = [];
    public string? ChangeSummary { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public string? CreatedByName { get; set; }
    public bool IsCurrent { get; set; }
}

public class CreateContentVersionDto
{
    public required string CollectionName { get; set; }
    public int EntryId { get; set; }
    public Dictionary<string, object> Data { get; set; } = [];
    public string? ChangeSummary { get; set; }
}

public class ContentVersionDiffDto
{
    public int FromVersionId { get; set; }
    public int ToVersionId { get; set; }
    public List<FieldChange> Changes { get; set; } = [];
}

public class FieldChange
{
    public required string FieldName { get; set; }
    public required string ChangeType { get; set; } // added, removed, modified
    public object? OldValue { get; set; }
    public object? NewValue { get; set; }
}
