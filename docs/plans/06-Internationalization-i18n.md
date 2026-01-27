# Internationalization (i18n)

## Overview
Implement a system for creating and managing content in multiple languages, allowing users to define locales for their DataCollections and provide translations for each content entry.

## Priority: 6 (Medium)
Essential for any application targeting a global audience. Without i18n, the CMS is limited to single-language use cases.

## Implementation Plan

### Backend Changes

#### 1. Create Locale Model
**File: `backend/src/Dynamo.CMS.API/Models/Locale.cs`**
```csharp
public class Locale
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty; // e.g., "en", "en-US", "fr-FR"
    public string Name { get; set; } = string.Empty; // e.g., "English", "French"
    public bool IsDefault { get; set; }
    public bool IsActive { get; set; } = true;
    public string? FlagEmoji { get; set; }
}
```

#### 2. Create ContentTranslation Model
**File: `backend/src/Dynamo.CMS.API/Models/ContentTranslation.cs`**
```csharp
public class ContentTranslation
{
    public int Id { get; set; }
    public string CollectionName { get; set; } = string.Empty;
    public int EntryId { get; set; }
    public string LocaleCode { get; set; } = string.Empty;
    public Dictionary<string, object> TranslatedFields { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
}
```

#### 3. Update DataCollection Model
**File: `backend/src/Dynamo.CMS.API/Models/DataCollection.cs`**
```csharp
public class DataCollection
{
    // ... existing properties

    public bool EnableI18n { get; set; }
    public string[] AvailableLocales { get; set; } = Array.Empty<string>();
    public string DefaultLocale { get; set; } = "en";
    public string[] TranslatableFields { get; set; } = Array.Empty<string>();
}
```

#### 4. Add Locales to DbContext
**File: `backend/src/Dynamo.CMS.API/Data/AppDbContext.cs`**
```csharp
public DbSet<Locale> Locales { get; set; }
public DbSet<ContentTranslation> ContentTranslations { get; set; }
```

#### 5. Create Migration
Create migration for Locales and ContentTranslations tables

#### 6. Create LocalizationService
**File: `backend/src/Dynamo.CMS.API/Services/LocalizationService.cs`**
```csharp
public interface ILocalizationService
{
    Task<Locale> CreateLocaleAsync(CreateLocaleDto dto);
    Task<IEnumerable<Locale>> GetLocalesAsync();
    Task<Locale?> GetDefaultLocaleAsync();
    Task<ContentTranslation> CreateTranslationAsync(CreateTranslationDto dto);
    Task<ContentTranslation> UpdateTranslationAsync(int id, UpdateTranslationDto dto);
    Task<ContentTranslation?> GetTranslationAsync(string collection, int entryId, string localeCode);
    Task<IEnumerable<ContentTranslation>> GetEntryTranslationsAsync(string collection, int entryId);
    Task DeleteTranslationAsync(int id);
    Task<Dictionary<string, object>> GetLocalizedDataAsync(
        string collection,
        int entryId,
        string localeCode,
        Dictionary<string, object> baseData
    );
}

public class LocalizationService : ILocalizationService
{
    private readonly AppDbContext _context;

    public async Task<Dictionary<string, object>> GetLocalizedDataAsync(
        string collection,
        int entryId,
        string localeCode,
        Dictionary<string, object> baseData)
    {
        var translation = await GetTranslationAsync(collection, entryId, localeCode);

        if (translation == null)
        {
            // Return base data if no translation exists
            return baseData;
        }

        // Get collection to identify translatable fields
        var collectionInfo = await GetCollectionAsync(collection);

        if (collectionInfo == null || !collectionInfo.TranslatableFields.Any())
        {
            return baseData;
        }

        // Merge translated fields into base data
        var result = new Dictionary<string, object>(baseData);

        foreach (var field in collectionInfo.TranslatableFields)
        {
            if (translation.TranslatedFields.ContainsKey(field))
            {
                result[field] = translation.TranslatedFields[field];
            }
        }

        return result;
    }

    public async Task CreateTranslationAsync(CreateTranslationDto dto)
    {
        // Check if translation already exists
        var existing = await GetTranslationAsync(dto.CollectionName, dto.EntryId, dto.LocaleCode);
        if (existing != null)
        {
            throw new InvalidOperationException("Translation already exists");
        }

        var translation = new ContentTranslation
        {
            CollectionName = dto.CollectionName,
            EntryId = dto.EntryId,
            LocaleCode = dto.LocaleCode,
            TranslatedFields = dto.TranslatedFields,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedBy = dto.UserId
        };

        _context.ContentTranslations.Add(translation);
        await _context.SaveChangesAsync();
    }
}
```

