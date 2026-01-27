# Plugin System

## Overview
Create an architecture that allows third-party developers to extend the CMS functionality with plugins.

## Priority: 10 (Medium)
Fosters a community and allows the CMS to evolve beyond the core team's capacity.

## Implementation Plan

### Backend Changes

#### 1. Create Plugin Interface
**File: `backend/src/Dynamo.CMS.API/Plugins/IPlugin.cs`**
```csharp
public interface IPlugin
{
    string Name { get; }
    string Version { get; }
    string Description { get; }
    string Author { get; }
    Task InitializeAsync(IServiceCollection services);
    Task OnStartupAsync();
    Task OnShutdownAsync();
}

public interface IFieldTypePlugin : IPlugin
{
    BaseType FieldType { get; }
    Type ValidationType { get; }
    Task<object?> ValidateAsync(object? value);
    string GetPostgresType();
}

public interface IControllerPlugin : IPlugin
{
    void MapControllers(IEndpointRouteBuilder endpoints);
}

public interface IServicePlugin : IPlugin
{
    void RegisterServices(IServiceCollection services);
}
```

#### 2. Create Plugin Manifest
**File: `backend/src/Dynamo.CMS.API/Plugins/PluginManifest.cs`**
```csharp
public class PluginManifest
{
    public string Name { get; set; } = string.Empty;
    public string Version { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Author { get; set; } = string.Empty;
    public string EntryPoint { get; set; } = string.Empty;
    public string[] Dependencies { get; set; } = Array.Empty<string>();
    public Dictionary<string, string> Permissions { get; set; } = new();
    public DateTime InstalledAt { get; set; }
    public bool IsActive { get; set; }
}
```

#### 3. Create Plugin Loader
**File: `backend/src/Dynamo.CMS.API/Services/PluginLoader.cs`**
```csharp
public interface IPluginLoader
{
    Task LoadPluginsAsync();
    Task<IEnumerable<IPlugin>> GetPluginsAsync();
    Task<IPlugin?> GetPluginAsync(string name);
    Task EnablePluginAsync(string name);
    Task DisablePluginAsync(string name);
    Task InstallPluginAsync(string pluginPath);
    Task UninstallPluginAsync(string name);
}

public class PluginLoader : IPluginLoader
{
    private readonly List<IPlugin> _loadedPlugins = new();

    public async Task LoadPluginsAsync()
    {
        var pluginPath = Path.Combine(Directory.GetCurrentDirectory(), "Plugins");

        if (!Directory.Exists(pluginPath)) return;

        var manifestFiles = Directory.GetFiles(pluginPath, "plugin.json", SearchOption.AllDirectories);

        foreach (var manifestFile in manifestFiles)
        {
            var manifest = await LoadManifestAsync(manifestFile);
            if (manifest == null || !manifest.IsActive) continue;

            var assembly = LoadPluginAssembly(manifestFile);
            if (assembly == null) continue;

            var pluginType = assembly.GetType(manifest.EntryPoint);
            if (pluginType == null) continue;

            var plugin = (IPlugin?)Activator.CreateInstance(pluginType);
            if (plugin == null) continue;

            _loadedPlugins.Add(plugin);
            await plugin.InitializeAsync(null);
            await plugin.OnStartupAsync();
        }
    }

    private Assembly? LoadPluginAssembly(string manifestPath)
    {
        var pluginDir = Path.GetDirectoryName(manifestPath);
        var dllFiles = Directory.GetFiles(pluginDir!, "*.dll")
            .Where(f => !f.EndsWith("Microsoft.dll") && !f.EndsWith("System.dll"));

        if (!dllFiles.Any()) return null;

        var mainDll = dllFiles.FirstOrDefault(f => Path.GetFileNameWithoutExtension(f).EndsWith("Plugin"));
        if (mainDll == null) return null;

        return Assembly.LoadFrom(mainDll);
    }
}
```

