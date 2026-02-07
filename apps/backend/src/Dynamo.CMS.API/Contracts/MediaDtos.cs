namespace Dynamo.CMS.API.Contracts;

public class MediaFolderDto
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public int? ParentId { get; set; }
    public required string Path { get; set; }
    public DateTime CreatedAt { get; set; }
    public int FileCount { get; set; }
    public List<MediaFolderDto> Children { get; set; } = [];
}

public class CreateMediaFolderDto
{
    public required string Name { get; set; }
    public int? ParentId { get; set; }
}

public class UpdateMediaFolderDto
{
    public string? Name { get; set; }
    public int? ParentId { get; set; }
}

public class MediaTransformationDto
{
    public int Id { get; set; }
    public int FileId { get; set; }
    public required string TransformationKey { get; set; }
    public required string FilePath { get; set; }
    public long? FileSize { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ImageTransformRequestDto
{
    public int? Width { get; set; }
    public int? Height { get; set; }
    public string? Format { get; set; }
    public int? Quality { get; set; }
    public string? Mode { get; set; }
}

public class FocalPointDto
{
    public decimal X { get; set; }
    public decimal Y { get; set; }
}

public class ImageMetadataDto
{
    public int Width { get; set; }
    public int Height { get; set; }
    public string? Format { get; set; }
    public long? FileSize { get; set; }
    public Dictionary<string, string> Exif { get; set; } = [];
}

public class ImageCropRequestDto
{
    public int X { get; set; }
    public int Y { get; set; }
    public int Width { get; set; }
    public int Height { get; set; }
}

public class ImageRotateRequestDto
{
    public int Degrees { get; set; }
}
