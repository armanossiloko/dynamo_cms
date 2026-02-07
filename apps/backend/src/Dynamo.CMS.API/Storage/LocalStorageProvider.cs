namespace Dynamo.CMS.API.Storage;

public class LocalStorageProvider : IStorageProvider
{
    private readonly string _storagePath;
    private readonly string _publicBaseUrl;

    public LocalStorageProvider(string storagePath, string publicBaseUrl)
    {
        _storagePath = storagePath;
        _publicBaseUrl = publicBaseUrl;
        
        if (!System.IO.Directory.Exists(_storagePath))
        {
            System.IO.Directory.CreateDirectory(_storagePath);
        }
    }

    public async Task<string> SaveFileAsync(Stream fileStream, string fileName, string contentType)
    {
        var relativePath = $"{Guid.NewGuid()}/{fileName}";
        var fullPath = System.IO.Path.Combine(_storagePath, relativePath);
        var directory = System.IO.Path.GetDirectoryName(fullPath);
        
        if (!string.IsNullOrEmpty(directory) && !System.IO.Directory.Exists(directory))
        {
            System.IO.Directory.CreateDirectory(directory);
        }

        using var fileStreamDest = System.IO.File.Create(fullPath);
        await fileStream.CopyToAsync(fileStreamDest);

        return relativePath;
    }

    public Task<Stream?> GetFileAsync(string filePath)
    {
        var fullPath = System.IO.Path.Combine(_storagePath, filePath);
        if (!System.IO.File.Exists(fullPath))
        {
            return Task.FromResult<Stream?>(null);
        }

        return Task.FromResult<Stream?>(System.IO.File.OpenRead(fullPath));
    }

    public Task<bool> DeleteFileAsync(string filePath)
    {
        var fullPath = System.IO.Path.Combine(_storagePath, filePath);
        if (System.IO.File.Exists(fullPath))
        {
            System.IO.File.Delete(fullPath);
            return Task.FromResult(true);
        }

        return Task.FromResult(false);
    }

    public Task<bool> FileExistsAsync(string filePath)
    {
        var fullPath = System.IO.Path.Combine(_storagePath, filePath);
        return Task.FromResult(System.IO.File.Exists(fullPath));
    }

    public string GetPublicUrl(string filePath)
    {
        return $"{_publicBaseUrl}/{filePath.Replace("\\", "/")}";
    }
}
