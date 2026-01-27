# AI-Powered Features

## Overview
Integrate with external AI services to provide intelligent features like auto-tagging, alt-text generation, and content summarization.

## Priority: 15 (Low)
Adds significant value by automating tedious tasks and improving SEO.

## Implementation Plan

### Backend Changes

#### 1. Install AI SDKs
```xml
<PackageReference Include="Azure.AI.OpenAI" Version="2.1.0" />
<PackageReference Include="Azure.AI.Vision.ImageAnalysis" Version="1.0.0" />
<PackageReference Include="OpenAI" Version="1.0.0" />
```

#### 2. Create AI Service Interface
**File: `backend/src/Dynamo.CMS.API/Services/AI/IAIService.cs`**
```csharp
public interface IAIService
{
    // Content Analysis
    Task<List<string>> GenerateTagsAsync(string content, int count = 5);
    Task<string> SummarizeContentAsync(string content, int maxWords = 100);

    // Image Analysis
    Task<string> GenerateImageAltTextAsync(string imageUrl);
    Task<List<string>> DetectImageObjectsAsync(string imageUrl);
    Task<string> ExtractTextFromImageAsync(string imageUrl);

    // Content Generation
    Task<string> GenerateTitleAsync(string content);
    Task<string> GenerateDescriptionAsync(string content);
    Task<string> GenerateExcerptAsync(string content, int maxLength = 200);
}
```

#### 3. Create OpenAI Service
**File: `backend/src/Dynamo.CMS.API/Services/AI/OpenAIService.cs`**
```csharp
public class OpenAIService : IAIService
{
    private readonly OpenAIClient _client;
    private readonly string _model;

    public OpenAIService(IConfiguration configuration)
    {
        _client = new OpenAIClient(configuration["OpenAI:ApiKey"]);
        _model = configuration["OpenAI:Model"] ?? "gpt-4";
    }

    public async Task<List<string>> GenerateTagsAsync(string content, int count = 5)
    {
        var response = await _client.Chat.Completions.CreateAsync(new ChatCompletionCreateOptions
        {
            Model = _model,
            Messages = new[]
            {
                new ChatMessage(ChatRole.System,
                    "You are a content tagging assistant. Generate relevant tags from the content."),
                new ChatMessage(ChatRole.User,
                    $"Generate {count} relevant tags for this content:\n\n{content}")
            },
            Temperature = 0.7f,
            MaxTokens = 100
        });

        var content = response.Choices[0].Message.Content;
        return content?.Split(',', StringSplitOptions.RemoveEmptyEntries)
            .Select(t => t.Trim())
            .Where(t => !string.IsNullOrEmpty(t))
            .ToList() ?? new List<string>();
    }

    public async Task<string> SummarizeContentAsync(string content, int maxWords = 100)
    {
        var response = await _client.Chat.Completions.CreateAsync(new ChatCompletionCreateOptions
        {
            Model = _model,
            Messages = new[]
            {
                new ChatMessage(ChatRole.System,
                    "You are a content summarization assistant. Create concise summaries."),
                new ChatMessage(ChatRole.User,
                    $"Summarize this content in approximately {maxWords} words:\n\n{content}")
            },
            Temperature = 0.5f,
            MaxTokens = 200
        });

        return response.Choices[0].Message.Content ?? "";
    }

    public async Task<string> GenerateTitleAsync(string content)
    {
        var response = await _client.Chat.Completions.CreateAsync(new ChatCompletionCreateOptions
        {
            Model = _model,
            Messages = new[]
            {
                new ChatMessage(ChatRole.System,
                    "You are a content title generator. Create catchy, descriptive titles."),
                new ChatMessage(ChatRole.User,
                    $"Generate a title for this content:\n\n{content}")
            },
            Temperature = 0.8f,
            MaxTokens = 50
        });

        return response.Choices[0].Message.Content ?? "";
    }
}
```

