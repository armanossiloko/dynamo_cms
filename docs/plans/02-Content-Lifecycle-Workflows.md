# Content Lifecycle/Workflows

## Overview
Implement a content state system with Draft, Published, and Archived states, along with a review workflow for content approval before publication.

## Priority: 2 (High)
Critical for professional content management where content needs to be reviewed, approved, and published at specific times.

## Implementation Plan

### Backend Changes

#### 1. Add ContentStatus Enum
**File: `backend/src/Dynamo.CMS.API/Models/ContentStatus.cs`**
```csharp
public enum ContentStatus
{
    Draft = 0,
    Review = 1,
    Published = 2,
    Archived = 3
}
```

#### 2. Update Dynamic Table Generation
**File: `backend/src/Dynamo.CMS.API/Services/PostgreSQLGenerator.cs`**
- Add `ContentStatus` and `PublishedAt` columns to all dynamic tables
- Add `CreatedAt` and `UpdatedAt` columns for audit trail

```csharp
private string GetDefaultColumns()
{
    return @"
        id SERIAL PRIMARY KEY,
        status INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        published_at TIMESTAMPTZ NULL
    ";
}
```

#### 3. Create Migration
**File: `backend/src/Dynamo.CMS.API/Migrations/.../AddContentStatus.cs`**
- Alter existing tables to add status columns
- Set default status to Draft for existing records

#### 4. Update DataCollection Model
**File: `backend/src/Dynamo.CMS.API/Models/DataCollection.cs`**
- Add `EnableWorkflow` boolean property
- Add `RequiredRolesForPublish` array of role names
- Add `RequiredApproval` boolean property

#### 5. Update DataController
**File: `backend/src/Dynamo.CMS.API/Controllers/DataController.cs`**
- Add status filtering to GET endpoints
- Add status transition validation
- Add role-based authorization for status changes

```csharp
[HttpGet]
[ProducesResponseType(StatusCodes.Status200OK)]
public async Task<IActionResult> GetAll([FromQuery] ContentStatus? status = null)
{
    var query = "SELECT * FROM {0}";
    if (status.HasValue)
    {
        query += " WHERE status = @status";
    }
    // Execute query with status parameter
}

[HttpPost("{id}/publish")]
[Authorize(Roles = "Admin,Editor")]
public async Task<IActionResult> Publish(string collection, string id)
{
    // Validate user has permission to publish
    // Update status to Published
    // Set published_at timestamp
}

[HttpPost("{id}/submit-for-review")]
[Authorize]
public async Task<IActionResult> SubmitForReview(string collection, string id)
{
    // Transition from Draft to Review
}
```

#### 6. Create WorkflowService
**File: `backend/src/Dynamo.CMS.API/Services/WorkflowService.cs`**
```csharp
public interface IWorkflowService
{
    Task<bool> CanTransitionStatus(User user, ContentStatus from, ContentStatus to, DataCollection collection);
    Task<string?> ValidateTransition(string collection, string id, ContentStatus newStatus);
    Task LogStatusChange(string collection, string id, ContentStatus oldStatus, ContentStatus newStatus, string userId);
}

public class WorkflowService : IWorkflowService
{
    public async Task<bool> CanTransitionStatus(User user, ContentStatus from, ContentStatus to, DataCollection collection)
    {
        // Implement workflow rules:
        // - Draft → Review: Author can submit
        // - Review → Published: Only users with specific roles
        // - Published → Archived: Admin only
        // etc.
    }
}
```

#### 7. Add Program Registration
**File: `backend/src/Dynamo.CMS.API/Program.cs`**
```csharp
builder.Services.AddScoped<IWorkflowService, WorkflowService>();
```

### Frontend Changes

#### 1. Create Workflow Components
**File: `frontend/src/app/components/shared/content-status-badge.component.ts`**
```typescript
@Component({
  selector: 'app-content-status-badge',
  template: `
    <span [class]="'status-badge status-' + status">
      {{ statusLabel }}
    </span>
  `,
  standalone: true
})
export class ContentStatusBadgeComponent {
  @Input() status: ContentStatus;

  get statusLabel() {
    const labels = {
      [ContentStatus.Draft]: 'Draft',
      [ContentStatus.Review]: 'In Review',
      [ContentStatus.Published]: 'Published',
      [ContentStatus.Archived]: 'Archived'
    };
    return labels[this.status] || 'Unknown';
  }
}
```

#### 2. Update Data Entry List
**File: `frontend/src/app/components/data/data-list.component.ts`**
- Add status column to data table
- Add status filter dropdown
- Show different action buttons based on status

