# Webhooks System

## Overview
Implement a mechanism to send HTTP notifications to external services when specific events occur within the CMS (e.g., entry.create, entry.update, entry.delete).

## Priority: 4 (High)
Crucial for integrating the CMS with other systems in a modern tech stack. Essential for CDN cache purging, search index updates, and notifications.

## Implementation Plan

### Backend Changes

#### 1. Create Webhook Model
**File: `backend/src/Dynamo.CMS.API/Models/Webhook.cs`**
```csharp
public class Webhook
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string HttpMethod { get; set; } = "POST";
    public string[] Events { get; set; } = Array.Empty<string>();
    public Dictionary<string, string>? Headers { get; set; }
    public bool IsActive { get; set; } = true;
    public string? SecretKey { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? LastTriggeredAt { get; set; }
    public int SuccessCount { get; set; }
    public int FailureCount { get; set; }
    public string? LastError { get; set; }
}
```

#### 2. Create WebhookDelivery Model
**File: `backend/src/Dynamo.CMS.API/Models/WebhookDelivery.cs`**
```csharp
public class WebhookDelivery
{
    public int Id { get; set; }
    public int WebhookId { get; set; }
    public string Event { get; set; } = string.Empty;
    public string Payload { get; set; } = string.Empty;
    public int StatusCode { get; set; }
    public string Response { get; set; } = string.Empty;
    public bool IsSuccess { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTimeOffset SentAt { get; set; }
    public TimeSpan Duration { get; set; }
}
```

#### 3. Create WebhookEvent Enum
**File: `backend/src/Dynamo.CMS.API/Models/WebhookEvent.cs`**
```csharp
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
}
```

#### 4. Add Webhooks to DbContext
**File: `backend/src/Dynamo.CMS.API/Data/AppDbContext.cs`**
```csharp
public DbSet<Webhook> Webhooks { get; set; }
public DbSet<WebhookDelivery> WebhookDeliveries { get; set; }
```

#### 5. Create Migration
Create migration for Webhooks and WebhookDeliveries tables

#### 6. Create WebhookService
**File: `backend/src/Dynamo.CMS.API/Services/WebhookService.cs`**
```csharp
public interface IWebhookService
{
    Task<Webhook> CreateWebhookAsync(CreateWebhookDto dto);
    Task<Webhook?> GetWebhookAsync(int id);
    Task<IEnumerable<Webhook>> GetActiveWebhooksForEventAsync(string eventName);
    Task TriggerWebhooksAsync(string eventName, object payload);
    Task<Webhook> UpdateWebhookAsync(int id, UpdateWebhookDto dto);
    Task DeleteWebhookAsync(int id);
    Task<WebhookDelivery> CreateDeliveryAsync(Webhook webhook, string eventName, string payload);
    Task UpdateDeliveryStatusAsync(WebhookDelivery delivery, int statusCode, string response, string? error);
    Task<IEnumerable<WebhookDelivery>> GetWebhookDeliveriesAsync(int webhookId, int page = 1, int pageSize = 20);
}

public class WebhookService : IWebhookService
{
    private readonly AppDbContext _context;
    private readonly HttpClient _httpClient;
    private readonly ILogger<WebhookService> _logger;

    public async Task TriggerWebhooksAsync(string eventName, object payload)
    {
        var webhooks = await GetActiveWebhooksForEventAsync(eventName);

        var tasks = webhooks.Select(async webhook =>
        {
            try
            {
                await ExecuteWebhookAsync(webhook, eventName, payload);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to execute webhook {WebhookId}", webhook.Id);
            }
        });

        await Task.WhenAll(tasks);
    }

    private async Task ExecuteWebhookAsync(Webhook webhook, string eventName, object payload)
    {
        var webhookPayload = BuildWebhookPayload(eventName, payload);
        var delivery = await CreateDeliveryAsync(webhook, eventName, webhookPayload);

        var startTime = DateTimeOffset.UtcNow;

        try
        {
            var request = new HttpRequestMessage(new HttpMethod(webhook.HttpMethod), webhook.Url);
            request.Content = new StringContent(webhookPayload, Encoding.UTF8, "application/json");

            // Add custom headers
            if (webhook.Headers != null)
            {
                foreach (var header in webhook.Headers)
                {
                    request.Headers.Add(header.Key, header.Value);
                }
            }

            // Add signature header for verification
            if (!string.IsNullOrEmpty(webhook.SecretKey))
            {
                var signature = ComputeSignature(webhookPayload, webhook.SecretKey);
                request.Headers.Add("X-Webhook-Signature", signature);
            }

            var response = await _httpClient.SendAsync(request);
            var responseContent = await response.Content.ReadAsStringAsync();

            delivery.StatusCode = (int)response.StatusCode;
            delivery.Response = responseContent;
            delivery.IsSuccess = response.IsSuccessStatusCode;
            delivery.Duration = DateTimeOffset.UtcNow - startTime;

            if (response.IsSuccessStatusCode)
            {
                webhook.SuccessCount++;
                webhook.LastTriggeredAt = DateTimeOffset.UtcNow;
            }
            else
            {
                webhook.FailureCount++;
                webhook.LastError = $"HTTP {response.StatusCode}";
            }

            await UpdateDeliveryStatusAsync(delivery, delivery.StatusCode, responseContent, webhook.LastError);
        }
        catch (Exception ex)
        {
            webhook.FailureCount++;
            webhook.LastError = ex.Message;
            delivery.IsSuccess = false;
            delivery.ErrorMessage = ex.Message;
            delivery.Duration = DateTimeOffset.UtcNow - startTime;

            await UpdateDeliveryStatusAsync(delivery, 0, string.Empty, ex.Message);
            throw;
        }
        finally
        {
            await _context.SaveChangesAsync();
        }
    }

    private string BuildWebhookPayload(string eventName, object payload)
    {
        return JsonSerializer.Serialize(new
        {
            event_name = eventName,
            timestamp = DateTimeOffset.UtcNow.ToString("o"),
            data = payload
        });
    }

    private string ComputeSignature(string payload, string secret)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        return "sha256=" + Convert.ToHexString(hash).ToLowerInvariant();
    }
}
```

