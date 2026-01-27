# Audit Logging

## Overview
Implement comprehensive, immutable audit trail logging every action performed in the system.

## Priority: 12 (Medium)
Invaluable for security compliance, debugging, and understanding user activity.

## Implementation Plan

### Backend Changes

#### 1. Create Audit Log Model
**File: `backend/src/Dynamo.CMS.API/Models/AuditLog.cs`**
```csharp
public class AuditLog
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty; // CREATE, UPDATE, DELETE, READ
    public string EntityType { get; set; } = string.Empty; // CollectionName, User, Media, etc.
    public string? EntityId { get; set; }
    public Dictionary<string, object> Changes { get; set; } = new(); // OldValue vs NewValue
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public DateTime Timestamp { get; set; }
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
    public string? TenantId { get; set; }
}
```

#### 2. Create Audit Action Enum
**File: `backend/src/Dynamo.CMS.API/Models/AuditAction.cs`**
```csharp
public static class AuditActions
{
    public const string Create = "CREATE";
    public const string Read = "READ";
    public const string Update = "UPDATE";
    public const string Delete = "DELETE";
    public const string Login = "LOGIN";
    public const string Logout = "LOGOUT";
    public const string Export = "EXPORT";
    public const string Import = "IMPORT";
    public const string Publish = "PUBLISH";
    public const string Archive = "ARCHIVE";
}
```

#### 3. Add AuditLog to DbContext
```csharp
public class AppDbContext : DbContext
{
    public DbSet<AuditLog> AuditLogs { get; set; }
}
```

#### 4. Create Audit Service
**File: `backend/src/Dynamo.CMS.API/Services/AuditService.cs`**
```csharp
public interface IAuditService
{
    Task LogAsync(AuditLogEntry entry);
    Task<IEnumerable<AuditLog>> GetAuditLogsAsync(AuditLogQuery query);
    Task<IEnumerable<AuditLog>> GetEntityHistoryAsync(string entityType, string entityId);
    Task ExportAuditLogsAsync(AuditLogQuery query, string format);
}

public class AuditService : IAuditService
{
    private readonly AppDbContext _context;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public async Task LogAsync(AuditLogEntry entry)
    {
        var httpContext = _httpContextAccessor.HttpContext;
        var user = httpContext?.User;

        var auditLog = new AuditLog
        {
            UserId = user?.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "system",
            UserName = user?.Identity?.Name ?? "system",
            Action = entry.Action,
            EntityType = entry.EntityType,
            EntityId = entry.EntityId?.ToString(),
            Changes = entry.Changes,
            IpAddress = httpContext?.Connection?.RemoteIpAddress?.ToString(),
            UserAgent = httpContext?.Request?.Headers["User-Agent"].ToString(),
            Timestamp = DateTime.UtcNow,
            Success = entry.Success,
            ErrorMessage = entry.ErrorMessage
        };

        _context.AuditLogs.Add(auditLog);
        await _context.SaveChangesAsync();
    }

    public async Task<IEnumerable<AuditLog>> GetAuditLogsAsync(AuditLogQuery query)
    {
        var logs = _context.AuditLogs.AsQueryable();

        if (!string.IsNullOrEmpty(query.UserId))
            logs = logs.Where(l => l.UserId == query.UserId);

        if (!string.IsNullOrEmpty(query.EntityType))
            logs = logs.Where(l => l.EntityType == query.EntityType);

        if (!string.IsNullOrEmpty(query.EntityId))
            logs = logs.Where(l => l.EntityId == query.EntityId);

        if (query.StartDate.HasValue)
            logs = logs.Where(l => l.Timestamp >= query.StartDate.Value);

        if (query.EndDate.HasValue)
            logs = logs.Where(l => l.Timestamp <= query.EndDate.Value);

        if (query.Action.HasValue)
            logs = logs.Where(l => l.Action == query.Action.Value);

        logs = logs.OrderByDescending(l => l.Timestamp);

        if (query.Page.HasValue && query.PageSize.HasValue)
            logs = logs.Skip((query.Page.Value - 1) * query.PageSize.Value).Take(query.PageSize.Value);

        return await logs.ToListAsync();
    }
}

public record AuditLogEntry(
    string Action,
    string EntityType,
    object? EntityId = null,
    Dictionary<string, object>? Changes = null,
    bool Success = true,
    string? ErrorMessage = null
);

public record AuditLogQuery(
    string? UserId = null,
    string? EntityType = null,
    string? EntityId = null,
    DateTime? StartDate = null,
    DateTime? EndDate = null,
    string? Action = null,
    int? Page = null,
    int? PageSize = null
);
```