#### 3. Create Status Actions Component
**File: `frontend/src/app/components/shared/status-actions.component.ts`**
```typescript
@Component({
  selector: 'app-status-actions',
  template: `
    <div class="status-actions">
      @if (canEdit) {
        <button (click)="edit()">Edit</button>
      }
      @if (canSubmitForReview) {
        <button (click)="submitForReview()">Submit for Review</button>
      }
      @if (canPublish) {
        <button (click)="publish()">Publish</button>
      }
      @if (canArchive) {
        <button (click)="archive()">Archive</button>
      }
    </div>
  `,
  standalone: true,
  imports: [CommonModule]
})
export class StatusActionsComponent {
  @Input() entry: any;
  @Input() collection: any;
  @Output() statusChange = new EventEmitter<ContentStatus>();

  get canSubmitForReview() {
    return this.entry.status === ContentStatus.Draft;
  }

  get canPublish() {
    return this.entry.status === ContentStatus.Review && this.hasPublishPermission;
  }

  async publish() {
    await this.dataService.publishEntry(this.collection.name, this.entry.id);
    this.statusChange.emit(ContentStatus.Published);
  }
}
```

#### 4. Update Collection Schema Form
**File: `frontend/src/app/components/collections/collection-form.component.ts`**
- Add checkbox for "Enable Workflow"
- Add role selector for "Who can publish"
- Add checkbox for "Require approval before publishing"

### Database Changes

#### Schema Updates
```sql
-- Add to all existing dynamic tables
ALTER TABLE {collection_name}
ADD COLUMN status INTEGER NOT NULL DEFAULT 0,
ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
ADD COLUMN published_at TIMESTAMPTZ NULL;

-- Add index for status filtering
CREATE INDEX idx_{collection_name}_status ON {collection_name}(status);
CREATE INDEX idx_{collection_name}_published_at ON {collection_name}(published_at);
```

#### Add Status History Table
```sql
CREATE TABLE status_history (
    id SERIAL PRIMARY KEY,
    collection_name VARCHAR(255) NOT NULL,
    entry_id INTEGER NOT NULL,
    old_status INTEGER NOT NULL,
    new_status INTEGER NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT NULL
);
```

## API Changes

### New Endpoints

#### Status Transition
```
POST /api/data/{collection}/{id}/publish
POST /api/data/{collection}/{id}/submit-for-review
POST /api/data/{collection}/{id}/reject
POST /api/data/{collection}/{id}/archive
POST /api/data/{collection}/{id}/restore
```

#### Status History
```
GET /api/data/{collection}/{id}/history
```

#### Workflow Configuration
```
PATCH /api/datacollections/{collection}/workflow
```

### Updated Endpoints

#### Query with Status Filter
```
GET /api/data/{collection}?status=published
GET /api/data/{collection}?status=draft,review
```

## Authorization

### Role-Based Access Control
- **Author**: Create/Edit content, Submit for review
- **Editor**: Review content, Approve/Reject, Publish
- **Admin**: Full control, can override workflow
- **Publisher**: Can publish content without review

### Permission Checks
```csharp
public bool CanChangeStatus(User user, ContentStatus from, ContentStatus to, DataCollection collection)
{
    // Only Admin can transition to Archived
    if (to == ContentStatus.Archived)
        return user.IsInRole("Admin");

    // Check collection-specific permissions
    if (collection.RequiredRolesForPublish?.Any(role => user.IsInRole(role)) == true)
        return to == ContentStatus.Published;

    return false;
}
```

## Testing

### Unit Tests
- Test status transition validation
- Test role-based authorization
- Test workflow service logic

### Integration Tests
- Test complete workflow (Draft → Review → Published)
- Test unauthorized status changes
- Test status filtering in queries
- Test workflow configuration

## Dependencies

### Backend
- No new dependencies required

### Frontend
- No new dependencies required

## Considerations

1. **Soft Delete**: Consider using Archived status instead of hard delete
2. **Versioning**: Should creating a new version reset status to Draft?
3. **Scheduled Publishing**: Combine with scheduled publishing feature
4. **Multi-stage Approval**: Support multiple review stages if needed
5. **Email Notifications**: Send emails when content changes status
6. **Webhook Integration**: Trigger webhooks on status changes
7. **Audit Trail**: Keep history of all status changes

## Rollout Plan

1. **Phase 1**: Add status columns and enum
2. **Phase 2**: Implement basic state transitions
3. **Phase 3**: Add role-based authorization
4. **Phase 4**: Build UI components and integrate with admin panel
5. **Phase 5**: Add workflow configuration and history tracking
6. **Phase 6**: Add email notifications and webhooks

## Success Criteria

- Content can be in Draft, Review, Published, or Archived states
- Only authorized users can change status
- Status history is tracked
- Public API returns only Published content by default
- Admin UI shows all content with status filtering
- Workflow can be configured per collection
- Email notifications sent on status changes
