using Dynamo.CMS.API.Options;
using Microsoft.Extensions.Options;
using System.IO.Abstractions;
using System.Text;

namespace Dynamo.CMS.API.Services;

public interface IFileManager
{
    /// <summary>
    ///		Asynchronously uploads a file to the specified path based on the provided file type and optional sub-path.
    /// </summary>
    /// <param name="file">The file to upload, provided as an <see cref="IFormFile"/>.</param>
    /// <param name="collectionName">The type of the file, which determines the base directory for storage.</param>
    /// <param name="subPath">An optional sub-path to include in the file's storage path.</param>
    /// <param name="cancellationToken">A token to monitor for cancellation requests.</param>
    /// <returns>
    ///		A <see cref="Task{String}"/> representing the asynchronous operation, containing the path where the file was saved.
    /// </returns>
    /// <exception cref="ArgumentNullException">Thrown if the file is null.</exception>
    /// <exception cref="IOException">Thrown if an I/O error occurs during the file operation.</exception>
    Task<string> UploadAsync(IFormFile file, string collectionName, string[] subPath, CancellationToken cancellationToken = default);

    /// <inheritdoc cref="UploadAsync(IFormFile, string, string[], CancellationToken)"/>
    Task<string> UploadAsync(IFormFile file, string collectionName, object[] subPath, CancellationToken cancellationToken = default);

    /// <inheritdoc cref="UploadAsync(IFormFile, string, string[], CancellationToken)"/>
    Task<string> UploadAsync(IFormFile file, string collectionName, string subPath, CancellationToken cancellationToken = default);

    /// <inheritdoc cref="UploadAsync(IFormFile, string, string[], CancellationToken)"/>
    Task<string> UploadAsync(IFormFile file, string collectionName, CancellationToken cancellationToken = default);

    /// <summary>
    ///		Asynchronously writes bytes a file to the specified path based on the provided file type and optional sub-path.
    /// </summary>
    /// <param name="fileName">The name of the destination file.</param>
    /// <param name="bytes">Content of the file in binary format.</param>
    /// <param name="collectionName">The type of the file, which determines the base directory for storage.</param>
    /// <param name="subPath">An optional sub-path to include in the file's storage path.</param>
    /// <param name="cancellationToken">A token to monitor for cancellation requests.</param>
    /// <returns>
    ///		A <see cref="Task{String}"/> representing the asynchronous operation, containing the path where the file was saved.
    /// </returns>
    Task<string> UploadAsync(string fileName, byte[] bytes, string collectionName, string[] subPath, CancellationToken cancellationToken = default);

    bool Delete(string path);
}

public class FileManager : IFileManager
{
    private readonly ILogger<FileManager> _logger;
    private readonly IFileSystem _fileSystem;
    private readonly IOptions<StorageOptions> _storageOptions;
    public FileManager(
        ILogger<FileManager> logger,
        IFileSystem fileSystem,
        IOptions<StorageOptions> storageOptions
        )
    {
        _logger = logger;
        _fileSystem = fileSystem;
        _storageOptions = storageOptions;
    }

    public Task<string> UploadAsync(IFormFile file, string collectionName, CancellationToken cancellationToken = default)
    {
        return UploadAsync(file, collectionName, [], cancellationToken);
    }

    public Task<string> UploadAsync(IFormFile file, string collectionName, object[] subPath, CancellationToken cancellationToken = default)
    {
        var array = subPath.Where(x => x is not null).Select(x => x.ToString()!).ToArray();
        return UploadAsync(file, collectionName, array, cancellationToken);
    }

    public Task<string> UploadAsync(IFormFile file, string collectionName, string subPath, CancellationToken cancellationToken = default)
    {
        return UploadAsync(file, collectionName, [subPath], cancellationToken);
    }

    public async Task<string> UploadAsync(IFormFile file, string collectionName, string[] subPath, CancellationToken cancellationToken = default)
    {
        List<string> pathBuilder = ["files", collectionName.ToString().ToLower()];

        var root = _storageOptions.Value.Static?.RootLocation;
        if (root is not null)
        {
            pathBuilder.Insert(0, root);
        }

        if (subPath.Length > 0)
        {
            foreach (var item in subPath)
            {
                pathBuilder.Add(item);
            }
        }

        string fileName = BuildFileName(file);
        pathBuilder.Add(fileName);

        string destination = _fileSystem.Path.Combine(pathBuilder.ToArray());

        var fi = _fileSystem.FileInfo.New(destination);
        if (!fi.Directory!.Exists)
        {
            fi.Directory.Create();
        }

        if (fi.Exists)
        {
            _logger.LogWarning("File {FileName} already exists, deleting it...", fi.FullName);
            fi.Delete();
        }

        await using var fs = _fileSystem.FileStream.New(fi.FullName, FileMode.CreateNew);
        await file.CopyToAsync(fs, cancellationToken);
        return destination;
    }

    public async Task<string> UploadAsync(string fileName, byte[] bytes, string collectionName, string[] subPath, CancellationToken cancellationToken = default)
    {
        List<string> pathBuilder = ["files", collectionName.ToString().ToLower()];

        var root = _storageOptions.Value.Static?.RootLocation;
        if (root is not null)
        {
            pathBuilder.Insert(0, root);
        }

        if (subPath.Length > 0)
        {
            foreach (var item in subPath)
            {
                pathBuilder.Add(item);
            }
        }

        pathBuilder.Add(fileName);

        string destination = _fileSystem.Path.Combine(pathBuilder.ToArray());

        var fi = _fileSystem.FileInfo.New(destination);
        if (!fi.Directory!.Exists)
        {
            fi.Directory.Create();
        }

        if (fi.Exists)
        {
            _logger.LogWarning("File {FileName} already exists, deleting it...", fi.FullName);
            fi.Delete();
        }

        await using var fs = _fileSystem.FileStream.New(fi.FullName, FileMode.CreateNew);
        await _fileSystem.File.WriteAllBytesAsync(fi.FullName, bytes, cancellationToken);
        return destination;
    }

    public bool Delete(string path)
    {
        try
        {
            _fileSystem.File.Delete(path);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete file {FilePath}. {Exception}", path, ex.Message);
            return false;
        }
    }

    private string BuildFileName(IFormFile file)
    {
        StringBuilder fileNameBuilder = new();

        var salt = Guid.NewGuid().ToString("N");
        var baseName = $"{_fileSystem.Path.GetFileNameWithoutExtension(file.FileName)}_{salt}";
        var extension = _fileSystem.Path.GetExtension(file.FileName).ToLower();

        fileNameBuilder.Append(baseName);
        fileNameBuilder.Append('.');
        fileNameBuilder.Append(extension.Trim('.'));

        return fileNameBuilder.ToString();
    }

}
