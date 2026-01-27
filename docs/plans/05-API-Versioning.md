# API Versioning

## Overview
Implement a formal API versioning strategy to manage changes and breaking updates to the API without disrupting existing client applications.

## Priority: 5 (High)
Essential for long-term API maintainability and provides a clear contract for API consumers.

## Implementation Plan

### Backend Changes

#### 1. Install API Versioning Package
**File: `backend/src/Dynamo.CMS.API/Dynamo.CMS.API.csproj`**
```xml
<PackageReference Include="Microsoft.AspNetCore.Mvc.Versioning" Version="8.0.0" />
<PackageReference Include="Microsoft.AspNetCore.Mvc.Versioning.ApiExplorer" Version="8.0.0" />
```

#### 2. Configure API Versioning
**File: `backend/src/Dynamo.CMS.API/Program.cs`**
```csharp
builder.Services.AddApiVersioning(options =>
{
    options.DefaultApiVersion = new ApiVersion(1, 0);
    options.AssumeDefaultVersionWhenUnspecified = true;
    options.ReportApiVersions = true;
    options.ApiVersionReader = ApiVersionReader.Combine(
        new UrlSegmentApiVersionReader(),
        new HeaderApiVersionReader("X-API-Version"),
        new QueryStringApiVersionReader("version")
    );
});

builder.Services.AddVersionedApiExplorer(options =>
{
    options.GroupNameFormat = "'v'VVV";
    options.SubstituteApiVersionInUrl = true;
});
```

#### 3. Update DataController with Versioning
**File: `backend/src/Dynamo.CMS.API/Controllers/DataController.cs`**
```csharp
[ApiController]
[Route("api/v{version:apiVersion}/[controller]")]
[ApiVersion("1.0")]
[ApiVersion("2.0")]
public class DataController : ControllerBase
{
    [HttpGet("{collection}")]
    [MapToApiVersion("1.0")]
    public async Task<IActionResult> GetAllV1(string collection)
    {
        // V1 implementation - returns all fields
        var data = await _dataService.GetAllAsync(collection);
        return Ok(data);
    }

    [HttpGet("{collection}")]
    [MapToApiVersion("2.0")]
    public async Task<IActionResult> GetAllV2(
        string collection,
        [FromQuery] string[]? fields = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        // V2 implementation - supports field selection and pagination
        var data = await _dataService.GetAllAsync(collection, fields, page, pageSize);
        return Ok(data);
    }
}
```

#### 4. Create Versioned Controllers Structure
**File: `backend/src/Dynamo.CMS.API/Controllers/V1/DataController.cs`**
```csharp
namespace Dynamo.CMS.API.Controllers.V1
{
    [ApiController]
    [Route("api/v1/[controller]")]
    [ApiVersion("1.0")]
    public class DataController : ControllerBase
    {
        // V1 specific implementation
    }
}
```

**File: `backend/src/Dynamo.CMS.API/Controllers/V2/DataController.cs`**
```csharp
namespace Dynamo.CMS.API.Controllers.V2
{
    [ApiController]
    [Route("api/v2/[controller]")]
    [ApiVersion("2.0")]
    public class DataController : ControllerBase
    {
        // V2 specific implementation with improvements
    }
}
```

#### 5. Update Swagger Configuration
**File: `backend/src/Dynamo.CMS.API/Program.cs`**
```csharp
builder.Services.AddSwaggerGen(options =>
{
    // Add version-specific swagger docs
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Dynamo CMS API v1",
        Version = "v1",
        Description = "API v1 - Legacy version"
    });

    options.SwaggerDoc("v2", new OpenApiInfo
    {
        Title = "Dynamo CMS API v2",
        Version = "v2",
        Description = "API v2 - Current version with improvements"
    });

    // Add API version parameter to operations
    options.OperationFilter<ApiVersionOperationFilter>();

    // Add JWT authentication
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

// In app.UseSwaggerUI
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/openapi/v1.json", "API v1");
    options.SwaggerEndpoint("/openapi/v2.json", "API v2");
});
```

#### 6. Create ApiVersionOperationFilter
**File: `backend/src/Dynamo.CMS.API/Extensions/ApiVersionOperationFilter.cs`**
```csharp
public class ApiVersionOperationFilter : IOperationFilter
{
    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        var apiVersion = context.ApiDescription.GetApiVersion();
        if (apiVersion == null) return;

        var parameters = operation.Parameters ?? new List<OpenApiParameter>();

        // Add version parameter if not present
        if (!parameters.Any(p => p.Name == "version"))
        {
            parameters.Add(new OpenApiParameter
            {
                Name = "version",
                In = ParameterLocation.Query,
                Description = "API version",
                Required = false,
                Schema = new OpenApiSchema { Type = "string", Default = new OpenApiString(apiVersion.ToString()) }
            });
        }

        operation.Parameters = parameters;
    }
}
```