#### 4. Create Plugin Manager Service
**File: `backend/src/Dynamo.CMS.API/Services/PluginManager.cs`**
```csharp
public interface IPluginManager
{
    Task<PluginManifest> CreatePluginAsync(CreatePluginDto dto);
    Task<PluginManifest> UpdatePluginManifestAsync(string name, UpdatePluginManifestDto dto);
    Task<IEnumerable<PluginManifest>> GetPluginsAsync();
    Task<PluginManifest?> GetPluginManifestAsync(string name);
    Task DeletePluginAsync(string name);
}

public class PluginManager : IPluginManager
{
    private readonly AppDbContext _context;

    public async Task<PluginManifest> CreatePluginAsync(CreatePluginDto dto)
    {
        var pluginDir = Path.Combine(Directory.GetCurrentDirectory(), "Plugins", dto.Name);

        if (Directory.Exists(pluginDir))
            throw new InvalidOperationException("Plugin already exists");

        Directory.CreateDirectory(pluginDir);

        var manifest = new PluginManifest
        {
            Name = dto.Name,
            Version = dto.Version,
            Description = dto.Description,
            Author = dto.Author,
            EntryPoint = dto.EntryPoint,
            Dependencies = dto.Dependencies,
            InstalledAt = DateTime.UtcNow,
            IsActive = false
        };

        var manifestPath = Path.Combine(pluginDir, "plugin.json");
        await File.WriteAllTextAsync(manifestPath, JsonSerializer.Serialize(manifest, new JsonSerializerOptions { WriteIndented = true }));

        return manifest;
    }
}
```

#### 5. Create Plugin Controller
**File: `backend/src/Dynamo.CMS.API/Controllers/PluginsController.cs`**
```csharp
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class PluginsController : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<PluginManifest>>> GetPlugins()
    {
        var plugins = await _pluginManager.GetPluginsAsync();
        return Ok(plugins);
    }

    [HttpPost]
    public async Task<ActionResult<PluginManifest>> CreatePlugin(CreatePluginDto dto)
    {
        var plugin = await _pluginManager.CreatePluginAsync(dto);
        return CreatedAtAction(nameof(GetPlugins), new { name = plugin.Name }, plugin);
    }

    [HttpPost("{name}/enable")]
    public async Task<ActionResult> EnablePlugin(string name)
    {
        await _pluginLoader.EnablePluginAsync(name);
        return Ok();
    }

    [HttpPost("{name}/disable")]
    public async Task<ActionResult> DisablePlugin(string name)
    {
        await _pluginLoader.DisablePluginAsync(name);
        return Ok();
    }

    [HttpDelete("{name}")]
    public async Task<ActionResult> DeletePlugin(string name)
    {
        await _pluginManager.DeletePluginAsync(name);
        return NoContent();
    }
}
```

#### 6. Update Program.cs
```csharp
builder.Services.AddSingleton<IPluginLoader, PluginLoader>();
builder.Services.AddScoped<IPluginManager, PluginManager>();

var app = builder.Build();

// Load plugins on startup
using (var scope = app.Services.CreateScope())
{
    var pluginLoader = scope.ServiceProvider.GetRequiredService<IPluginLoader>();
    await pluginLoader.LoadPluginsAsync();
}
```

### Frontend Changes

#### 1. Create Plugin Manager Component
**File: `frontend/src/app/components/plugins/plugin-manager.component.ts`**
```typescript
@Component({
  selector: 'app-plugin-manager',
  template: `
    <div class="plugin-manager">
      <div class="header">
        <h2>Plugins</h2>
        <button (click)="installPlugin()">Install Plugin</button>
      </div>

      <div class="plugins-list">
        @for (plugin of plugins; track plugin.name) {
          <div class="plugin-card">
            <div class="plugin-info">
              <h3>{{ plugin.name }} v{{ plugin.version }}</h3>
              <p>{{ plugin.description }}</p>
              <span>Author: {{ plugin.author }}</span>
            </div>
            <div class="plugin-status">
              <span [class]="'status ' + (plugin.isActive ? 'active' : 'inactive')">
                {{ plugin.isActive ? 'Active' : 'Inactive' }}
              </span>
            </div>
            <div class="plugin-actions">
              @if (plugin.isActive) {
                <button (click)="disablePlugin(plugin.name)">Disable</button>
              } @else {
                <button (click)="enablePlugin(plugin.name)">Enable</button>
              }
              <button (click)="configurePlugin(plugin.name)">Configure</button>
              <button class="danger" (click)="deletePlugin(plugin.name)">Delete</button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  standalone: true
})
export class PluginManagerComponent implements OnInit {
  plugins: PluginManifest[] = [];

