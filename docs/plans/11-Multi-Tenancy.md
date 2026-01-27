# Multi-Tenancy

## Overview
Architect the system to support multiple, isolated tenants (different customers or projects) on a single instance.

## Priority: 11 (Medium)
Key requirement for SaaS applications, allowing efficient resource utilization.

## Implementation Plan

### Backend Changes

#### 1. Create Tenant Model
**File: `backend/src/Dynamo.CMS.API/Models/Tenant.cs`**
```csharp
public class Tenant
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Domain { get; set; }
    public string? Subdomain { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public TenantSettings Settings { get; set; } = new();
}

public class TenantSettings
{
    public string? Theme { get; set; }
    public string? Logo { get; set; }
    public string? PrimaryColor { get; set; }
    public Dictionary<string, string> CustomSettings { get; set; } = new();
}
```

#### 2. Create TenantUser Model
**File: `backend/src/Dynamo.CMS.API/Models/TenantUser.cs`**
```csharp
public class TenantUser
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Role { get; set; } = "User";
    public DateTime JoinedAt { get; set; }

    public Tenant Tenant { get; set; } = null!;
    public User User { get; set; } = null!;
}
```

#### 3. Create Multi-Tenancy Middleware
**File: `backend/src/Dynamo.CMS.API/Middleware/TenantResolutionMiddleware.cs`**
```csharp
public class TenantResolutionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ITenantService _tenantService;

    public async Task InvokeAsync(HttpContext context)
    {
        var tenant = await ResolveTenantAsync(context);

        if (tenant == null || !tenant.IsActive)
        {
            context.Response.StatusCode = StatusCodes.Status404NotFound;
            await context.Response.WriteAsJsonAsync(new { error = "Tenant not found" });
            return;
        }

        context.Items["Tenant"] = tenant;
        await _next(context);
    }

    private async Task<Tenant?> ResolveTenantAsync(HttpContext context)
    {
        // Try domain-based resolution
        var host = context.Request.Host.Host;
        var tenant = await _tenantService.GetByDomainAsync(host);

        // Try subdomain-based resolution
        if (tenant == null)
        {
            var parts = host.Split('.');
            if (parts.Length > 2)
            {
                var subdomain = parts[0];
                tenant = await _tenantService.GetBySubdomainAsync(subdomain);
            }
        }

        // Try header-based resolution
        if (tenant == null)
        {
            var tenantId = context.Request.Headers["X-Tenant-Id"].FirstOrDefault();
            if (!string.IsNullOrEmpty(tenantId))
            {
                tenant = await _tenantService.GetByIdAsync(int.Parse(tenantId));
            }
        }

        // Try query parameter (for dev/testing)
        if (tenant == null)
        {
            var tenantSlug = context.Request.Query["tenant"].FirstOrDefault();
            if (!string.IsNullOrEmpty(tenantSlug))
            {
                tenant = await _tenantService.GetBySlugAsync(tenantSlug);
            }
        }

        return tenant;
    }
}
```

#### 4. Create Tenant Service
**File: `backend/src/Dynamo.CMS.API/Services/ITenantService.cs`**
```csharp
public interface ITenantService
{
    Task<Tenant?> GetByIdAsync(int id);
    Task<Tenant?> GetBySlugAsync(string slug);
    Task<Tenant?> GetByDomainAsync(string domain);
    Task<Tenant?> GetBySubdomainAsync(string subdomain);
    Task<Tenant> CreateTenantAsync(CreateTenantDto dto);
    Task<Tenant> UpdateTenantAsync(int id, UpdateTenantDto dto);
    Task DeleteTenantAsync(int id);
    Task<IEnumerable<TenantUser>> GetTenantUsersAsync(int tenantId);
    Task AddUserToTenantAsync(int tenantId, string userId, string role = "User");
    Task RemoveUserFromTenantAsync(int tenantId, string userId);
    Task<Tenant?> GetCurrentTenantAsync();
}

public class TenantService : ITenantService
{
    private readonly AppDbContext _context;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public async Task<Tenant?> GetCurrentTenantAsync()
    {
        var context = _httpContextAccessor.HttpContext;
        return context?.Items["Tenant"] as Tenant;
    }
}
```

