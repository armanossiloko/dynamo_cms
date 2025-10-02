namespace Dynamo.CMS.API.Options;

public class ApplicationOptions
{
    public const string OptionsName = "Application";

    public required string Name { get; set; }

    public required bool DumpConfigurationOnStartup { get; set; }

    public DatabaseOptions? Database { get; set; }

}

public class DatabaseOptions
{
    public const string OptionsName = "Database";
    public const string OptionsPath = "Application:Database";

    public required DatabaseProvider DatabaseProvider { get; set; }

    public bool SeedOnStartup { get; set; }

}

public enum DatabaseProvider
{
    PostgreSQL,
    //MySQL,
    //SQLServer,
}