namespace Dynamo.CMS.API.Options;

public class StorageOptions
{
    public const string OptionsName = "Storage";

    public StaticStorageOptions? Static { get; set; }

}

public class StaticStorageOptions
{
    public required string RootLocation { get; set; }

}