#### 7. Update DataController
**File: `backend/src/Dynamo.CMS.API/Controllers/DataController.cs`**
```csharp
public class DataController : ControllerBase
{
    private readonly ILocalizationService _localizationService;

    [HttpGet("{collection}")]
    public async Task<IActionResult> GetAll(
        string collection,
        [FromQuery] string? locale = null)
    {
        var data = await _dataService.GetAllAsync(collection);

        if (!string.IsNullOrEmpty(locale))
        {
            // Apply localization
            var localizedData = new List<object>();
            foreach (var item in data)
            {
                var localized = await _localizationService.GetLocalizedDataAsync(
                    collection,
                    item.Id,
                    locale,
                    item
                );
                localizedData.Add(localized);
            }
            return Ok(localizedData);
        }

        return Ok(data);
    }

    [HttpGet("{collection}/{id}")]
    public async Task<IActionResult> GetById(
        string collection,
        string id,
        [FromQuery] string? locale = null)
    {
        var data = await _dataService.GetByIdAsync(collection, id);

        if (!string.IsNullOrEmpty(locale))
        {
            var localized = await _localizationService.GetLocalizedDataAsync(
                collection,
                int.Parse(id),
                locale,
                data
            );
            return Ok(localized);
        }

        return Ok(data);
    }
}
```

#### 8. Create LocaleController
**File: `backend/src/Dynamo.CMS.API/Controllers/LocalesController.cs`**
```csharp
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class LocalesController : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Locale>>> GetLocales()
    {
        var locales = await _localizationService.GetLocalesAsync();
        return Ok(locales);
    }

    [HttpGet("default")]
    public async Task<ActionResult<Locale>> GetDefaultLocale()
    {
        var locale = await _localizationService.GetDefaultLocaleAsync();
        return Ok(locale);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<Locale>> CreateLocale(CreateLocaleDto dto)
    {
        var locale = await _localizationService.CreateLocaleAsync(dto);
        return CreatedAtAction(nameof(GetLocales), new { id = locale.Id }, locale);
    }
}
```

#### 9. Create TranslationsController
**File: `backend/src/Dynamo.CMS.API/Controllers/TranslationsController.cs`**
```csharp
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TranslationsController : ControllerBase
{
    [HttpGet("{collection}/{entryId}")]
    public async Task<ActionResult<IEnumerable<ContentTranslation>>> GetEntryTranslations(
        string collection,
        int entryId)
    {
        var translations = await _localizationService.GetEntryTranslationsAsync(collection, entryId);
        return Ok(translations);
    }

    [HttpGet("{collection}/{entryId}/{localeCode}")]
    public async Task<ActionResult<ContentTranslation>> GetTranslation(
        string collection,
        int entryId,
        string localeCode)
    {
        var translation = await _localizationService.GetTranslationAsync(collection, entryId, localeCode);
        if (translation == null) return NotFound();
        return Ok(translation);
    }

    [HttpPost]
    public async Task<ActionResult<ContentTranslation>> CreateTranslation(CreateTranslationDto dto)
    {
        var translation = await _localizationService.CreateTranslationAsync(dto);
        return CreatedAtAction(nameof(GetTranslation), new {
            collection = dto.CollectionName,
            entryId = dto.EntryId,
            localeCode = dto.LocaleCode
        }, translation);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ContentTranslation>> UpdateTranslation(
        int id,
        UpdateTranslationDto dto)
    {
        var translation = await _localizationService.UpdateTranslationAsync(id, dto);
        return Ok(translation);
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteTranslation(int id)
    {
        await _localizationService.DeleteTranslationAsync(id);
        return NoContent();
    }
}
```

#### 10. Add Program Registration
**File: `backend/src/Dynamo.CMS.API/Program.cs`**
```csharp
builder.Services.AddScoped<ILocalizationService, LocalizationService>();
```

### Frontend Changes