#### 4. Create Azure Computer Vision Service
**File: `backend/src/Dynamo.CMS.API/Services/AI/AzureVisionService.cs`**
```csharp
public class AzureVisionService : IAIService
{
    private readonly ImageAnalysisClient _visionClient;

    public AzureVisionService(IConfiguration configuration)
    {
        var endpoint = configuration["Azure:Vision:Endpoint"];
        var credential = new AzureKeyCredential(configuration["Azure:Vision:ApiKey"]);
        _visionClient = new ImageAnalysisClient(new Uri(endpoint), credential);
    }

    public async Task<string> GenerateImageAltTextAsync(string imageUrl)
    {
        var options = new ImageAnalysisOptions
        {
            VisualFeatures = VisualFeatures.Caption | VisualFeatures.Description
        };

        var result = await _visionClient.AnalyzeAsync(new Uri(imageUrl), options);

        var caption = result.Caption?.Text ?? "";
        var confidence = result.Caption?.Confidence ?? 0;

        if (confidence > 0.7)
        {
            return caption;
        }

        // Add more detailed description if caption is weak
        var description = result.Description?.Captions
            .OrderByDescending(c => c.Confidence)
            .FirstOrDefault()?.Text ?? "";

        return !string.IsNullOrEmpty(description) ? description : caption;
    }

    public async Task<List<string>> DetectImageObjectsAsync(string imageUrl)
    {
        var options = new ImageAnalysisOptions
        {
            VisualFeatures = VisualFeatures.Objects | VisualFeatures.Tags
        };

        var result = await _visionClient.AnalyzeAsync(new Uri(imageUrl), options);

        var objects = result.Objects?.Select(o => o.Name).ToList() ?? new List<string>();
        var tags = result.Tags?.Where(t => t.Confidence > 0.8)
            .Select(t => t.Name)
            .ToList() ?? new List<string>();

        return objects.Union(tags).Distinct().ToList();
    }
}
```

#### 5. Create AI Processing Service
**File: `backend/src/Dynamo.CMS.API/Services/AI/AIProcessingService.cs`**
```csharp
public interface IAIProcessingService
{
    Task ProcessContentAsync(string collection, int entryId);
    Task ProcessMediaAsync(int mediaId);
    Task<AIAnalysisResult> AnalyzeContentAsync(string content);
}

public class AIProcessingService : IAIProcessingService
{
    private readonly IAIService _aiService;
    private readonly AppDbContext _context;

    public async Task<AIAnalysisResult> AnalyzeContentAsync(string content)
    {
        var tagsTask = _aiService.GenerateTagsAsync(content);
        var summaryTask = _aiService.SummarizeContentAsync(content);
        var titleTask = _aiService.GenerateTitleAsync(content);
        var descriptionTask = _aiService.GenerateDescriptionAsync(content);

        await Task.WhenAll(tagsTask, summaryTask, titleTask, descriptionTask);

        return new AIAnalysisResult
        {
            Tags = await tagsTask,
            Summary = await summaryTask,
            Title = await titleTask,
            Description = await descriptionTask
        };
    }

    public async Task ProcessContentAsync(string collection, int entryId)
    {
        var entry = await _context.GetDataEntryAsync(collection, entryId);
        if (entry == null) return;

        var content = GetContentFromEntry(entry);
        var analysis = await AnalyzeContentAsync(content);

        // Update entry with AI-generated content
        if (analysis.Tags.Any())
        {
            entry["tags"] = analysis.Tags;
        }

        if (!string.IsNullOrEmpty(analysis.Summary))
        {
            entry["summary"] = analysis.Summary;
        }

        if (!string.IsNullOrEmpty(analysis.Description))
        {
            entry["description"] = analysis.Description;
        }

        await _context.SaveChangesAsync();
    }

    public async Task ProcessMediaAsync(int mediaId)
    {
        var media = await _context.Media.FindAsync(mediaId);
        if (media == null) return;

        var altText = await _aiService.GenerateImageAltTextAsync(media.Url);
        var objects = await _aiService.DetectImageObjectsAsync(media.Url);

        media.AltText = altText;

        if (media.Metadata == null)
        {
            media.Metadata = new Dictionary<string, string>();
        }

        media.Metadata["detectedObjects"] = JsonSerializer.Serialize(objects);

        await _context.SaveChangesAsync();
    }
}

public record AIAnalysisResult(
    List<string> Tags,
    string Summary,
    string Title,
    string Description
);
```

