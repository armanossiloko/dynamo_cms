# Advanced Media Management

## Overview
Enhance the existing Media model with features like automatic image resizing, focal point cropping, and direct integration with cloud storage providers (AWS S3, Azure Blob Storage).

## Priority: 7 (Medium)
Basic file upload is not enough. Modern web applications require optimized images and scalable, durable cloud storage.

## Implementation Plan

### Backend Changes

#### 1. Create Storage Provider Interface
**File: `backend/src/Dynamo.CMS.API/Services/Storage/IStorageProvider.cs`**
```csharp
public interface IStorageProvider
{
    Task<string> UploadFileAsync(Stream fileStream, string fileName, string contentType);
    Task<Stream> GetFileAsync(string fileName);
    Task DeleteFileAsync(string fileName);
    Task<string> GetSignedUrlAsync(string fileName, TimeSpan expiration);
    Task<IEnumerable<StorageFile>> ListFilesAsync(string prefix = "");
    Task<string> GetFileUrlAsync(string fileName);
}

public record StorageFile(
    string Name,
    long Size,
    string ContentType,
    DateTime LastModified,
    string Url
);
```

#### 2. Create Local Storage Provider
**File: `backend/src/Dynamo.CMS.API/Services/Storage/LocalStorageProvider.cs`**
```csharp
public class LocalStorageProvider : IStorageProvider
{
    private readonly string _basePath;
    private readonly string _baseUrl;

    public LocalStorageProvider(IConfiguration configuration)
    {
        _basePath = configuration["Storage:Local:Path"] ?? "./files";
        _baseUrl = configuration["Storage:Local:BaseUrl"] ?? "/files";
    }

    public async Task<string> UploadFileAsync(Stream fileStream, string fileName, string contentType)
    {
        var fullPath = Path.Combine(_basePath, fileName);
        var directory = Path.GetDirectoryName(fullPath);
        if (!Directory.Exists(directory))
        {
            Directory.CreateDirectory(directory!);
        }

        using var fileStream = File.Create(fullPath);
        await fileStream.CopyToAsync(fileStream);

        return $"{_baseUrl}/{fileName}";
    }

    public Task<Stream> GetFileAsync(string fileName)
    {
        var fullPath = Path.Combine(_basePath, fileName);
        return Task.FromResult<Stream>(File.OpenRead(fullPath));
    }
}
```

#### 3. Create S3 Storage Provider
**File: `backend/src/Dynamo.CMS.API/Services/Storage/S3StorageProvider.cs`**
```csharp
public class S3StorageProvider : IStorageProvider
{
    private readonly IAmazonS3 _s3Client;
    private readonly string _bucketName;
    private readonly string _cdnBaseUrl;

    public S3StorageProvider(IConfiguration configuration)
    {
        var config = new AmazonS3Config
        {
            ServiceURL = configuration["Storage:S3:ServiceURL"],
            ForcePathStyle = configuration.GetValue<bool>("Storage:S3:ForcePathStyle", true)
        };

        _s3Client = new AmazonS3Client(
            configuration["Storage:S3:AccessKey"],
            configuration["Storage:S3:SecretKey"],
            config
        );

        _bucketName = configuration["Storage:S3:BucketName"]!;
        _cdnBaseUrl = configuration["Storage:S3:CdnBaseUrl"]!;
    }

    public async Task<string> UploadFileAsync(Stream fileStream, string fileName, string contentType)
    {
        var request = new PutObjectRequest
        {
            BucketName = _bucketName,
            Key = fileName,
            InputStream = fileStream,
            ContentType = contentType,
            CannedACL = S3CannedACL.PublicRead
        };

        await _s3Client.PutObjectAsync(request);

        return $"{_cdnBaseUrl}/{fileName}";
    }

    public async Task<string> GetSignedUrlAsync(string fileName, TimeSpan expiration)
    {
        var request = new GetPreSignedUrlRequest
        {
            BucketName = _bucketName,
            Key = fileName,
            Expires = DateTime.UtcNow.Add(expiration)
        };

        return await _s3Client.GetPreSignedURLAsync(request);
    }
}
```