#### 7. Create WebhookController
**File: `backend/src/Dynamo.CMS.API/Controllers/WebhooksController.cs`**
```csharp
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class WebhooksController : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Webhook>>> GetWebhooks()
    {
        var webhooks = await _webhookService.GetAllWebhooksAsync();
        return Ok(webhooks);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Webhook>> GetWebhook(int id)
    {
        var webhook = await _webhookService.GetWebhookAsync(id);
        if (webhook == null) return NotFound();
        return Ok(webhook);
    }

    [HttpGet("{id}/deliveries")]
    public async Task<ActionResult<IEnumerable<WebhookDelivery>>> GetDeliveries(
        int id,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var deliveries = await _webhookService.GetWebhookDeliveriesAsync(id, page, pageSize);
        return Ok(deliveries);
    }

    [HttpPost]
    public async Task<ActionResult<Webhook>> CreateWebhook(CreateWebhookDto dto)
    {
        var webhook = await _webhookService.CreateWebhookAsync(dto);
        return CreatedAtAction(nameof(GetWebhook), new { id = webhook.Id }, webhook);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<Webhook>> UpdateWebhook(int id, UpdateWebhookDto dto)
    {
        var webhook = await _webhookService.UpdateWebhookAsync(id, dto);
        return Ok(webhook);
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteWebhook(int id)
    {
        await _webhookService.DeleteWebhookAsync(id);
        return NoContent();
    }

    [HttpPost("{id}/test")]
    public async Task<ActionResult> TestWebhook(int id)
    {
        await _webhookService.TestWebhookAsync(id);
        return Ok(new { message = "Webhook test sent" });
    }
}
```

#### 8. Integrate with DataController
**File: `backend/src/Dynamo.CMS.API/Controllers/DataController.cs`**
```csharp
public class DataController : ControllerBase
{
    private readonly IWebhookService _webhookService;

    [HttpPost]
    public async Task<IActionResult> Create(string collection, [FromBody] Dictionary<string, object> data)
    {
        // Create entry logic
        var result = await CreateEntryAsync(collection, data);

        // Trigger webhook
        await _webhookService.TriggerWebhooksAsync(WebhookEvents.EntryCreated, new
        {
            collection,
            id = result.Id,
            data
        });

        return Ok(result);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string collection, string id, [FromBody] Dictionary<string, object> data)
    {
        // Update entry logic
        var result = await UpdateEntryAsync(collection, id, data);

        // Trigger webhook
        await _webhookService.TriggerWebhooksAsync(WebhookEvents.EntryUpdated, new
        {
            collection,
            id,
            data
        });

        return Ok(result);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string collection, string id)
    {
        // Delete entry logic
        await DeleteEntryAsync(collection, id);

        // Trigger webhook
        await _webhookService.TriggerWebhooksAsync(WebhookEvents.EntryDeleted, new
        {
            collection,
            id
        });

        return NoContent();
    }
}
```