#### 7. Version Deprecation Support
```csharp
[ApiVersion("1.0", Deprecated = true)]
[ApiVersion("2.0")]
public class DataController : ControllerBase
{
    // V1 is deprecated but still supported
}
```

#### 8. Add API Version Policy
```csharp
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("RequireApiVersion", policy =>
    {
        policy.RequireAuthenticatedUser();
        // Add version-specific policies if needed
    });
});
```

### Frontend Changes

#### 1. Update API Service
**File: `frontend/src/app/services/api.service.ts`**
```typescript
@Injectable({ providedIn: 'root' })
export class ApiService {
  private apiVersion = 'v2'; // Default to latest stable version
  private baseUrl = '/api';

  constructor(private http: HttpClient) {}

  private getUrl(endpoint: string, version?: string): string {
    const v = version || this.apiVersion;
    return `${this.baseUrl}/${v}/${endpoint}`;
  }

  get<T>(endpoint: string, params?: any, version?: string): Observable<T> {
    const url = this.getUrl(endpoint, version);
    return this.http.get<T>(url, { params });
  }

  post<T>(endpoint: string, body: any, version?: string): Observable<T> {
    const url = this.getUrl(endpoint, version);
    return this.http.post<T>(url, body);
  }

  put<T>(endpoint: string, body: any, version?: string): Observable<T> {
    const url = this.getUrl(endpoint, version);
    return this.http.put<T>(url, body);
  }

  delete<T>(endpoint: string, version?: string): Observable<T> {
    const url = this.getUrl(endpoint, version);
    return this.http.delete<T>(url);
  }

  setApiVersion(version: string) {
    this.apiVersion = version;
  }

  getApiVersion(): string {
    return this.apiVersion;
  }
}
```

#### 2. Create Version Selector Component
**File: `frontend/src/app/components/shared/api-version-selector.component.ts`**
```typescript
@Component({
  selector: 'app-api-version-selector',
  template: `
    <div class="version-selector">
      <label>API Version</label>
      <select [(ngModel)]="selectedVersion" (change)="onVersionChange()">
        <option *ngFor="let version of versions" [value]="version.value">
          {{ version.label }}
          @if (version.deprecated) {
            (Deprecated)
          }
        </option>
      </select>
      @if (selectedVersionInfo?.deprecated) {
        <span class="warning">This version is deprecated</span>
      }
    </div>
  `,
  standalone: true
})
export class ApiVersionSelectorComponent {
  versions = [
    { value: 'v1', label: 'Version 1.0', deprecated: true },
    { value: 'v2', label: 'Version 2.0', deprecated: false }
  ];

  selectedVersion = 'v2';

  constructor(private apiService: ApiService) {
    this.apiService.setApiVersion(this.selectedVersion);
  }

  onVersionChange() {
    this.apiService.setApiVersion(this.selectedVersion);
    // Optionally reload data with new version
    this.messageService.warning(`API version changed to ${this.selectedVersion}. Some features may not be available.`);
  }

  get selectedVersionInfo() {
    return this.versions.find(v => v.value === this.selectedVersion);
  }
}
```

#### 3. Add Version-Specific Data Services
**File: `frontend/src/app/services/data-v1.service.ts`**
```typescript
@Injectable({ providedIn: 'root' })
export class DataV1Service extends DataService {
  constructor(apiService: ApiService) {
    super(apiService);
  }

  // Override methods for V1 specific behavior
  override getAll(collection: string, params?: any): Observable<any[]> {
    return super.getAll(collection, params, 'v1');
  }
}
```

**File: `frontend/src/app/services/data-v2.service.ts`**
```typescript
@Injectable({ providedIn: 'root' })
export class DataV2Service extends DataService {
  constructor(apiService: ApiService) {
    super(apiService);
  }

  // V2 specific features
  getAllWithFields(collection: string, fields: string[], page = 1, pageSize = 20): Observable<PaginatedResponse> {
    return this.apiService.get<PaginatedResponse>(
      `data/${collection}`,
      { fields: fields.join(','), page, pageSize },
      'v2'
    );
  }
}
```

