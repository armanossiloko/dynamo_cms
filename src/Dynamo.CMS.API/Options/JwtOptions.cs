namespace Dynamo.CMS.API.Options;

public class JwtOptions
{
    public const string OptionsName = "Jwt";

    public required string Key { get; set; }

    public required string Audience { get; set; }

    public required string Issuer { get; set; }

    public required TimeSpan AccessTokenLifetime { get; set; }

    public required TimeSpan RefreshTokenLifetime { get; set; }

}
