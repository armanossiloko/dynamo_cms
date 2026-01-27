# Real-Time Updates with SignalR

## Overview
Use SignalR to push real-time notifications to connected clients.

## Priority: 13 (Low)
Greatly improves user experience in collaborative environments and dashboards.

## Implementation Plan

### Backend Changes

#### 1. Install SignalR
```xml
<PackageReference Include="Microsoft.AspNetCore.SignalR" Version="9.0.0" />
```

#### 2. Configure SignalR
**File: `backend/src/Dynamo.CMS.API/Program.cs`**
```csharp
builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = builder.Environment.IsDevelopment();
    options.KeepAliveInterval = TimeSpan.FromSeconds(10);
    options.ClientTimeoutInterval = TimeSpan.FromSeconds(30);
});

app.MapHub<CmsHub>("/hubs/cms");
```

#### 3. Create CMS Hub
**File: `backend/src/Dynamo.CMS.API/Hubs/CmsHub.cs`**
```csharp
public class CmsHub : Hub
{
    private readonly IConnectionManager _connectionManager;

    public override async Task OnConnectedAsync()
    {
        var userId = Context.UserIdentifier;
        var tenantId = Context.GetHttpContext().Items["Tenant"]?.ToString();

        _connectionManager.AddConnection(userId, tenantId, Context.ConnectionId);

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.UserIdentifier;
        _connectionManager.RemoveConnection(userId, Context.ConnectionId);

        await base.OnDisconnectedAsync(exception);
    }

    public async Task SubscribeToCollection(string collectionName)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"collection:{collectionName}");
    }

    public async Task UnsubscribeFromCollection(string collectionName)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"collection:{collectionName}");
    }

    public async Task SubscribeToEntity(string collectionName, string entityId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"entity:{collectionName}:{entityId}");
    }

    public async Task UnsubscribeFromEntity(string collectionName, string entityId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"entity:{collectionName}:{entityId}");
    }
}
```

#### 4. Create Connection Manager
**File: `backend/src/Dynamo.CMS.API/Services/ConnectionManager.cs`**
```csharp
public interface IConnectionManager
{
    void AddConnection(string userId, string? tenantId, string connectionId);
    void RemoveConnection(string userId, string connectionId);
    IEnumerable<string> GetUserConnections(string userId);
    IEnumerable<string> GetTenantConnections(string tenantId);
    int GetConnectionCount();
}

public class ConnectionManager : IConnectionManager
{
    private readonly ConcurrentDictionary<string, HashSet<string>> _userConnections = new();
    private readonly ConcurrentDictionary<string, HashSet<string>> _tenantConnections = new();

    public void AddConnection(string userId, string? tenantId, string connectionId)
    {
        if (!_userConnections.ContainsKey(userId))
        {
            _userConnections[userId] = new HashSet<string>();
        }
        _userConnections[userId].Add(connectionId);

        if (!string.IsNullOrEmpty(tenantId))
        {
            if (!_tenantConnections.ContainsKey(tenantId))
            {
                _tenantConnections[tenantId] = new HashSet<string>();
            }
            _tenantConnections[tenantId].Add(connectionId);
        }
    }

    public void RemoveConnection(string userId, string connectionId)
    {
        if (_userConnections.ContainsKey(userId))
        {
            _userConnections[userId].Remove(connectionId);
            if (_userConnections[userId].Count == 0)
            {
                _userConnections.TryRemove(userId, out _);
            }
        }
    }
}
```

#### 5. Create Notification Service
**File: `backend/src/Dynamo.CMS.API/Services/NotificationService.cs`**
```csharp
public interface INotificationService
{
    Task NotifyEntryCreatedAsync(string collection, Dictionary<string, object> entry, string? tenantId = null);
    Task NotifyEntryUpdatedAsync(string collection, string id, Dictionary<string, object> entry, string? tenantId = null);
    Task NotifyEntryDeletedAsync(string collection, string id, string? tenantId = null);
    Task NotifyStatusChangedAsync(string collection, string id, string status, string? tenantId = null);
    Task NotifyCommentAddedAsync(string collection, string id, Dictionary<string, object> comment);
    Task NotifyUserActionAsync(string action, Dictionary<string, object> data);
}

public class NotificationService : INotificationService
{
    private readonly IHubContext<CmsHub> _hubContext;

    public async Task NotifyEntryCreatedAsync(string collection, Dictionary<string, object> entry, string? tenantId = null)
    {
        await _hubContext.Clients.Group($"collection:{collection}")
            .SendAsync("entryCreated", new { collection, entry });

        if (!string.IsNullOrEmpty(tenantId))
        {
            await _hubContext.Clients.Group($"tenant:{tenantId}")
                .SendAsync("entryCreated", new { collection, entry });
        }
    }

    public async Task NotifyEntryUpdatedAsync(string collection, string id, Dictionary<string, object> entry, string? tenantId = null)
    {
        await _hubContext.Clients.Group($"entity:{collection}:{id}")
            .SendAsync("entryUpdated", new { collection, id, entry });

        await _hubContext.Clients.Group($"collection:{collection}")
            .SendAsync("entryUpdated", new { collection, id, entry });
    }

    public async Task NotifyStatusChangedAsync(string collection, string id, string status, string? tenantId = null)
    {
        await _hubContext.Clients.Group($"entity:{collection}:{id}")
            .SendAsync("statusChanged", new { collection, id, status });
    }

    public async Task NotifyUserActionAsync(string action, Dictionary<string, object> data)
    {
        await _hubContext.Clients.All.SendAsync("userAction", new { action, data });
    }
}
```

