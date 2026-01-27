# Scheduled Publishing

## Overview
Enable content to be published at a future date/time automatically through a background job scheduler.

## Priority: 3 (High)
Natural extension of the Content Lifecycle feature. Essential for time-based content strategies.

## Implementation Plan

### Backend Changes

#### 1. Add PublishAt Column
**File: `backend/src/Dynamo.CMS.API/Services/PostgreSQLGenerator.cs`**
- Ensure `published_at` column is already added by Content Lifecycle feature
- Add `schedule_publish_at` column for scheduled publishing

```csharp
private string GetDefaultColumns()
{
    return @"
        id SERIAL PRIMARY KEY,
        status INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        published_at TIMESTAMPTZ NULL,
        schedule_publish_at TIMESTAMPTZ NULL
    ";
}
```

#### 2. Install Hangfire
**File: `backend/src/Dynamo.CMS.API/Dynamo.CMS.API.csproj`**
```xml
<PackageReference Include="Hangfire" Version="1.8.14" />
<PackageReference Include="Hangfire.PostgreSql" Version="1.20.7" />
<PackageReference Include="Hangfire.AspNetCore" Version="1.8.14" />
```

#### 3. Configure Hangfire
**File: `backend/src/Dynamo.CMS.API/Program.cs`**
```csharp
builder.Services.AddHangfire(config => config
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UsePostgreSqlStorage(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        new PostgreSqlStorageOptions
        {
            QueuePollInterval = TimeSpan.FromSeconds(15)
        }));

builder.Services.AddHangfireServer(options =>
{
    options.WorkerCount = 1;
    options.Queues = new[] { "default", "publishing" };
});

app.UseHangfireDashboard("/hangfire", options =>
{
    options.Authorization = new[] { new HangfireAuthorizationFilter() };
});
```

#### 4. Create HangfireAuthorizationFilter
**File: `backend/src/Dynamo.CMS.API/Services/HangfireAuthorizationFilter.cs`**
```csharp
public class HangfireAuthorizationFilter : IDashboardAuthorizationFilter
{
    public bool Authorize(DashboardContext context)
    {
        var httpContext = context.GetHttpContext();
        return httpContext.User.IsInRole("Admin");
    }
}
```

#### 5. Create ScheduledPublishService
**File: `backend/src/Dynamo.CMS.API/Services/ScheduledPublishService.cs`**
```csharp
public interface IScheduledPublishService
{
    Task SchedulePublish(string collection, string id, DateTimeOffset publishAt);
    Task CancelScheduledPublish(string collection, string id);
    Task CheckAndPublishScheduledItems();
}

public class ScheduledPublishService : IScheduledPublishService
{
    private readonly IBackgroundJobClient _backgroundJobClient;
    private readonly IDbContextFactory<AppDbContext> _dbContextFactory;
    private readonly IWorkflowService _workflowService;

    public async Task SchedulePublish(string collection, string id, DateTimeOffset publishAt)
    {
        if (publishAt <= DateTimeOffset.UtcNow)
            throw new ArgumentException("Publish date must be in the future");

        // Update entry with scheduled publish time
        await UpdateEntryAsync(collection, id, publishAt);

        // Schedule background job
        _backgroundJobClient.Enqueue<IScheduledPublishService>(
            service => service.PublishEntryAsync(collection, id),
            new EnqueuedState("publishing")
        );
    }

    public async Task PublishEntryAsync(string collection, string id)
    {
        // Retrieve entry
        var entry = await GetEntryAsync(collection, id);

        // Verify still scheduled
        if (entry.Status == ContentStatus.Scheduled && entry.SchedulePublishAt <= DateTimeOffset.UtcNow)
        {
            // Transition to Published
            await _workflowService.TransitionStatusAsync(collection, id, ContentStatus.Published);

            // Update published_at timestamp
            await UpdatePublishedAtAsync(collection, id, DateTimeOffset.UtcNow);

            // Clear schedule_publish_at
            await ClearScheduleAsync(collection, id);
        }
    }

    public async Task CheckAndPublishScheduledItems()
    {
        // Called by recurring job to check for missed items
        var collections = await GetAllCollectionsAsync();
        foreach (var collection in collections)
        {
            var scheduledItems = await GetScheduledItemsAsync(collection.Name);
            foreach (var item in scheduledItems)
            {
                if (item.SchedulePublishAt <= DateTimeOffset.UtcNow)
                {
                    await PublishEntryAsync(collection.Name, item.Id);
                }
            }
        }
    }
}
```