#### 5. Update DbContext for Multi-Tenancy
**File: `backend/src/Dynamo.CMS.API/Data/AppDbContext.cs`**
```csharp
public class AppDbContext : DbContext
{
    public DbSet<Tenant> Tenants { get; set; }
    public DbSet<TenantUser> TenantUsers { get; set; }

    private readonly ITenantService _tenantService;

    public AppDbContext(DbContextOptions<AppDbContext> options, ITenantService tenantService)
        : base(options)
    {
        _tenantService = tenantService;
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Tenant>()
            .HasIndex(t => t.Slug)
            .IsUnique();

        modelBuilder.Entity<Tenant>()
            .HasIndex(t => t.Domain)
            .IsUnique();

        modelBuilder.Entity<Tenant>()
            .HasIndex(t => t.Subdomain);

        // Add tenant filter to multi-tenant entities
        modelBuilder.Entity<DataCollection>()
            .HasQueryFilter(c => c.TenantId == _tenantService.GetCurrentTenantId());

        modelBuilder.Entity<Media>()
            .HasQueryFilter(m => m.TenantId == _tenantService.GetCurrentTenantId());
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var tenant = await _tenantService.GetCurrentTenantAsync();

        foreach (var entry in ChangeTracker.Entries<IMultiTenantEntity>())
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.TenantId = tenant?.Id;
            }
        }

        return await base.SaveChangesAsync(cancellationToken);
    }
}

public interface IMultiTenantEntity
{
    public int TenantId { get; set; }
}
```

#### 6. Update Models for Multi-Tenancy
```csharp
public class DataCollection : IMultiTenantEntity
{
    public int TenantId { get; set; }
    // ... existing properties
}

public class Media : IMultiTenantEntity
{
    public int TenantId { get; set; }
    // ... existing properties
}

public class User : IMultiTenantEntity
{
    public int TenantId { get; set; }
    // ... existing properties
}
```

#### 7. Create Tenant Controller
**File: `backend/src/Dynamo.CMS.API/Controllers/TenantsController.cs`**
```csharp
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class TenantsController : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Tenant>>> GetTenants()
    {
        var tenants = await _tenantService.GetAllTenantsAsync();
        return Ok(tenants);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Tenant>> GetTenant(int id)
    {
        var tenant = await _tenantService.GetByIdAsync(id);
        if (tenant == null) return NotFound();
        return Ok(tenant);
    }

    [HttpPost]
    public async Task<ActionResult<Tenant>> CreateTenant(CreateTenantDto dto)
    {
        var tenant = await _tenantService.CreateTenantAsync(dto);
        return CreatedAtAction(nameof(GetTenant), new { id = tenant.Id }, tenant);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<Tenant>> UpdateTenant(int id, UpdateTenantDto dto)
    {
        var tenant = await _tenantService.UpdateTenantAsync(id, dto);
        return Ok(tenant);
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteTenant(int id)
    {
        await _tenantService.DeleteTenantAsync(id);
        return NoContent();
    }

    [HttpGet("{id}/users")]
    public async Task<ActionResult<IEnumerable<TenantUser>>> GetTenantUsers(int id)
    {
        var users = await _tenantService.GetTenantUsersAsync(id);
        return Ok(users);
    }

    [HttpPost("{id}/users")]
    public async Task<ActionResult> AddUserToTenant(int id, AddUserDto dto)
    {
        await _tenantService.AddUserToTenantAsync(id, dto.UserId, dto.Role);
        return Ok();
    }

    [HttpDelete("{id}/users/{userId}")]
    public async Task<ActionResult> RemoveUserFromTenant(int id, string userId)
    {
        await _tenantService.RemoveUserFromTenantAsync(id, userId);
        return Ok();
    }
}
```