  async ngOnInit() {
    await this.loadPlugins();
  }

  async loadPlugins() {
    this.plugins = await this.pluginService.getPlugins();
  }

  async enablePlugin(name: string) {
    await this.pluginService.enablePlugin(name);
    await this.loadPlugins();
  }

  async disablePlugin(name: string) {
    await this.pluginService.disablePlugin(name);
    await this.loadPlugins();
  }

  async deletePlugin(name: string) {
    if (confirm('Are you sure you want to delete this plugin?')) {
      await this.pluginService.deletePlugin(name);
      await this.loadPlugins();
    }
  }
}
```

#### 2. Create Plugin Service
**File: `frontend/src/app/services/plugin.service.ts`**
```typescript
@Injectable({ providedIn: 'root' })
export class PluginService {
  constructor(private http: HttpClient) {}

  getPlugins(): Observable<PluginManifest[]> {
    return this.http.get<PluginManifest[]>('/api/plugins');
  }

  enablePlugin(name: string): Observable<void> {
    return this.http.post<void>(`/api/plugins/${name}/enable`, {});
  }

  disablePlugin(name: string): Observable<void> {
    return this.http.post<void>(`/api/plugins/${name}/disable`, {});
  }

  deletePlugin(name: string): Observable<void> {
    return this.http.delete<void>(`/api/plugins/${name}`);
  }
}
```

#### 3. Create Plugin Installer Component
**File: `frontend/src/app/components/plugins/plugin-installer.component.ts`**
```typescript
@Component({
  selector: 'app-plugin-installer',
  template: `
    <div class="plugin-installer">
      <h2>Install Plugin</h2>

      <form (ngSubmit)="install()">
        <div class="form-group">
          <label>Upload Plugin ZIP</label>
          <input type="file" (change)="onFileSelect($event)">
        </div>

        <div class="form-group">
          <label>Plugin Name</label>
          <input [(ngModel)]="name" required>
        </div>

        <div class="form-group">
          <label>Version</label>
          <input [(ngModel)]="version" required>
        </div>

        <div class="form-group">
          <label>Description</label>
          <textarea [(ngModel)]="description"></textarea>
        </div>

        <button type="submit">Install</button>
      </form>
    </div>
  `,
  standalone: true
})
export class PluginInstallerComponent {
  file: File | null = null;
  name = '';
  version = '1.0.0';
  description = '';

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    this.file = input.files?.[0] || null;
  }

  async install() {
    if (!this.file) return;

    const formData = new FormData();
    formData.append('file', this.file);
    formData.append('name', this.name);
    formData.append('version', this.version);
    formData.append('description', this.description);

    await this.pluginService.install(formData).toPromise();
    this.messageService.success('Plugin installed successfully');
    this.router.navigate(['/plugins']);
  }
}
```

## Rollout Plan

1. **Phase 1**: Create plugin interfaces and models
2. **Phase 2**: Implement plugin loader
3. **Phase 3**: Create plugin manager service
4. **Phase 4**: Create plugin controller
5. **Phase 5**: Build plugin manager UI
6. **Phase 6**: Create plugin installer
7. **Phase 7**: Add plugin examples
8. **Phase 8**: Create plugin marketplace integration
9. **Phase 9**: Add plugin documentation
10. **Phase 10**: Add plugin testing framework

## Success Criteria

- Plugin system architecture defined
- Plugins can be loaded dynamically
- Plugin manager UI functional
- Plugin installation working
- Enable/disable plugins working
- Plugin marketplace integration
- Plugin examples provided