#### 1. Install Angular i18n Libraries
```bash
cd frontend
npm install @angular/common
```

#### 2. Create I18nService
**File: `frontend/src/app/services/i18n.service.ts`**
```typescript
@Injectable({ providedIn: 'root' })
export class I18nService {
  private currentLocale = 'en';
  private defaultLocale = 'en';
  private availableLocales: Locale[] = [];

  constructor(private http: HttpClient) {
    this.loadLocales();
  }

  async loadLocales() {
    this.availableLocales = await firstValueFrom(this.http.get<Locale[]>('/api/locales'));
    const defaultLocale = await firstValueFrom(this.http.get<Locale>('/api/locales/default'));
    this.defaultLocale = defaultLocale.code;
    this.currentLocale = defaultLocale.code;
  }

  getLocales(): Locale[] {
    return this.availableLocales;
  }

  getCurrentLocale(): string {
    return this.currentLocale;
  }

  setCurrentLocale(locale: string) {
    this.currentLocale = locale;
    localStorage.setItem('preferredLocale', locale);
  }

  getDefaultLocale(): string {
    return this.defaultLocale;
  }

  async loadPreferredLocale() {
    const saved = localStorage.getItem('preferredLocale');
    if (saved && this.availableLocales.find(l => l.code === saved)) {
      this.currentLocale = saved;
    }
  }
}
```

#### 3. Create Locale Selector Component
**File: `frontend/src/app/components/shared/locale-selector.component.ts`**
```typescript
@Component({
  selector: 'app-locale-selector',
  template: `
    <div class="locale-selector">
      <select [(ngModel)]="selectedLocale" (change)="onLocaleChange()">
        @for (locale of locales; track locale.code) {
          <option [value]="locale.code">
            {{ locale.flagEmoji }} {{ locale.name }}
            @if (locale.isDefault) {
              (Default)
            }
          </option>
        }
      </select>
    </div>
  `,
  standalone: true
})
export class LocaleSelectorComponent implements OnInit {
  locales: Locale[] = [];
  selectedLocale = 'en';

  constructor(private i18nService: I18nService) {}

  async ngOnInit() {
    await this.i18nService.loadLocales();
    await this.i18nService.loadPreferredLocale();
    this.locales = this.i18nService.getLocales();
    this.selectedLocale = this.i18nService.getCurrentLocale();
  }

  onLocaleChange() {
    this.i18nService.setCurrentLocale(this.selectedLocale);
    // Emit event or reload data
    this.localeChange.emit(this.selectedLocale);
  }

  @Output() localeChange = new EventEmitter<string>();
}
```

#### 4. Create Translation Editor Component
**File: `frontend/src/app/components/shared/translation-editor.component.ts`**
```typescript
@Component({
  selector: 'app-translation-editor',
  template: `
    <div class="translation-editor">
      <div class="header">
        <h3>Translations</h3>
        <select [(ngModel)]="selectedLocale">
          @for (locale of availableLocales; track locale.code) {
            <option [value]="locale.code">{{ locale.name }}</option>
          }
        </select>
      </div>

      <div class="translations-list">
        @for (locale of availableLocales; track locale.code) {
          <div [class]="'translation-card ' + (locale.code === selectedLocale ? 'active' : '')">
            <div class="locale-info">
              <span>{{ locale.flagEmoji }} {{ locale.name }}</span>
              @if (translations[locale.code]) {
                <span class="status translated">Translated</span>
              } @else {
                <span class="status missing">Missing</span>
              }
            </div>

            @if (locale.code === selectedLocale) {
              <form class="translation-form">
                @for (field of translatableFields; track field) {
                  <div class="form-group">
                    <label>{{ field }}</label>
                    <textarea
                      [(ngModel)]="currentTranslation[field]"
                      [placeholder]="getBaseValue(field)"
                      rows="3">
                    </textarea>
                  </div>
                }
                <button type="button" (click)="saveTranslation()">Save Translation</button>
              </form>
            }
          </div>
        }
      </div>
    </div>
  `,
  standalone: true
})
export class TranslationEditorComponent {
  @Input() collection: string;
  @Input() entryId: number;
  @Input() baseData: Dictionary<string, any>;
  @Input() translatableFields: string[];
  @Input() availableLocales: Locale[];

  selectedLocale = 'en';
  translations: Dictionary<string, any> = {};
  currentTranslation: Dictionary<string, any> = {};

  async ngOnInit() {
    await this.loadTranslations();
  }

  async loadTranslations() {
    const translations = await firstValueFrom(
      this.http.get<ContentTranslation[]>(`/api/translations/${this.collection}/${this.entryId}`)
    );

    translations.forEach(t => {
      this.translations[t.localeCode] = t.translatedFields;
    });

    if (this.availableLocales.length > 0) {
      this.selectedLocale = this.availableLocales[0].code;
      this.loadCurrentTranslation();
    }
  }

  loadCurrentTranslation() {
    this.currentTranslation = this.translations[this.selectedLocale] || {};
  }

  getBaseValue(field: string): string {
    return this.baseData[field] || '';
  }

  async saveTranslation() {
    const dto: CreateTranslationDto = {
      collectionName: this.collection,
      entryId: this.entryId,
      localeCode: this.selectedLocale,
      translatedFields: this.currentTranslation,
      userId: this.userService.getCurrentUserId()
    };

    await firstValueFrom(this.http.post('/api/translations', dto));
    this.messageService.success('Translation saved');
    this.loadTranslations();
  }
}
```

