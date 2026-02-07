namespace Dynamo.CMS.API.Models;

public class Webhook : IEntity<int>
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string Url { get; set; }
    public string HttpMethod { get; set; } = "POST";
    public List<string> Events { get; set; } = [];
    public Dictionary<string, string>? Headers { get; set; }
    public bool IsActive { get; set; } = true;
    public string? SecretKey { get; set; }
    public int TimeoutSeconds { get; set; } = 30;
    public int MaxRetries { get; set; } = 3;
    public int RetryDelaySeconds { get; set; } = 60;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastTriggeredAt { get; set; }
    public int SuccessCount { get; set; }
    public int FailureCount { get; set; }
    public string? LastError { get; set; }
    public string? CreatedBy { get; set; }
    
    public ICollection<WebhookDelivery> Deliveries { get; set; } = [];
}

public class WebhookDelivery : IEntity<int>
{
    public int Id { get; set; }
    public int WebhookId { get; set; }
    public Webhook? Webhook { get; set; }
    public required string EventName { get; set; }
    public Dictionary<string, object> Payload { get; set; } = [];
    public int? StatusCode { get; set; }
    public string? Response { get; set; }
    public Dictionary<string, string>? ResponseHeaders { get; set; }
    public bool IsSuccess { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime SentAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
    public int DurationMs { get; set; }
    public int RetryCount { get; set; }
    public DateTime? NextRetryAt { get; set; }
}

public static class WebhookEvents
{
    public const string EntryCreated = "entry.created";
    public const string EntryUpdated = "entry.updated";
    public const string EntryDeleted = "entry.deleted";
    public const string EntryPublished = "entry.published";
    public const string EntryUnpublished = "entry.unpublished";
    public const string CollectionCreated = "collection.created";
    public const string CollectionUpdated = "collection.updated";
    public const string CollectionDeleted = "collection.deleted";
    public const string MediaUploaded = "media.uploaded";
    public const string MediaDeleted = "media.deleted";
    public const string UserCreated = "user.created";
    public const string UserUpdated = "user.updated";
    public const string UserDeleted = "user.deleted";
    
    public static readonly string[] AllEvents =
    [
        EntryCreated, EntryUpdated, EntryDeleted, EntryPublished, EntryUnpublished,
        CollectionCreated, CollectionUpdated, CollectionDeleted,
        MediaUploaded, MediaDeleted,
        UserCreated, UserUpdated, UserDeleted
    ];
}
