using Dynamo.CMS.API.Contracts;
using Dynamo.CMS.API.Data;
using Dynamo.CMS.API.Models;
using Dynamo.CMS.API.Storage;
using Microsoft.EntityFrameworkCore;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Formats.Png;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;
using System.Security.Cryptography;
using System.Text;

namespace Dynamo.CMS.API.Services;

public interface IImageProcessingService
{
    Task<Stream?> TransformImageAsync(int fileId, ImageTransformRequestDto request);
    Task<Stream?> GetTransformedImageAsync(int fileId, string transformationKey);
    Task<ImageMetadataDto> GetImageMetadataAsync(int fileId);
    Task<bool> SetFocalPointAsync(int fileId, FocalPointDto focalPoint);
    Task<Stream?> CropImageAsync(int fileId, ImageCropRequestDto request);
    Task<Stream?> RotateImageAsync(int fileId, ImageRotateRequestDto request);
}

public class ImageProcessingService : IImageProcessingService
{
    private readonly AppDbContext _context;
    private readonly IStorageProvider _storageProvider;
    private readonly string _transformCachePath;

    public ImageProcessingService(AppDbContext context, IStorageProvider storageProvider, IConfiguration configuration)
    {
        _context = context;
        _storageProvider = storageProvider;
        _transformCachePath = configuration.GetValue("Media:TransformCachePath", "transforms");
        
        if (!Directory.Exists(_transformCachePath))
        {
            Directory.CreateDirectory(_transformCachePath);
        }
    }

    public async Task<Stream?> TransformImageAsync(int fileId, ImageTransformRequestDto request)
    {
        var file = await _context.UploadedFiles.FindAsync(fileId);
        if (file == null) return null;

        var transformationKey = GenerateTransformationKey(request);
        
        // Check cache
        var cachedTransform = await _context.MediaTransformations
            .FirstOrDefaultAsync(t => t.FileId == fileId && t.TransformationKey == transformationKey);

        if (cachedTransform != null)
        {
            var cachedStream = await _storageProvider.GetFileAsync(cachedTransform.FilePath);
            if (cachedStream != null) return cachedStream;
        }

        var originalStream = await _storageProvider.GetFileAsync(file.FilePath);
        if (originalStream == null) return null;

        var transformedStream = await ProcessImageAsync(originalStream, request);
        if (transformedStream == null) return null;

        // Save to cache
        var cachePath = $"transforms/{fileId}/{transformationKey}";
        var cacheFullPath = System.IO.Path.Combine(_transformCachePath, cachePath);
        var cacheDir = System.IO.Path.GetDirectoryName(cacheFullPath);
        
        if (!string.IsNullOrEmpty(cacheDir) && !System.IO.Directory.Exists(cacheDir))
        {
            System.IO.Directory.CreateDirectory(cacheDir);
        }

        using (var fileStream = System.IO.File.Create(cacheFullPath))
        {
            transformedStream.Position = 0;
            await transformedStream.CopyToAsync(fileStream);
        }

        var fileInfo = new FileInfo(cacheFullPath);
        var transformation = new MediaTransformation
        {
            FileId = fileId,
            TransformationKey = transformationKey,
            FilePath = cachePath,
            FileSize = fileInfo.Length
        };

        _context.MediaTransformations.Add(transformation);
        await _context.SaveChangesAsync();

        transformedStream.Position = 0;
        return transformedStream;
    }

    public async Task<Stream?> GetTransformedImageAsync(int fileId, string transformationKey)
    {
        var transformation = await _context.MediaTransformations
            .FirstOrDefaultAsync(t => t.FileId == fileId && t.TransformationKey == transformationKey);

        if (transformation == null) return null;

        var cacheFullPath = System.IO.Path.Combine(_transformCachePath, transformation.FilePath);
        if (!System.IO.File.Exists(cacheFullPath)) return null;

        return System.IO.File.OpenRead(cacheFullPath);
    }

    public async Task<ImageMetadataDto> GetImageMetadataAsync(int fileId)
    {
        var file = await _context.UploadedFiles.FindAsync(fileId);
        if (file == null) throw new ArgumentException("File not found");

        var stream = await _storageProvider.GetFileAsync(file.FilePath);
        if (stream == null) throw new ArgumentException("File not found");

        using var image = await Image.LoadAsync(stream);

        var metadata = new ImageMetadataDto
        {
            Width = image.Width,
            Height = image.Height,
            Format = image.Metadata.DecodedImageFormat?.Name,
            FileSize = file.FileSize,
            Exif = new Dictionary<string, string>()
        };

        // Extract EXIF data if available
        if (image.Metadata.ExifProfile != null)
        {
            foreach (var value in image.Metadata.ExifProfile.Values)
            {
                metadata.Exif[value.Tag.ToString()] = value.ToString() ?? "";
            }
        }

        return metadata;
    }

