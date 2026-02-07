namespace Dynamo.CMS.API.Storage;

public interface IStorageProvider
{
    Task<string> SaveFileAsync(Stream fileStream, string fileName, string contentType);
    Task<Stream?> GetFileAsync(string filePath);
    Task<bool> DeleteFileAsync(string filePath);
    Task<bool> FileExistsAsync(string filePath);
    string GetPublicUrl(string filePath);
}