#### 6. Update MediaLibraryController
```csharp
public class MediaLibraryController : ControllerBase
{
    private readonly IAIProcessingService _aiProcessingService;

    [HttpPost("upload")]
    public async Task<ActionResult<Media>> UploadMedia(
        IFormFile file,
        [FromQuery] bool generateAltText = true,
        [FromQuery] bool detectObjects = true)
    {
        // ... upload logic ...

        var media = await SaveMediaAsync(file);

        // Process with AI
        if (generateAltText && file.ContentType.StartsWith("image/"))
        {
            await _aiProcessingService.ProcessMediaAsync(media.Id);
        }

        return Ok(media);
    }

    [HttpPost("{id}/regenerate-alt-text")]
    public async Task<ActionResult> RegenerateAltText(int id)
    {
        await _aiProcessingService.ProcessMediaAsync(id);
        return Ok();
    }
}
```

#### 7. Update DataController
```csharp
public class DataController : ControllerBase
{
    private readonly IAIProcessingService _aiProcessingService;

    [HttpPost("{id}/ai-analyze")]
    [Authorize]
    public async Task<ActionResult> AnalyzeContent(string collection, string id)
    {
        await _aiProcessingService.ProcessContentAsync(collection, int.Parse(id));
        return Ok(new { message = "AI analysis complete" });
    }

    [HttpPost("batch/ai-analyze")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> BatchAnalyze(string collection)
    {
        var entries = await _context.GetDataEntriesAsync(collection);

        foreach (var entry in entries)
        {
            await _aiProcessingService.ProcessContentAsync(collection, entry.Id);
        }

        return Ok(new { analyzed = entries.Count });
    }
}
```

#### 8. Create AI Config Controller
```csharp
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class AIConfigController : ControllerBase
{
    [HttpGet]
    public ActionResult<AIConfig> GetConfig()
    {
        var config = new AIConfig
        {
            Provider = _configuration["AI:Provider"],
            Model = _configuration["OpenAI:Model"],
            Enabled = _configuration.GetValue<bool>("AI:Enabled", false),
            AutoTagging = _configuration.GetValue<bool>("AI:AutoTagging", false),
            AltTextGeneration = _configuration.GetValue<bool>("AI:AltTextGeneration", false)
        };

        return Ok(config);
    }

    [HttpPut]
    public async Task<ActionResult> UpdateConfig(AIConfig config)
    {
        // Update configuration
        _configuration["AI:Provider"] = config.Provider;
        _configuration["OpenAI:Model"] = config.Model;
        _configuration["AI:Enabled"] = config.Enabled.ToString();
        _configuration["AI:AutoTagging"] = config.AutoTagging.ToString();
        _configuration["AI:AltTextGeneration"] = config.AltTextGeneration.ToString();

        return Ok(new { message = "AI configuration updated" });
    }
}

public class AIConfig
{
    public string Provider { get; set; } = "OpenAI";
    public string Model { get; set; } = "gpt-4";
    public bool Enabled { get; set; }
    public bool AutoTagging { get; set; }
    public bool AltTextGeneration { get; set; }
}
```

#### 9. Update Program.cs
```csharp
builder.Services.AddSingleton<IAIService, OpenAIService>();
builder.Services.AddScoped<IAIProcessingService, AIProcessingService>();
```

### Frontend Changes