#### 8. Update Program.cs
```csharp
builder.Services.AddScoped<ITenantService, TenantService>();

app.UseMiddleware<TenantResolutionMiddleware>();
```

### Frontend Changes

#### 1. Update API Service for Multi-Tenancy
```typescript
@Injectable({ providedIn: 'root' })
export class ApiService {
  private tenantSlug: string | null = null;

  constructor() {
    this.loadTenantFromUrl();
  }

  loadTenantFromUrl() {
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    if (parts.length > 2) {
      this.tenantSlug = parts[0];
    }
  }

  setTenant(tenantSlug: string) {
    this.tenantSlug = tenantSlug;
    localStorage.setItem('tenant', tenantSlug);
  }

  getTenant(): string | null {
    if (!this.tenantSlug) {
      this.tenantSlug = localStorage.getItem('tenant');
    }
    return this.tenantSlug;
  }

  private getBaseUrl(): string {
    const tenant = this.getTenant();
    if (tenant) {
      return `/api/v2/data?tenant=${tenant}`;
    }
    return '/api/v2/data';
  }
}
```

#### 2. Create Tenant Selector Component
```typescript
@Component({
  selector: 'app-tenant-selector',
  template: `
    <div class="tenant-selector">
      <label>Current Tenant</label>
      <select [(ngModel)]="selectedTenant" (change)="onTenantChange()">
        @for (tenant of tenants; track tenant.id) {
          <option [value]="tenant.slug">{{ tenant.name }}</option>
        }
      </select>
    </div>
  `,
  standalone: true
})
export class TenantSelectorComponent implements OnInit {
  tenants: Tenant[] = [];
  selectedTenant = '';

  async ngOnInit() {
    this.tenants = await this.tenantService.getTenants();
    const current = this.tenantService.getTenant();
    this.selectedTenant = current || this.tenants[0]?.slug || '';
  }

  onTenantChange() {
    this.tenantService.setTenant(this.selectedTenant);
    window.location.reload();
  }
}
```

#### 3. Create Tenant Management Component
```typescript
@Component({
  selector: 'app-tenant-manager',
  template: `
    <div class="tenant-manager">
      <div class="header">
        <h2>Tenants</h2>
        <button (click)="createTenant()">Create Tenant</button>
      </div>

      <div class="tenants-grid">
        @for (tenant of tenants; track tenant.id) {
          <div class="tenant-card">
            <h3>{{ tenant.name }}</h3>
            <p>Slug: {{ tenant.slug }}</p>
            <span [class]="'status ' + (tenant.isActive ? 'active' : 'inactive')">
              {{ tenant.isActive ? 'Active' : 'Inactive' }}
            </span>
            <div class="actions">
              <button (click)="editTenant(tenant)">Edit</button>
              <button (click)="manageUsers(tenant)">Manage Users</button>
              <button (click)="deleteTenant(tenant)">Delete</button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  standalone: true
})
export class TenantManagerComponent implements OnInit {
  tenants: Tenant[] = [];

  async ngOnInit() {
    await this.loadTenants();
  }

  async loadTenants() {
    this.tenants = await this.tenantService.getTenants();
  }
}
```

## Rollout Plan

1. **Phase 1**: Create tenant models
2. **Phase 2**: Implement tenant resolution middleware
3. **Phase 3**: Create tenant service
4. **Phase 4**: Update models for multi-tenancy
5. **Phase 5**: Add tenant filtering to DbContext
6. **Phase 6**: Create tenant controller
7. **Phase 7**: Update frontend for multi-tenancy
8. **Phase 8**: Add tenant isolation testing
9. **Phase 9**: Add tenant settings
10. **Phase 10**: Add tenant analytics

## Success Criteria

- Multiple tenants can coexist
- Tenant resolution works via domain/subdomain/header
- Data is properly isolated between tenants
- Tenant management UI functional
- Users can be assigned to tenants
- Tenant-specific settings working