    public async Task<bool> SetFocalPointAsync(int fileId, FocalPointDto focalPoint)
    {
        var file = await _context.UploadedFiles.FindAsync(fileId);
        if (file == null) return false;

        file.FocalPointX = focalPoint.X;
        file.FocalPointY = focalPoint.Y;

        _context.UploadedFiles.Update(file);
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<Stream?> CropImageAsync(int fileId, ImageCropRequestDto request)
    {
        var file = await _context.UploadedFiles.FindAsync(fileId);
        if (file == null) return null;

        var stream = await _storageProvider.GetFileAsync(file.FilePath);
        if (stream == null) return null;

        using var image = await Image.LoadAsync(stream);
        
        var cropRectangle = new Rectangle(request.X, request.Y, request.Width, request.Height);
        image.Mutate(x => x.Crop(cropRectangle));

        var outputStream = new MemoryStream();
        await SaveWithFormatAsync(image, outputStream);
        outputStream.Position = 0;

        return outputStream;
    }

    public async Task<Stream?> RotateImageAsync(int fileId, ImageRotateRequestDto request)
    {
        var file = await _context.UploadedFiles.FindAsync(fileId);
        if (file == null) return null;

        var stream = await _storageProvider.GetFileAsync(file.FilePath);
        if (stream == null) return null;

        using var image = await Image.LoadAsync(stream);
        
        image.Mutate(x => x.Rotate((float)request.Degrees));

        var outputStream = new MemoryStream();
        await SaveWithFormatAsync(image, outputStream);
        outputStream.Position = 0;

        return outputStream;
    }

    private async Task SaveWithFormatAsync(Image image, MemoryStream outputStream)
    {
        if (image.Metadata.DecodedImageFormat is JpegFormat)
            await image.SaveAsync(outputStream, new JpegEncoder());
        else if (image.Metadata.DecodedImageFormat is PngFormat)
            await image.SaveAsync(outputStream, new PngEncoder());
        else if (image.Metadata.DecodedImageFormat is WebpFormat)
            await image.SaveAsync(outputStream, new WebpEncoder());
        else
            await image.SaveAsync(outputStream, new JpegEncoder());
    }

    private async Task<MemoryStream?> ProcessImageAsync(Stream inputStream, ImageTransformRequestDto request)
    {
        using var image = await Image.LoadAsync(inputStream);
        var originalWidth = image.Width;
        var originalHeight = image.Height;

        // Resize
        if (request.Width.HasValue || request.Height.HasValue)
        {
            var width = request.Width ?? originalWidth;
            var height = request.Height ?? originalHeight;
            var mode = request.Mode?.ToLower() ?? "fit";

            ResizeMode resizeMode = mode switch
            {
                "crop" => ResizeMode.Crop,
                "stretch" => ResizeMode.Stretch,
                "pad" => ResizeMode.Pad,
                _ => ResizeMode.Max
            };

            image.Mutate(x => x.Resize(new ResizeOptions
            {
                Size = new Size(width, height),
                Mode = resizeMode
            }));
        }

        // Change format
        var format = request.Format?.ToLower() ?? "original";
        IImageEncoder encoder = format switch
        {
            "jpeg" or "jpg" => new JpegEncoder { Quality = request.Quality ?? 90 },
            "png" => new PngEncoder(),
            "webp" => new WebpEncoder { Quality = request.Quality ?? 90 },
            _ => image.Metadata.DecodedImageFormat is IImageEncoder defaultEncoder 
                ? defaultEncoder 
                : new JpegEncoder { Quality = request.Quality ?? 90 }
        };

        var outputStream = new MemoryStream();
        await image.SaveAsync(outputStream, encoder);
        outputStream.Position = 0;

        return outputStream;
    }

    private string GenerateTransformationKey(ImageTransformRequestDto request)
    {
        var key = $"w{request.Width ?? 0}_h{request.Height ?? 0}_f{request.Format ?? "orig"}_q{request.Quality ?? 90}_m{request.Mode ?? "fit"}";
        
        using var sha256 = SHA256.Create();
        var hash = sha256.ComputeHash(Encoding.UTF8.GetBytes(key));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