#### 4. Create Azure Blob Storage Provider
**File: `backend/src/Dynamo.CMS.API/Services/Storage/AzureStorageProvider.cs`**
```csharp
public class AzureStorageProvider : IStorageProvider
{
    private readonly BlobServiceClient _blobServiceClient;
    private readonly BlobContainerClient _containerClient;
    private readonly string _cdnBaseUrl;

    public AzureStorageProvider(IConfiguration configuration)
    {
        var connectionString = configuration["Storage:Azure:ConnectionString"];
        _blobServiceClient = new BlobServiceClient(connectionString);
        _containerClient = _blobServiceClient.GetBlobContainerClient(configuration["Storage:Azure:ContainerName"]);
        _cdnBaseUrl = configuration["Storage:Azure:CdnBaseUrl"]!;
    }

    public async Task<string> UploadFileAsync(Stream fileStream, string fileName, string contentType)
    {
        var blobClient = _containerClient.GetBlobClient(fileName);

        await blobClient.UploadAsync(fileStream, new BlobUploadOptions
        {
            HttpHeaders = new BlobHttpHeaders { ContentType = contentType }
        });

        return $"{_cdnBaseUrl}/{fileName}";
    }

    public async Task<string> GetSignedUrlAsync(string fileName, TimeSpan expiration)
    {
        var blobClient = _containerClient.GetBlobClient(fileName);
        var sasBuilder = new BlobSasBuilder(BlobSasPermissions.Read, DateTimeOffset.UtcNow.Add(expiration));
        var sasToken = blobClient.GenerateSasUri(sasBuilder).Query;
        return $"{blobClient.Uri}{sasToken}";
    }
}
```

#### 5. Create Image Processing Service
**File: `backend/src/Dynamo.CMS.API/Services/ImageProcessingService.cs`**
```csharp
public interface IImageProcessingService
{
    Task<string> ResizeImageAsync(string inputPath, string outputPath, int width, int height);
    Task<string> CropImageAsync(string inputPath, string outputPath, int x, int y, int width, int height);
    Task<string> GenerateThumbnailAsync(string inputPath, string outputPath, int size = 200);
    Task<ImageMetadata> GetImageMetadataAsync(string filePath);
    Task<List<string>> GenerateResponsiveImagesAsync(
        string inputPath,
        string outputDir,
        List<int> widths);
}

public record ImageMetadata(int Width, int Height, string Format, long FileSize);

public class ImageProcessingService : IImageProcessingService
{
    public async Task<string> ResizeImageAsync(
        string inputPath,
        string outputPath,
        int width,
        int height)
    {
        using var image = await Image.LoadAsync(inputPath);
        image.Mutate(x => x.Resize(width, height));
        await image.SaveAsync(outputPath);
        return outputPath;
    }

    public async Task<List<string>> GenerateResponsiveImagesAsync(
        string inputPath,
        string outputDir,
        List<int> widths)
    {
        var result = new List<string>();
        var fileName = Path.GetFileNameWithoutExtension(inputPath);
        var extension = Path.GetExtension(inputPath);

        foreach (var width in widths)
        {
            var outputPath = Path.Combine(outputDir, $"{fileName}-{width}w{extension}");
            using var image = await Image.LoadAsync(inputPath);

            // Calculate height maintaining aspect ratio
            var aspectRatio = (double)image.Width / image.Height;
            var height = (int)(width / aspectRatio);

            image.Mutate(x => x.Resize(width, height));
            await image.SaveAsync(outputPath);

            result.Add(outputPath);
        }

        return result;
    }
}
```

#### 6. Update Media Model
**File: `backend/src/Dynamo.CMS.API/Models/Media.cs`**
```csharp
public class Media
{
    public int Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string OriginalFileName { get; set; } = string.Empty;
    public string MimeType { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string StoragePath { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string? AltText { get; set; }
    public string? Caption { get; set; }
    public Dictionary<string, string>? Metadata { get; set; }

    // Image-specific properties
    public int? Width { get; set; }
    public int? Height { get; set; }
    public int? FocalPointX { get; set; }
    public int? FocalPointY { get; set; }

    // Responsive images
    public List<string> ResponsiveUrls { get; set; } = new();
    public string? ThumbnailUrl { get; set; }

    public DateTime CreatedAt { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
}
```