#### 5. Create Audit Interceptor
**File: `backend/src/Dynamo.CMS.API/Data/AuditInterceptor.cs`**
```csharp
public class AuditInterceptor : SaveChangesInterceptor
{
    private readonly IAuditService _auditService;

    public override async ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        var dbContext = eventData.Context;
        var auditService = dbContext.GetService<IAuditService>();

        var entries = dbContext.ChangeTracker.Entries()
            .Where(e => e.State == EntityState.Added ||
                         e.State == EntityState.Modified ||
                         e.State == EntityState.Deleted)
            .ToList();

        foreach (var entry in entries)
        {
            var entityType = entry.Entity.GetType().Name;
            var entityId = entry.Property("Id")?.CurrentValue;

            Dictionary<string, object> changes = new();

            if (entry.State == EntityState.Added)
            {
                foreach (var property in entry.Properties)
                {
                    if (!property.IsTemporary && property.Metadata.IsPrimaryKey) continue;
                    changes[$"+{property.Metadata.Name}"] = property.CurrentValue;
                }

                await auditService.LogAsync(new AuditLogEntry(
                    AuditActions.Create,
                    entityType,
                    entityId,
                    changes
                ));
            }
            else if (entry.State == EntityState.Modified)
            {
                foreach (var property in entry.Properties)
                {
                    if (property.IsModified)
                    {
                        changes[property.Metadata.Name] = new
                        {
                            oldValue = property.OriginalValue,
                            newValue = property.CurrentValue
                        };
                    }
                }

                await auditService.LogAsync(new AuditLogEntry(
                    AuditActions.Update,
                    entityType,
                    entityId,
                    changes
                ));
            }
            else if (entry.State == EntityState.Deleted)
            {
                foreach (var property in entry.Properties)
                {
                    if (!property.IsTemporary && property.Metadata.IsPrimaryKey) continue;
                    changes[$"-{property.Metadata.Name}"] = property.OriginalValue;
                }

                await auditService.LogAsync(new AuditLogEntry(
                    AuditActions.Delete,
                    entityType,
                    entityId,
                    changes
                ));
            }
        }

        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }
}
```

#### 6. Register Audit Interceptor
**File: `backend/src/Dynamo.CMS.API/Program.cs`**
```csharp
builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"));
    options.AddInterceptors<AuditInterceptor>();
});

builder.Services.AddScoped<IAuditService, AuditService>();
```

#### 7. Create AuditLogController
```csharp
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AuditLogsController : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<IEnumerable<AuditLog>>> GetAuditLogs([FromQuery] AuditLogQuery query)
    {
        var logs = await _auditService.GetAuditLogsAsync(query);
        return Ok(logs);
    }

    [HttpGet("entity/{entityType}/{entityId}")]
    [Authorize]
    public async Task<ActionResult<IEnumerable<AuditLog>>> GetEntityHistory(
        string entityType,
        string entityId)
    {
        var history = await _auditService.GetEntityHistoryAsync(entityType, entityId);
        return Ok(history);
    }

    [HttpGet("export")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> ExportAuditLogs(
        [FromQuery] AuditLogQuery query,
        [FromQuery] string format = "csv")
    {
        await _auditService.ExportAuditLogsAsync(query, format);

        var fileName = $"audit-logs-{DateTime.UtcNow:yyyyMMdd}.{format}";
        return File(new MemoryStream(), $"text/{format}", fileName);
    }
}
```

### Frontend Changes

#### 1. Create Audit Logs Component
```typescript
@Component({
  selector: 'app-audit-logs',
  template: `
    <div class="audit-logs">
      <div class="filters">
        <select [(ngModel)]="filters.action">
          <option value="">All Actions</option>
          <option value="CREATE">Create</option>
          <option value="UPDATE">Update</option>
          <option value="DELETE">Delete</option>
        </select>

        <input type="text" [(ngModel)]="filters.userId" placeholder="User ID">

        <input type="text" [(ngModel)]="filters.entityType" placeholder="Entity Type">

        <input type="date" [(ngModel)]="filters.startDate">
        <input type="date" [(ngModel)]="filters.endDate">

        <button (click)="search()">Search</button>
        <button (click)="export()">Export</button>
      </div>

      <div class="logs-table">
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Changes</th>
              <th>IP Address</th>
            </tr>
          </thead>
          <tbody>
            @for (log of logs; track log.id) {
              <tr>
                <td>{{ log.timestamp | date:'medium' }}</td>
                <td>{{ log.userName }}</td>
                <td>
                  <span [class]="'action-badge ' + log.action.toLowerCase()">
                    {{ log.action }}
                  </span>
                </td>
                <td>{{ log.entityType }} #{{ log.entityId }}</td>
                <td>
                  <button (click)="viewChanges(log)">View Changes</button>
                </td>
                <td>{{ log.ipAddress }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <div class="pagination">
        <button (click)="prevPage()" [disabled]="page === 1">Previous</button>
        <span>Page {{ page }}</span>
        <button (click)="nextPage()" [disabled]="logs.length < pageSize">Next</button>
      </div>
    </div>
  `,
  standalone: true
})
export class AuditLogsComponent implements OnInit {
  logs: AuditLog[] = [];
  filters = {
    action: '',
    userId: '',
    entityType: '',
    startDate: '',
    endDate: ''
  };
  page = 1;
  pageSize = 20;

  async ngOnInit() {
    await this.loadLogs();
  }

  async loadLogs() {
    this.logs = await this.auditService.getLogs({
      ...this.filters,
      page: this.page,
      pageSize: this.pageSize
    });
  }

  viewChanges(log: AuditLog) {
    // Show changes modal
  }

  async export() {
    await this.auditService.exportLogs(this.filters);
  }
}
```

## Rollout Plan

1. **Phase 1**: Create audit log model
2. **Phase 2**: Implement audit service
3. **Phase 3**: Create audit interceptor
4. **Phase 4**: Register interceptor with DbContext
5. **Phase 5**: Create audit log controller
6. **Phase 6**: Build audit logs UI
7. **Phase 7**: Add export functionality
8. **Phase 8**: Add audit log search/filtering
9. **Phase 9**: Add retention policy
10. **Phase 10**: Add audit analytics

## Success Criteria

- All database changes are logged
- User actions are tracked
- Audit logs can be queried
- Entity history is available
- Audit logs can be exported
- UI displays audit logs
- Logs are immutable