#### 6. Update DataController
**File: `backend/src/Dynamo.CMS.API/Controllers/DataController.cs`**
- Add endpoint to schedule publish
- Add endpoint to cancel scheduled publish

```csharp
[HttpPost("{id}/schedule-publish")]
[Authorize]
public async Task<IActionResult> SchedulePublish(string collection, string id, [FromBody] SchedulePublishDto dto)
{
    await _scheduledPublishService.SchedulePublish(collection, id, dto.PublishAt);
    return Ok(new { message = "Content scheduled for publishing" });
}

[HttpPost("{id}/cancel-scheduled-publish")]
[Authorize]
public async Task<IActionResult> CancelScheduledPublish(string collection, string id)
{
    await _scheduledPublishService.CancelScheduledPublish(collection, id);
    return Ok(new { message = "Scheduled publishing cancelled" });
}
```

#### 7. Create Recurring Job
**File: `backend/src/Dynamo.CMS.API/Program.cs`**
```csharp
// Register recurring job to check for scheduled items
using (var scope = app.Services.CreateScope())
{
    var recurringJobs = scope.ServiceProvider.GetRequiredService<IRecurringJobManager>();
    recurringJobs.AddOrUpdate<IScheduledPublishService>(
        "check-scheduled-publish",
        service => service.CheckAndPublishScheduledItems(),
        "*/5 * * * *", // Every 5 minutes
        TimeZoneInfo.Utc
    );
}
```

#### 8. Add Program Registration
**File: `backend/src/Dynamo.CMS.API/Program.cs`**
```csharp
builder.Services.AddScoped<IScheduledPublishService, ScheduledPublishService>();
```

### Frontend Changes

#### 1. Update Data Entry Form
**File: `frontend/src/app/components/data/data-entry.component.ts`**
- Add datetime picker for scheduled publishing
- Show scheduled status indicator
- Add cancel button for scheduled items

```typescript
@Component({
  template: `
    @if (entry.status === ContentStatus.Scheduled) {
      <div class="scheduled-indicator">
        Scheduled to publish: {{ entry.schedulePublishAt | date:'medium' }}
        <button (click)="cancelSchedule()">Cancel</button>
      </div>
    }

    @if (canSchedulePublish) {
      <div class="schedule-publish">
        <label>Schedule Publish</label>
        <input type="datetime-local" [(ngModel)]="schedulePublishAt">
        <button (click)="schedulePublish()">Schedule</button>
      </div>
    }
  `
})
export class DataEntryComponent {
  schedulePublishAt?: string;

  async schedulePublish() {
    if (this.schedulePublishAt) {
      await this.dataService.schedulePublish(
        this.collection.name,
        this.entry.id,
        new Date(this.schedulePublishAt)
      );
      this.loadEntry();
    }
  }

  async cancelSchedule() {
    await this.dataService.cancelScheduledPublish(this.collection.name, this.entry.id);
    this.loadEntry();
  }
}
```

#### 2. Create Scheduled Items Component
**File: `frontend/src/app/components/data/scheduled-items.component.ts`**
- Show list of all scheduled items across collections
- Allow bulk cancel operations
- Show countdown to publish time

#### 3. Add Datetime Picker Component
**File: `frontend/src/app/components/shared/datetime-picker.component.ts`**
- Reusable datetime picker with timezone support
- Minimum date validation (must be in future)

#### 4. Update Status Display
**File: `frontend/src/app/components/shared/content-status-badge.component.ts`**
- Add "Scheduled" status indicator
- Show time until publish

```typescript
get timeUntilPublish() {
  if (this.status === ContentStatus.Scheduled && this.schedulePublishAt) {
    const diff = new Date(this.schedulePublishAt).getTime() - Date.now();
    return this.formatDuration(diff);
  }
  return null;
}
```