#### 7. Update MediaLibraryController
**File: `backend/src/Dynamo.CMS.API/Controllers/MediaLibraryController.cs`**
```csharp
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MediaLibraryController : ControllerBase
{
    private readonly IStorageProvider _storageProvider;
    private readonly IImageProcessingService _imageProcessingService;

    [HttpPost("upload")]
    public async Task<ActionResult<Media>> UploadMedia(
        IFormFile file,
        [FromQuery] bool generateThumbnail = true,
        [FromQuery] List<int>? responsiveWidths = null)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file uploaded");

        // Generate unique filename
        var fileName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";

        // Upload to storage
        await using var stream = file.OpenReadStream();
        var url = await _storageProvider.UploadFileAsync(stream, fileName, file.ContentType);

        var media = new Media
        {
            FileName = fileName,
            OriginalFileName = file.FileName,
            MimeType = file.ContentType,
            FileSize = file.Length,
            Url = url,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = User.Identity?.Name ?? "system"
        };

        // Process if it's an image
        if (file.ContentType.StartsWith("image/"))
        {
            var metadata = await _imageProcessingService.GetImageMetadataAsync(stream);
            media.Width = metadata.Width;
            media.Height = metadata.Height;
            media.Metadata = new Dictionary<string, string>
            {
                ["format"] = metadata.Format,
                ["fileSize"] = metadata.FileSize.ToString()
            };

            // Generate thumbnail
            if (generateThumbnail)
            {
                var thumbnailPath = await _imageProcessingService.GenerateThumbnailAsync(
                    Path.GetTempFileName(),
                    Path.GetFileNameWithoutExtension(fileName) + "-thumb" + Path.GetExtension(fileName)
                );

                await using var thumbStream = File.OpenRead(thumbnailPath);
                var thumbFileName = $"thumbnails/{fileName}";
                media.ThumbnailUrl = await _storageProvider.UploadFileAsync(
                    thumbStream,
                    thumbFileName,
                    "image/jpeg"
                );
            }

            // Generate responsive images
            if (responsiveWidths?.Any() == true)
            {
                var responsiveUrls = await _imageProcessingService.GenerateResponsiveImagesAsync(
                    Path.GetTempFileName(),
                    "responsive",
                    responsiveWidths
                );

                foreach (var responsivePath in responsiveUrls)
                {
                    await using var respStream = File.OpenRead(responsivePath);
                    var respFileName = $"responsive/{Path.GetFileName(responsivePath)}";
                    var respUrl = await _storageProvider.UploadFileAsync(respStream, respFileName, file.ContentType);
                    media.ResponsiveUrls.Add(respUrl);
                }
            }
        }

        _context.Media.Add(media);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetMedia), new { id = media.Id }, media);
    }

    [HttpPost("{id}/focal-point")]
    public async Task<ActionResult> SetFocalPoint(int id, [FromBody] FocalPointDto dto)
    {
        var media = await _context.Media.FindAsync(id);
        if (media == null) return NotFound();

        media.FocalPointX = dto.X;
        media.FocalPointY = dto.Y;
        await _context.SaveChangesAsync();

        return Ok(media);
    }

    [HttpGet("{id}/url")]
    public async Task<ActionResult<string>> GetSignedUrl(int id, [FromQuery] int expirationMinutes = 60)
    {
        var media = await _context.Media.FindAsync(id);
        if (media == null) return NotFound();

        var url = await _storageProvider.GetSignedUrlAsync(
            media.FileName,
            TimeSpan.FromMinutes(expirationMinutes)
        );

        return Ok(new { url });
    }
}
```

#### 8. Add Program Registration
**File: `backend/src/Dynamo.CMS.API/Program.cs`**
```csharp
// Register storage provider based on configuration
var storageProvider = builder.Configuration["Storage:Provider"] switch
{
    "S3" => typeof(S3StorageProvider),
    "Azure" => typeof(AzureStorageProvider),
    _ => typeof(LocalStorageProvider)
};

builder.Services.AddSingleton(typeof(IStorageProvider), storageProvider);
builder.Services.AddScoped<IImageProcessingService, ImageProcessingService>();
```

### Frontend Changes

#### 1. Create Image Cropper Component
**File: `frontend/src/app/components/media/image-cropper.component.ts`**
```typescript
@Component({
  selector: 'app-image-cropper',
  template: `
    <div class="image-cropper">
      <div class="image-container">
        <img [src]="imageUrl" #imageRef (load)="onImageLoad()">
        <div class="focal-point" [style.left.px]="focalPointX" [style.top.px]="focalPointY"></div>
      </div>
      <div class="controls">
        <p>Click on the image to set the focal point</p>
        <button (click)="saveFocalPoint()">Save Focal Point</button>
        <button (click)="resetFocalPoint()">Reset</button>
      </div>
    </div>
  `,
  standalone: true
})
export class ImageCropperComponent {
  @Input() imageUrl: string;
  @Input() mediaId: number;

  @Output() focalPointChange = new EventEmitter<{ x: number; y: number }>();

  focalPointX: number = 50;
  focalPointY: number = 50;

  onImageLoad() {
    // Set initial focal point to center
    this.focalPointX = 50;
    this.focalPointY = 50;
  }

  onImageClick(event: MouseEvent) {
    const rect = event.target as HTMLImageElement;
    const x = (event.offsetX / rect.clientWidth) * 100;
    const y = (event.offsetY / rect.clientHeight) * 100;

    this.focalPointX = x;
    this.focalPointY = y;
  }

  async saveFocalPoint() {
    await this.http.post(`/api/medialibrary/${this.mediaId}/focal-point`, {
      x: Math.round(this.focalPointX),
      y: Math.round(this.focalPointY)
    }).toPromise();

    this.focalPointChange.emit({ x: this.focalPointX, y: this.focalPointY });
    this.messageService.success('Focal point saved');
  }

  resetFocalPoint() {
    this.focalPointX = 50;
    this.focalPointY = 50;
  }
}
```