#### 5. Update Data Service to Support Locale
**File: `frontend/src/app/services/data.service.ts`**
```typescript
@Injectable({ providedIn: 'root' })
export class DataService {
  constructor(
    private http: HttpClient,
    private i18nService: I18nService
  ) {}

  getAll(collection: string, params?: any): Observable<any[]> {
    const locale = this.i18nService.getCurrentLocale();
    return this.http.get<any[]>(`/api/data/${collection}`, {
      params: { ...params, locale }
    });
  }

  getById(collection: string, id: string): Observable<any> {
    const locale = this.i18nService.getCurrentLocale();
    return this.http.get<any>(`/api/data/${collection}/${id}`, {
      params: { locale }
    });
  }
}
```

#### 6. Update Data Entry Form
**File: `frontend/src/app/components/data/data-entry.component.ts`**
- Add translation editor when i18n is enabled for collection
- Show translation status for each locale

```typescript
@Component({
  template: `
    <div class="data-entry">
      <app-locale-selector (localeChange)="onLocaleChange()"></app-locale-selector>

      @if (collection.enableI18n) {
        <app-translation-editor
          [collection]="collection.name"
          [entryId]="entry.id"
          [baseData]="entry.data"
          [translatableFields]="collection.translatableFields"
          [availableLocales]="availableLocales">
        </app-translation-editor>
      }

      <!-- Rest of form -->
    </div>
  `
})
export class DataEntryComponent implements OnInit {
  collection: DataCollection;
  availableLocales: Locale[] = [];

  async ngOnInit() {
    this.collection = await this.loadCollection();
    this.availableLocales = await firstValueFrom(this.http.get<Locale[]>('/api/locales'));
  }

  onLocaleChange(locale: string) {
    this.loadEntry();
  }
}
```

#### 7. Update Collection Form
**File: `frontend/src/app/components/collections/collection-form.component.ts`**
- Add checkbox to enable i18n
- Add locale selector for available locales
- Add field selector for translatable fields

```typescript
@Component({
  template: `
    <form (ngSubmit)="saveCollection()">
      <div class="form-group">
        <label>
          <input type="checkbox" [(ngModel)]="collection.enableI18n" name="enableI18n">
          Enable Internationalization
        </label>
      </div>

      @if (collection.enableI18n) {
        <div class="form-group">
          <label>Available Locales</label>
          <div class="locales">
            @for (locale of availableLocales; track locale.code) {
              <label>
                <input type="checkbox" [(ngModel)]="selectedLocales" [value]="locale.code">
                {{ locale.flagEmoji }} {{ locale.name }}
              </label>
            }
          </div>
        </div>

        <div class="form-group">
          <label>Default Locale</label>
          <select [(ngModel)]="collection.defaultLocale">
            @for (locale of selectedLocales; track locale) {
              <option [value]="locale">{{ locale }}</option>
            }
          </select>
        </div>

        <div class="form-group">
          <label>Translatable Fields</label>
          <div class="fields">
            @for (field of collection.columns; track field.name) {
              <label>
                <input type="checkbox" [(ngModel)]="collection.translatableFields" [value]="field.name">
                {{ field.name }}
              </label>
            }
          </div>
        </div>
      }
    </form>
  `
})
export class CollectionFormComponent {
  collection: DataCollection = {};
  availableLocales: Locale[] = [];
  selectedLocales: string[] = [];

  async ngOnInit() {
    this.availableLocales = await firstValueFrom(this.http.get<Locale[]>('/api/locales'));
  }
}
```