#### 1. Create AI Features Component
```typescript
@Component({
  selector: 'app-ai-features',
  template: `
    <div class="ai-features">
      <h2>AI Features</h2>

      <div class="ai-config">
        <h3>AI Configuration</h3>
        <label>
          <input type="checkbox" [(ngModel)]="config.enabled">
          Enable AI Features
        </label>
        <label>
          <input type="checkbox" [(ngModel)]="config.autoTagging">
          Auto-Tagging
        </label>
        <label>
          <input type="checkbox" [(ngModel)]="config.altTextGeneration">
          Alt-Text Generation
        </label>
        <label>
          Model
          <select [(ngModel)]="config.model">
            <option value="gpt-4">GPT-4</option>
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
          </select>
        </label>
        <button (click)="saveConfig()">Save Configuration</button>
      </div>

      <div class="ai-tools">
        <h3>AI Tools</h3>
        <button (click)="generateTags()">Generate Tags</button>
        <button (click)="generateSummary()">Generate Summary</button>
        <button (click)="generateTitle()">Generate Title</button>
        <button (click)="generateDescription()">Generate Description</button>
      </div>

      @if (generatedContent) {
        <div class="generated-content">
          <h4>Generated Content</h4>
          @if (generatedContent.tags?.length) {
            <div>
              <label>Tags</label>
              <div class="tags">
                @for (tag of generatedContent.tags; track tag) {
                  <span class="tag">{{ tag }}</span>
                }
              </div>
            </div>
          }
          @if (generatedContent.summary) {
            <div>
              <label>Summary</label>
              <p>{{ generatedContent.summary }}</p>
            </div>
          }
          @if (generatedContent.title) {
            <div>
              <label>Title</label>
              <p>{{ generatedContent.title }}</p>
            </div>
          }
          @if (generatedContent.description) {
            <div>
              <label>Description</label>
              <p>{{ generatedContent.description }}</p>
            </div>
          }
          <button (click)="applyContent()">Apply to Content</button>
        </div>
      }
    </div>
  `,
  standalone: true
})
export class AiFeaturesComponent implements OnInit {
  config: AIConfig = {
    provider: 'OpenAI',
    model: 'gpt-4',
    enabled: false,
    autoTagging: false,
    altTextGeneration: false
  };
  generatedContent: GeneratedContent | null = null;

  async ngOnInit() {
    await this.loadConfig();
  }

  async loadConfig() {
    this.config = await firstValueFrom(this.aiService.getConfig());
  }

  async saveConfig() {
    await firstValueFrom(this.aiService.updateConfig(this.config));
    this.messageService.success('AI configuration saved');
  }

  async generateTags() {
    const content = this.getContent();
    this.generatedContent = await firstValueFrom(
      this.aiService.generateTags(content)
    );
  }

  async generateSummary() {
    const content = this.getContent();
    this.generatedContent = await firstValueFrom(
      this.aiService.summarizeContent(content)
    );
  }

  getContent(): string {
    // Get content from current entry being edited
    return this.entry?.content || '';
  }

  applyContent() {
    if (this.generatedContent) {
      this.entry.tags = this.generatedContent.tags;
      this.entry.summary = this.generatedContent.summary;
      this.entry.title = this.generatedContent.title;
      this.entry.description = this.generatedContent.description;
      this.messageService.success('AI content applied');
    }
  }
}
```

#### 2. Create AI Service
**File: `frontend/src/app/services/ai.service.ts`**
```typescript
@Injectable({ providedIn: 'root' })
export class AIService {
  constructor(private http: HttpClient) {}

  getConfig(): Observable<AIConfig> {
    return this.http.get<AIConfig>('/api/aiconfig');
  }

  updateConfig(config: AIConfig): Observable<void> {
    return this.http.put<void>('/api/aiconfig', config);
  }

  generateTags(content: string): Observable<GeneratedContent> {
    return this.http.post<GeneratedContent>('/api/ai/generate-tags', { content });
  }

  summarizeContent(content: string): Observable<GeneratedContent> {
    return this.http.post<GeneratedContent>('/api/ai/summarize', { content });
  }

  generateTitle(content: string): Observable<GeneratedContent> {
    return this.http.post<GeneratedContent>('/api/ai/generate-title', { content });
  }

  generateDescription(content: string): Observable<GeneratedContent> {
    return this.http.post<GeneratedContent>('/api/ai/generate-description', { content });
  }

  regenerateAltText(mediaId: number): Observable<void> {
    return this.http.post<void>(`/api/medialibrary/${mediaId}/regenerate-alt-text`, {});
  }
}
```

## Dependencies

### Backend
```xml
<PackageReference Include="Azure.AI.OpenAI" Version="2.1.0" />
<PackageReference Include="OpenAI" Version="1.0.0" />
<PackageReference Include="Azure.AI.Vision.ImageAnalysis" Version="1.0.0" />
```

### Frontend
No new dependencies

## Rollout Plan

1. **Phase 1**: Install AI SDKs
2. **Phase 2**: Create AI service interface
3. **Phase 3**: Implement OpenAI integration
4. **Phase 4**: Implement Azure Vision integration
5. **Phase 5**: Create AI processing service
6. **Phase 6**: Update controllers for AI features
7. **Phase 7**: Create AI configuration UI
8. **Phase 8**: Create AI tools component
9. **Phase 9**: Add batch processing
10. **Phase 10**: Add AI analytics and cost tracking

## Success Criteria

- AI features configurable
- Auto-tagging working
- Content summarization working
- Alt-text generation working
- AI content generation working
- AI tools UI functional
- Batch processing available
- AI costs tracked