#### 2. Update Media Library Component
**File: `frontend/src/app/components/media/media-library.component.ts`**
- Show thumbnail preview
- Add focal point setting for images
- Show responsive image URLs
- Add bulk operations

```typescript
@Component({
  template: `
    <div class="media-library">
      <div class="upload-section">
        <input type="file" (change)="onFileSelect($event)" multiple>
        <div class="options">
          <label>
            <input type="checkbox" [(ngModel)]="generateThumbnails">
            Generate Thumbnails
          </label>
          <label>
            <input type="checkbox" [(ngModel)]="generateResponsiveImages">
            Generate Responsive Images
          </label>
        </div>
      </div>

      <div class="media-grid">
        @for (media of mediaItems; track media.id) {
          <div class="media-item">
            <img [src]="media.thumbnailUrl || media.url">
            <div class="media-info">
              <span>{{ media.originalFileName }}</span>
              @if (media.width && media.height) {
                <span>{{ media.width }}x{{ media.height }}</span>
              }
            </div>
            <div class="media-actions">
              <button (click)="editFocalPoint(media)">Set Focal Point</button>
              <button (click)="copyUrl(media)">Copy URL</button>
              <button (click)="deleteMedia(media)">Delete</button>
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class MediaLibraryComponent {
  mediaItems: Media[] = [];
  generateThumbnails = true;
  generateResponsiveImages = true;

  async onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);

    for (const file of files) {
      await this.uploadFile(file);
    }
  }

  async uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('generateThumbnail', this.generateThumbnails.toString());

    if (this.generateResponsiveImages) {
      formData.append('responsiveWidths', [320, 640, 768, 1024, 1200, 1920].join(','));
    }

    const media = await firstValueFrom(
      this.http.post<Media>('/api/medialibrary/upload', formData)
    );

    this.mediaItems.push(media);
  }

  editFocalPoint(media: Media) {
    // Open focal point editor modal
  }
}
```

#### 3. Create Storage Configuration Component
**File: `frontend/src/app/components/settings/storage-config.component.ts`**
```typescript
@Component({
  selector: 'app-storage-config',
  template: `
    <div class="storage-config">
      <h3>Storage Configuration</h3>

      <div class="form-group">
        <label>Storage Provider</label>
        <select [(ngModel)]="config.provider">
          <option value="Local">Local File System</option>
          <option value="S3">Amazon S3</option>
          <option value="Azure">Azure Blob Storage</option>
        </select>
      </div>

      @switch (config.provider) {
        @case ('Local') {
          <app-local-storage-config [(config)]="config.local"></app-local-storage-config>
        }
        @case ('S3') {
          <app-s3-storage-config [(config)]="config.s3"></app-s3-storage-config>
        }
        @case ('Azure') {
          <app-azure-storage-config [(config)]="config.azure"></app-azure-storage-config>
        }
      }

      <button (click)="saveConfig()">Save Configuration</button>
      <button (click)="testConnection()">Test Connection</button>
    </div>
  `,
  standalone: true
})
export class StorageConfigComponent {
  config = {
    provider: 'Local',
    local: { path: './files', baseUrl: '/files' },
    s3: { accessKey: '', secretKey: '', bucketName: '', region: '' },
    azure: { connectionString: '', containerName: '' }
  };

  async saveConfig() {
    await this.http.put('/api/settings/storage', this.config).toPromise();
    this.messageService.success('Storage configuration saved');
  }

  async testConnection() {
    const result = await this.http.post('/api/settings/storage/test', this.config).toPromise();
    if (result) {
      this.messageService.success('Connection successful');
    }
  }
}
```

## Dependencies

### Backend
```xml
<PackageReference Include="AWSSDK.S3" Version="4.0.0" />
<PackageReference Include="Azure.Storage.Blobs" Version="12.21.0" />
<PackageReference Include="SixLabors.ImageSharp" Version="3.1.5" />
```

### Frontend
```bash
npm install ngx-image-cropper
```

## Rollout Plan

1. **Phase 1**: Create storage provider interfaces and implementations
2. **Phase 2**: Implement image processing service
3. **Phase 3**: Update Media model and controller
4. **Phase 4**: Add storage configuration UI
5. **Phase 5**: Implement focal point editor
6. **Phase 6**: Add thumbnail generation
7. **Phase 7**: Add responsive image generation
8. **Phase 8**: Add CDN integration support
9. **Phase 9**: Add bulk operations
10. **Phase 10**: Add advanced image optimization

## Success Criteria

- Multiple storage providers supported (Local, S3, Azure)
- Automatic image resizing and optimization
- Thumbnail generation
- Focal point cropping
- Responsive image generation
- Signed URL generation for private content
- CDN integration
- Media library UI with focal point editor