### Database Changes

#### Schema Updates
```sql
-- Add to all dynamic tables
ALTER TABLE {collection_name}
ADD COLUMN schedule_publish_at TIMESTAMPTZ NULL;

-- Add index for performance
CREATE INDEX idx_{collection_name}_schedule_publish_at ON {collection_name}(schedule_publish_at);

-- Add check constraint
ALTER TABLE {collection_name}
ADD CONSTRAINT chk_schedule_future
CHECK (schedule_publish_at IS NULL OR schedule_publish_at > NOW());
```

#### Add Scheduled Status
Update `ContentStatus` enum:
```csharp
public enum ContentStatus
{
    Draft = 0,
    Review = 1,
    Scheduled = 2,
    Published = 3,
    Archived = 4
}
```

## API Changes

### New Endpoints

#### Schedule Publish
```
POST /api/data/{collection}/{id}/schedule-publish
Body: { "publishAt": "2024-12-25T10:00:00Z" }
```

#### Cancel Scheduled Publish
```
POST /api/data/{collection}/{id}/cancel-scheduled-publish
```

#### Get Scheduled Items
```
GET /api/data/{collection}?status=scheduled
```

### Updated Endpoints

#### Query with Schedule Filter
```
GET /api/data/{collection}?scheduled_before=2024-12-31
GET /api/data/{collection}?scheduled_after=2024-12-01
```

## Background Jobs

### Scheduled Publishing Job
- **Type**: Enqueued job
- **Queue**: "publishing"
- **Trigger**: When user schedules publish
- **Action**: Publish entry at scheduled time

### Recurring Check Job
- **Type**: Recurring job
- **Schedule**: Every 5 minutes (Cron: `*/5 * * * *`)
- **Action**: Check for any missed scheduled items
- **Purpose**: Backup mechanism in case individual jobs fail

## Testing

### Unit Tests
- Test schedule validation (future date only)
- Test cancel scheduled publish
- Test scheduled publish job execution
- Test recurring job logic

### Integration Tests
- Test complete workflow (schedule → wait → publish)
- Test scheduled items appear in queries
- Test scheduled status filtering
- Test timezone handling
- Test concurrent scheduled jobs

## Dependencies

### Backend
- `Hangfire` 1.8.14
- `Hangfire.PostgreSql` 1.20.7
- `Hangfire.AspNetCore` 1.8.14

### Frontend
- No new dependencies required (can use native datetime input)

## Considerations

1. **Timezone Support**: Store all times in UTC, convert to user timezone in UI
2. **Job Failure**: Implement retry strategy for failed publish jobs
3. **Concurrent Jobs**: Ensure idempotency if multiple jobs fire for same entry
4. **Validation**: Prevent scheduling if content is not in Draft or Review status
5. **Permissions**: Only allow scheduling if user can publish
6. **Bulk Operations**: Support bulk scheduling multiple items
7. **Notifications**: Send email when scheduled content is published
8. **Webhook Integration**: Trigger webhooks when scheduled content is published
9. **Database Performance**: Index schedule_publish_at column for efficient queries
10. **Dashboard**: Add Hangfire dashboard at /hangfire for admin monitoring

## Rollout Plan

1. **Phase 1**: Install and configure Hangfire
2. **Phase 2**: Add schedule_publish_at column and Scheduled status
3. **Phase 3**: Implement ScheduledPublishService
4. **Phase 4**: Add API endpoints for scheduling
5. **Phase 5**: Build UI components for datetime picker and scheduling
6. **Phase 6**: Add Hangfire dashboard and monitoring
7. **Phase 7**: Add email notifications and webhooks
8. **Phase 8**: Add bulk operations and advanced features

## Success Criteria

- Content can be scheduled for future publishing
- Scheduled content automatically publishes at scheduled time
- Scheduled publishing can be cancelled before time
- Hangfire dashboard is accessible to admins
- Scheduled items can be queried and filtered
- Timezone support works correctly
- Failed jobs are retried appropriately
- Email notifications sent when content is published
- No race conditions with concurrent jobs