#### 6. Update DataController
```csharp
public class DataController : ControllerBase
{
    private readonly INotificationService _notificationService;

    [HttpPost]
    public async Task<IActionResult> Create(string collection, [FromBody] Dictionary<string, object> data)
    {
        var result = await _dataService.CreateAsync(collection, data);
        var entry = await _dataService.GetByIdAsync(collection, result.ToString());

        // Notify subscribers
        await _notificationService.NotifyEntryCreatedAsync(collection, entry);

        return Ok(entry);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string collection, string id, [FromBody] Dictionary<string, object> data)
    {
        var success = await _dataService.UpdateAsync(collection, id, data);
        if (success)
        {
            var entry = await _dataService.GetByIdAsync(collection, id);
            await _notificationService.NotifyEntryUpdatedAsync(collection, id, entry);
        }

        return success ? Ok() : NotFound();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string collection, string id)
    {
        var success = await _dataService.DeleteAsync(collection, id);
        if (success)
        {
            await _notificationService.NotifyEntryDeletedAsync(collection, id);
        }

        return success ? NoContent() : NotFound();
    }
}
```

#### 7. Update Program.cs
```csharp
builder.Services.AddSingleton<IConnectionManager, ConnectionManager>();
builder.Services.AddScoped<INotificationService, NotificationService>();
```

### Frontend Changes

#### 1. Install SignalR Client
```bash
cd frontend
npm install @microsoft/signalr
```

#### 2. Create SignalR Service
**File: `frontend/src/app/services/signalr.service.ts`**
```typescript
import { Injectable } from '@angular/core';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SignalRService {
  private hubConnection?: HubConnection;

  async start(): Promise<void> {
    if (this.hubConnection?.state === 'Connected') return;

    this.hubConnection = new HubConnectionBuilder()
      .withUrl(environment.hubUrl)
      .withAutomaticReconnect()
      .configureLogging(environment.production ? 'none' : 'debug')
      .build();

    await this.hubConnection.start();
    console.log('SignalR connected');
  }

  async stop(): Promise<void> {
    await this.hubConnection?.stop();
  }

  subscribeToCollection(collectionName: string): void {
    this.hubConnection?.invoke('SubscribeToCollection', collectionName);
  }

  unsubscribeFromCollection(collectionName: string): void {
    this.hubConnection?.invoke('UnsubscribeFromCollection', collectionName);
  }

  subscribeToEntity(collectionName: string, entityId: string): void {
    this.hubConnection?.invoke('SubscribeToEntity', collectionName, entityId);
  }

  onEntryCreated(callback: (data: any) => void): void {
    this.hubConnection?.on('entryCreated', callback);
  }

  onEntryUpdated(callback: (data: any) => void): void {
    this.hubConnection?.on('entryUpdated', callback);
  }

  onEntryDeleted(callback: (data: any) => void): void {
    this.hubConnection?.on('entryDeleted', callback);
  }

  onStatusChanged(callback: (data: any) => void): void {
    this.hubConnection?.on('statusChanged', callback);
  }

  removeListener(eventName: string): void {
    this.hubConnection?.off(eventName);
  }

  removeAllListeners(): void {
    this.hubConnection?.off('entryCreated');
    this.hubConnection?.off('entryUpdated');
    this.hubConnection?.off('entryDeleted');
    this.hubConnection?.off('statusChanged');
  }
}
```