#### 9. Add Program Registration
**File: `backend/src/Dynamo.CMS.API/Program.cs`**
```csharp
builder.Services.AddHttpClient<IWebhookService, WebhookService>();
builder.Services.AddScoped<IWebhookService, WebhookService>();
```

### Frontend Changes

#### 1. Create Webhook Components
**File: `frontend/src/app/components/webhooks/webhook-list.component.ts`**
```typescript
@Component({
  selector: 'app-webhook-list',
  template: `
    <div class="webhook-list">
      <div class="header">
        <h2>Webhooks</h2>
        <button (click)="createWebhook()">Create Webhook</button>
      </div>

      <div class="webhooks">
        @for (webhook of webhooks; track webhook.id) {
          <div class="webhook-card">
            <div class="webhook-info">
              <h3>{{ webhook.name }}</h3>
              <p>{{ webhook.url }}</p>
              <span [class]="'status ' + (webhook.isActive ? 'active' : 'inactive')">
                {{ webhook.isActive ? 'Active' : 'Inactive' }}
              </span>
            </div>
            <div class="webhook-stats">
              <span>Success: {{ webhook.successCount }}</span>
              <span>Failures: {{ webhook.failureCount }}</span>
            </div>
            <div class="webhook-actions">
              <button (click)="editWebhook(webhook)">Edit</button>
              <button (click)="testWebhook(webhook)">Test</button>
              <button (click)="viewDeliveries(webhook)">Deliveries</button>
              <button (click)="deleteWebhook(webhook)">Delete</button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  standalone: true
})
export class WebhookListComponent implements OnInit {
  webhooks: Webhook[] = [];

  async ngOnInit() {
    this.webhooks = await this.webhookService.getWebhooks();
  }

  async testWebhook(webhook: Webhook) {
    await this.webhookService.testWebhook(webhook.id);
    this.messageService.success('Webhook test sent');
  }
}
```

#### 2. Create Webhook Form Component
**File: `frontend/src/app/components/webhooks/webhook-form.component.ts`**
```typescript
@Component({
  selector: 'app-webhook-form',
  template: `
    <form (ngSubmit)="saveWebhook()">
      <div class="form-group">
        <label>Name</label>
        <input [(ngModel)]="webhook.name" required>
      </div>

      <div class="form-group">
        <label>URL</label>
        <input [(ngModel)]="webhook.url" type="url" required>
      </div>

      <div class="form-group">
        <label>HTTP Method</label>
        <select [(ngModel)]="webhook.httpMethod">
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="PATCH">PATCH</option>
          <option value="DELETE">DELETE</option>
          <option value="GET">GET</option>
        </select>
      </div>

      <div class="form-group">
        <label>Events</label>
        <div class="events">
          @for (event of availableEvents; track event) {
            <label>
              <input type="checkbox" [(ngModel)]="selectedEvents" [value]="event">
              {{ event }}
            </label>
          }
        </div>
      </div>

      <div class="form-group">
        <label>Secret Key (Optional)</label>
        <input [(ngModel)]="webhook.secretKey" type="password">
        <small>Used to sign webhook payloads</small>
      </div>

      <div class="form-group">
        <label>Headers (Optional)</label>
        <div class="headers">
          @for (header of headers; track header.key) {
            <input [(ngModel)]="header.key" placeholder="Header name">
            <input [(ngModel)]="header.value" placeholder="Header value">
            <button type="button" (click)="removeHeader(index)">Remove</button>
          }
          <button type="button" (click)="addHeader()">Add Header</button>
        </div>
      </div>

      <div class="form-group">
        <label>
          <input type="checkbox" [(ngModel)]="webhook.isActive">
          Active
        </label>
      </div>

      <button type="submit">Save Webhook</button>
    </form>
  `,
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule]
})
export class WebhookFormComponent {
  webhook: Webhook = {};
  selectedEvents: string[] = [];
  headers: { key: string, value: string }[] = [];

