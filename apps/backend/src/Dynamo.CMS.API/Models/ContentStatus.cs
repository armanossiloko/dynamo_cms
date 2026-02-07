namespace Dynamo.CMS.API.Models;

public enum ContentStatus
{
    Draft,
    Published,
    Archived
}

public enum PublishingAction
{
    PublishNow,
    SchedulePublish,
    UnpublishNow,
    ScheduleUnpublish,
    Archive
}

public class ScheduledJob : IEntity<int>
{
    public int Id { get; set; }
    public required string JobType { get; set; }
    public required string CollectionName { get; set; }
    public int EntryId { get; set; }
    public DateTime ScheduledAt { get; set; }
    public bool IsCompleted { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
}