#### 3. Update Data List Component
```typescript
@Component({
  selector: 'app-data-list',
  template: `
    <div class="data-list">
      <div class="connection-status">
        Status: {{ connectionStatus }}
      </div>

      <div class="data-items">
        @for (item of items; track item.id) {
          <div class="data-item">
            <!-- Item content -->
          </div>
        }
      </div>

      @if (notification) {
        <div class="notification">
          {{ notification }}
        </div>
      }
    </div>
  `,
  standalone: true
})
export class DataListComponent implements OnInit, OnDestroy {
  items: any[] = [];
  connectionStatus = 'Disconnected';
  notification: string | null = null;

  constructor(
    private signalRService: SignalRService,
    private dataService: DataService
  ) {}

  async ngOnInit() {
    await this.connectToHub();
    await this.loadItems();
  }

  async connectToHub() {
    try {
      await this.signalRService.start();
      this.connectionStatus = 'Connected';

      this.signalRService.subscribeToCollection(this.collectionName);

      this.signalRService.onEntryCreated((data) => {
        if (data.collection === this.collectionName) {
          this.items = [...this.items, data.entry];
          this.showNotification('Entry created');
        }
      });

      this.signalRService.onEntryUpdated((data) => {
        if (data.collection === this.collectionName) {
          const index = this.items.findIndex(i => i.id === data.id);
          if (index !== -1) {
            this.items[index] = data.entry;
            this.showNotification('Entry updated');
          }
        }
      });

      this.signalRService.onEntryDeleted((data) => {
        if (data.collection === this.collectionName) {
          this.items = this.items.filter(i => i.id !== data.id);
          this.showNotification('Entry deleted');
        }
      });

      this.signalRService.onStatusChanged((data) => {
        if (data.collection === this.collectionName) {
          const index = this.items.findIndex(i => i.id === data.id);
          if (index !== -1) {
            this.items[index].status = data.status;
            this.showNotification(`Status changed to ${data.status}`);
          }
        }
      });
    } catch (error) {
      console.error('SignalR connection failed:', error);
      this.connectionStatus = 'Failed';
    }
  }

  showNotification(message: string) {
    this.notification = message;
    setTimeout(() => this.notification = null, 3000);
  }

  ngOnDestroy() {
    this.signalRService.removeAllListeners();
    this.signalRService.stop();
  }
}
```

#### 4. Create Real-time Status Component
```typescript
@Component({
  selector: 'app-realtime-status',
  template: `
    <div class="realtime-status">
      <div [class]="['status-indicator', connectionState.toLowerCase()]">
        <span class="dot"></span>
        {{ connectionLabel }}
      </div>
      @if (lastUpdate) {
        <span>Last update: {{ lastUpdate | date:'mediumTime' }}</span>
      }
    </div>
  `,
  standalone: true
})
export class RealtimeStatusComponent implements OnInit {
  connectionState = 'Disconnected';
  connectionLabel = 'Disconnected';
  lastUpdate: Date | null = null;

  constructor(private signalRService: SignalRService) {}

  async ngOnInit() {
    await this.updateConnectionStatus();

    this.signalRService.onEntryCreated(() => this.updateLastUpdate());
    this.signalRService.onEntryUpdated(() => this.updateLastUpdate());
  }

  private async updateConnectionStatus() {
    const hub = this.signalRService as any;
    this.connectionState = hub.hubConnection?.state || 'Disconnected';

    switch (this.connectionState) {
      case 'Connected':
        this.connectionLabel = 'Live';
        break;
      case 'Reconnecting':
        this.connectionLabel = 'Reconnecting...';
        break;
      case 'Disconnected':
        this.connectionLabel = 'Disconnected';
        break;
    }
  }

  updateLastUpdate() {
    this.lastUpdate = new Date();
  }
}
```

## Dependencies

### Backend
```xml
<PackageReference Include="Microsoft.AspNetCore.SignalR" Version="9.0.0" />
```

### Frontend
```bash
npm install @microsoft/signalr
```

## Rollout Plan

1. **Phase 1**: Install and configure SignalR
2. **Phase 2**: Create CMS hub
3. **Phase 3**: Implement connection manager
4. **Phase 4**: Create notification service
5. **Phase 5**: Update controllers for notifications
6. **Phase 6**: Create SignalR service in frontend
7. **Phase 7**: Update components for real-time updates
8. **Phase 8**: Add connection status indicator
9. **Phase 9**: Add presence tracking
10. **Phase 10**: Add typing indicators

## Success Criteria

- SignalR hub configured
- Real-time entry updates working
- Real-time status changes working
- Connection status displayed
- Automatic reconnection working
- Users can subscribe to collections/entities
- Notifications displayed in UI
