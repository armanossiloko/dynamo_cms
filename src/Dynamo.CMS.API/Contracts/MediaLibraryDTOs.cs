namespace Dynamo.CMS.API.Contracts;

/// <summary>
/// DTO representing a media file in the library
/// </summary>
public class MediaFileDTO
{
    public long Id { get; set; }
    public required string FileName { get; set; }
    public string? OriginalFileName { get; set; }
    public string? DisplayName { get; set; }
    public string? Description { get; set; }
    public string? ContentType { get; set; }
    public long FileSize { get; set; }
    public string? Url { get; set; }
    public string? ThumbnailUrl { get; set; }
    public DateTimeOffset UploadedAt { get; set; }
    public long? UploadedBy { get; set; }
    public string? UploaderName { get; set; }
    public string? CollectionName { get; set; }
    public string? RecordId { get; set; }
    public string? ColumnName { get; set; }
    public string? Extension { get; set; }
    public bool IsImage { get; set; }
    public bool IsVideo { get; set; }
    public bool IsDocument { get; set; }
}

/// <summary>
/// DTO for uploading files to media library
/// </summary>
public class MediaFileUploadDTO
{
    public string? DisplayName { get; set; }
    public string? Description { get; set; }
    public string? Folder { get; set; }
}

/// <summary>
/// DTO for updating media file metadata
/// </summary>
public class MediaFileUpdateDTO
{
    public string? DisplayName { get; set; }
    public string? Description { get; set; }
}

/// <summary>
/// Response for paginated media file list
/// </summary>
public class MediaFileListResponse
{
    public List<MediaFileDTO> Data { get; set; } = [];
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
}

/// <summary>
/// Filter options for media library queries
/// </summary>
public class MediaFileFilterDTO
{
    public string? Search { get; set; }
    public string? ContentType { get; set; }
    public string? Extension { get; set; }
    public long? UploadedBy { get; set; }
    public DateTimeOffset? UploadedAfter { get; set; }
    public DateTimeOffset? UploadedBefore { get; set; }
    public long? MinSize { get; set; }
    public long? MaxSize { get; set; }
    public string? SortBy { get; set; } // "name", "size", "uploadedAt"
    public bool? SortDescending { get; set; }
    public int? Page { get; set; }
    public int? PageSize { get; set; }
}