#### 4. Add Version Warning Banner
**File: `frontend/src/app/components/shared/version-warning-banner.component.ts`**
```typescript
@Component({
  selector: 'app-version-warning-banner',
  template: `
    @if (showWarning) {
      <div class="version-warning">
        <span class="icon">⚠️</span>
        <span>You are using API version {{ currentVersion }} which is deprecated.</span>
        <button (click)="upgradeVersion()">Upgrade to {{ latestVersion }}</button>
        <button class="dismiss" (click)="dismiss()">Dismiss</button>
      </div>
    }
  `,
  standalone: true
})
export class VersionWarningBannerComponent {
  currentVersion = 'v1';
  latestVersion = 'v2';
  showWarning = true;

  constructor(private apiService: ApiService) {
    this.currentVersion = apiService.getApiVersion();
  }

  upgradeVersion() {
    this.apiService.setApiVersion(this.latestVersion);
    window.location.reload();
  }

  dismiss() {
    this.showWarning = false;
    localStorage.setItem('versionWarningDismissed', 'true');
  }
}
```

#### 5. Update App Configuration
**File: `frontend/src/app/app.config.ts`**
```typescript
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    // Version-specific providers
    { provide: 'API_VERSION', useValue: 'v2' }
  ]
};
```

### Database Changes

No database changes required. API versioning is managed at the application layer.

## API Changes

### Versioned Endpoints

#### Version 1
```
GET    /api/v1/data/{collection}
POST   /api/v1/data/{collection}
GET    /api/v1/data/{collection}/{id}
PUT    /api/v1/data/{collection}/{id}
DELETE /api/v1/data/{collection}/{id}
```

#### Version 2
```
GET    /api/v2/data/{collection}?fields=id,name&pages=1&pageSize=20
POST   /api/v2/data/{collection}
GET    /api/v2/data/{collection}/{id}
PUT    /api/v2/data/{collection}/{id}
DELETE /api/v2/data/{collection}/{id}
PATCH  /api/v2/data/{collection}/{id}  // New: Partial updates
```

### Version Selection Methods

#### URL Path (Preferred)
```
GET /api/v1/data/posts
GET /api/v2/data/posts
```

#### Query String
```
GET /api/data/posts?version=v1
GET /api/data/posts?version=v2
```

#### Header
```
GET /api/data/posts
X-API-Version: v1
```

## Breaking Changes Management

### Version 2 Changes (Example)
1. **Field Selection**: Support partial response fields
2. **Pagination**: Added page/pageSize parameters
3. **PATCH Method**: Added for partial updates
4. **Response Format**: Changed array response to include metadata

### Deprecation Policy
- Deprecate old versions 6 months before removal
- Send warnings to API clients using deprecated versions
- Provide migration guide for breaking changes

## Testing

### Unit Tests
- Test version routing
- Test version-specific controller logic
- Test version parameter parsing

### Integration Tests
- Test each API version independently
- Test version selection methods
- Test backward compatibility

## Dependencies

### Backend
- `Microsoft.AspNetCore.Mvc.Versioning` 8.0.0
- `Microsoft.AspNetCore.Mvc.Versioning.ApiExplorer` 8.0.0

### Frontend
- No new dependencies

## Considerations

1. **Default Version**: Always default to latest stable version
2. **Deprecation Period**: Allow at least 6 months deprecation notice
3. **Documentation**: Maintain separate docs for each version
4. **Monitoring**: Track usage of each API version
5. **Sunset Policy**: Clear communication before removing versions
6. **Testing**: Automated tests for all supported versions
7. **Performance**: Ensure old versions don't impact performance
8. **Feature Parity**: Consider which features to include in each version
9. **Client Libraries**: Update SDK for each version if applicable
10. **Migration Guide**: Provide clear migration paths between versions

## Rollout Plan

1. **Phase 1**: Install and configure API versioning package
2. **Phase 2**: Add version attributes to existing controllers
3. **Phase 3**: Create V2 controllers with new features
4. **Phase 4**: Update Swagger to show multiple versions
5. **Phase 5**: Add version selector in frontend
6. **Phase 6**: Update API services to support version selection
7. **Phase 7**: Add deprecation warnings for V1
8. **Phase 8**: Create migration documentation
9. **Phase 9**: Monitor V1 usage and plan sunsetting
10. **Phase 10**: Remove V1 after deprecation period

## Success Criteria

- API supports multiple versions simultaneously
- Clients can select version via URL, header, or query parameter
- Old API versions continue to work without breaking changes
- New features can be added to latest version without affecting old versions
- Swagger documents each version separately
- Frontend allows version switching
- Deprecation warnings shown to clients using old versions
- Version usage is tracked and monitored
- Migration guides provided for breaking changes
- Clear sunset policy for version removal