### Database Changes

#### Create Locales Table
```sql
CREATE TABLE locales (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    flag_emoji VARCHAR(10),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_locales_code ON locales(code);
CREATE INDEX idx_locales_active ON locales(is_active);

-- Insert default locale
INSERT INTO locales (code, name, is_default, flag_emoji)
VALUES ('en', 'English', true, '🇺🇸');
```

#### Create ContentTranslations Table
```sql
CREATE TABLE content_translations (
    id SERIAL PRIMARY KEY,
    collection_name VARCHAR(255) NOT NULL,
    entry_id INTEGER NOT NULL,
    locale_code VARCHAR(10) NOT NULL REFERENCES locales(code) ON DELETE CASCADE,
    translated_fields JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255),
    UNIQUE(collection_name, entry_id, locale_code)
);

CREATE INDEX idx_content_translations_collection_entry ON content_translations(collection_name, entry_id);
CREATE INDEX idx_content_translations_locale ON content_translations(locale_code);
CREATE INDEX idx_content_translations_fields ON content_translations USING GIN(translated_fields);
```

#### Add I18n Configuration to DataCollections
```sql
ALTER TABLE data_collections
ADD COLUMN enable_i18n BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN available_locales JSONB DEFAULT '["en"]',
ADD COLUMN default_locale VARCHAR(10) DEFAULT 'en',
ADD COLUMN translatable_fields JSONB DEFAULT '[]';
```

## API Changes

### New Endpoints

#### Locales
```
GET    /api/locales
POST   /api/locales
GET    /api/locales/default
```

#### Translations
```
GET    /api/translations/{collection}/{entryId}
GET    /api/translations/{collection}/{entryId}/{localeCode}
POST   /api/translations
PUT    /api/translations/{id}
DELETE /api/translations/{id}
```

### Updated Endpoints

#### Data Endpoints with Locale Support
```
GET /api/data/{collection}?locale=fr
GET /api/data/{collection}/{id}?locale=es
```

## Testing

### Unit Tests
- Test locale creation and validation
- Test translation creation and updates
- Test localized data merging logic
- Test fallback to default locale

### Integration Tests
- Test complete i18n workflow
- Test multiple translations per entry
- Test locale switching
- Test missing translations fallback

## Dependencies

### Backend
- No new dependencies required

### Frontend
- No new dependencies (uses built-in Angular i18n)

## Considerations

1. **Fallback Strategy**: Always fall back to default locale if translation missing
2. **Partial Translations**: Allow partial field translations
3. **Translation Status**: Track which translations are complete
4. **Bulk Translation**: Support bulk translation operations
5. **Translation Import/Export**: Allow import/export of translations (CSV, JSON, XLIFF)
6. **Auto-Translation**: Consider integrating with translation APIs
7. **Validation**: Validate locale codes against standard ISO 639-1
8. **Performance**: Consider caching translated content
9. **Database Indexing**: Proper indexing for translation queries
10. **Search**: Support searching across all locales

## Rollout Plan

1. **Phase 1**: Create locale and translation models
2. **Phase 2**: Implement LocalizationService
3. **Phase 3**: Add locale endpoints and controllers
4. **Phase 4**: Update DataController to support locale parameter
5. **Phase 5**: Create frontend locale selector
6. **Phase 6**: Build translation editor component
7. **Phase 7**: Update collection form for i18n configuration
8. **Phase 8**: Add bulk import/export functionality
9. **Phase 9**: Add translation status tracking
10. **Phase 10**: Add auto-translation integration

## Success Criteria

- Users can define multiple locales per collection
- Content can be translated to different languages
- API returns localized content based on locale parameter
- Frontend allows locale switching
- Translation editor for managing translations
- Fallback to default locale when translation missing
- Translation import/export functionality
- Translation status tracking