  availableEvents = [
    WebhookEvents.EntryCreated,
    WebhookEvents.EntryUpdated,
    WebhookEvents.EntryDeleted,
    WebhookEvents.EntryPublished,
    WebhookEvents.EntryUnpublished,
    WebhookEvents.CollectionCreated,
    WebhookEvents.CollectionUpdated,
    WebhookEvents.CollectionDeleted,
    WebhookEvents.MediaUploaded,
    WebhookEvents.MediaDeleted,
    WebhookEvents.UserCreated,
    WebhookEvents.UserUpdated,
    WebhookEvents.UserDeleted
  ];

  async saveWebhook() {
    const dto: CreateWebhookDto = {
      ...this.webhook,
      events: this.selectedEvents,
      headers: Object.fromEntries(this.headers.filter(h => h.key && h.value).map(h => [h.key, h.value]))
    };

    await this.webhookService.createWebhook(dto);
    this.router.navigate(['/webhooks']);
  }

  addHeader() {
    this.headers.push({ key: '', value: '' });
  }

  removeHeader(index: number) {
    this.headers.splice(index, 1);
  }
}
```

#### 3. Create Webhook Deliveries Component
**File: `frontend/src/app/components/webhooks/webhook-deliveries.component.ts`**
```typescript
@Component({
  selector: 'app-webhook-deliveries',
  template: `
    <div class="deliveries">
      <h3>Webhook Deliveries</h3>
      <table>
        <thead>
          <tr>
            <th>Event</th>
            <th>Status</th>
            <th>Duration</th>
            <th>Sent At</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (delivery of deliveries; track delivery.id) {
            <tr>
              <td>{{ delivery.event }}</td>
              <td>
                <span [class]="'status ' + (delivery.isSuccess ? 'success' : 'failure')">
                  {{ delivery.isSuccess ? 'Success' : 'Failed' }}
                </span>
              </td>
              <td>{{ delivery.duration }}ms</td>
              <td>{{ delivery.sentAt | date:'medium' }}</td>
              <td>
                <button (click)="viewDetails(delivery)">View Details</button>
                @if (!delivery.isSuccess) {
                  <button (click)="retry(delivery)">Retry</button>
                }
              </td>
            </tr>
          }
        </tbody>
      </table>

      @if (selectedDelivery) {
        <div class="delivery-details">
          <h4>Delivery Details</h4>
          <div class="payload">
            <h5>Payload</h5>
            <pre>{{ selectedDelivery.payload }}</pre>
          </div>
          <div class="response">
            <h5>Response</h5>
            <pre>{{ selectedDelivery.response }}</pre>
          </div>
          @if (selectedDelivery.errorMessage) {
            <div class="error">
              <h5>Error</h5>
              <pre>{{ selectedDelivery.errorMessage }}</pre>
            </div>
          }
        </div>
      }
    </div>
  `,
  standalone: true
})
export class WebhookDeliveriesComponent implements OnInit {
  deliveries: WebhookDelivery[] = [];
  selectedDelivery: WebhookDelivery | null = null;

  async ngOnInit() {
    this.deliveries = await this.webhookService.getDeliveries(this.webhookId);
  }

  async retry(delivery: WebhookDelivery) {
    await this.webhookService.retryDelivery(delivery.id);
    this.loadDeliveries();
  }
}
```

#### 4. Add WebhookService
**File: `frontend/src/app/services/webhook.service.ts`**
```typescript
@Injectable({ providedIn: 'root' })
export class WebhookService {
  constructor(private http: HttpClient) {}

  getWebhooks(): Observable<Webhook[]> {
    return this.http.get<Webhook[]>('/api/webhooks');
  }

  createWebhook(dto: CreateWebhookDto): Observable<Webhook> {
    return this.http.post<Webhook>('/api/webhooks', dto);
  }

  updateWebhook(id: number, dto: UpdateWebhookDto): Observable<Webhook> {
    return this.http.put<Webhook>(`/api/webhooks/${id}`, dto);
  }

  deleteWebhook(id: number): Observable<void> {
    return this.http.delete<void>(`/api/webhooks/${id}`);
  }

  testWebhook(id: number): Observable<void> {
    return this.http.post<void>(`/api/webhooks/${id}/test`, {});
  }

  getDeliveries(webhookId: number, page = 1, pageSize = 20): Observable<WebhookDelivery[]> {
    return this.http.get<WebhookDelivery[]>(
      `/api/webhooks/${webhookId}/deliveries?page=${page}&pageSize=${pageSize}`
    );
  }

  retryDelivery(deliveryId: number): Observable<void> {
    return this.http.post<void>(`/api/webhook-deliveries/${deliveryId}/retry`, {});
  }
}
```

### Database Changes

#### Create Webhooks Table
```sql
CREATE TABLE webhooks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(2048) NOT NULL,
    http_method VARCHAR(10) NOT NULL DEFAULT 'POST',
    events JSONB NOT NULL DEFAULT '[]',
    headers JSONB,
    is_active BOOLEAN NOT NULL DEFAULT true,
    secret_key VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_triggered_at TIMESTAMPTZ,
    success_count INTEGER NOT NULL DEFAULT 0,
    failure_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT
);

CREATE INDEX idx_webhooks_events ON webhooks USING GIN(events);
CREATE INDEX idx_webhooks_active ON webhooks(is_active);
```

#### Create WebhookDeliveries Table
```sql
CREATE TABLE webhook_deliveries (
    id SERIAL PRIMARY KEY,
    webhook_id INTEGER NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event_name VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    status_code INTEGER,
    response TEXT,
    is_success BOOLEAN NOT NULL DEFAULT false,
    error_message TEXT,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    duration_ms INTEGER NOT NULL
);

CREATE INDEX idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_sent_at ON webhook_deliveries(sent_at DESC);
```

## API Changes

### New Endpoints

#### Webhook Management
```
GET    /api/webhooks
POST   /api/webhooks
GET    /api/webhooks/{id}
PUT    /api/webhooks/{id}
DELETE /api/webhooks/{id}
POST   /api/webhooks/{id}/test
```

#### Webhook Deliveries
```
GET    /api/webhooks/{id}/deliveries
POST   /api/webhook-deliveries/{id}/retry
```

## Testing

### Unit Tests
- Test webhook creation and validation
- Test signature computation
- Test payload building
- Test event filtering

### Integration Tests
- Test webhook delivery for various events
- Test retry logic for failed webhooks
- Test webhook filtering by events
- Test authentication with signature

## Dependencies

### Backend
- No new dependencies (uses built-in HttpClient)

### Frontend
- No new dependencies

## Considerations

1. **Retry Strategy**: Implement exponential backoff for failed deliveries
2. **Delivery Queue**: Use Hangfire for reliable webhook delivery
3. **Rate Limiting**: Prevent webhook spam to external services
4. **Timeouts**: Set reasonable timeouts for webhook requests
5. **Payload Size**: Limit webhook payload size to prevent issues
6. **Security**: Validate URLs to prevent SSRF attacks
7. **Signature Verification**: Provide documentation for signature verification
8. **Event Filtering**: Allow webhooks to subscribe to specific collections
9. **Bulk Events**: Support batch events to reduce webhook calls
10. **Web Versioning**: Maintain webhook API version compatibility

## Rollout Plan

1. **Phase 1**: Create webhook models and database tables
2. **Phase 2**: Implement WebhookService with delivery logic
3. **Phase 3**: Integrate webhook triggers in DataController
4. **Phase 4**: Create WebhookController and API endpoints
5. **Phase 5**: Build frontend webhook management UI
6. **Phase 6**: Add delivery history and retry functionality
7. **Phase 7**: Add signature verification and security features
8. **Phase 8**: Add retry queue with Hangfire
9. **Phase 9**: Add rate limiting and timeout configuration
10. **Phase 10**: Add webhook playground/documentation

## Success Criteria

- Users can create and manage webhooks
- Webhooks trigger on specified events
- Webhook deliveries are tracked with success/failure status
- Failed deliveries can be retried
- Webhook payloads are signed with secret key
- Delivery history is viewable in UI
- Webhook events can be filtered by collection
- Retry queue works reliably
- Rate limiting prevents webhook spam
