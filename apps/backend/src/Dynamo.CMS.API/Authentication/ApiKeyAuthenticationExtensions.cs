using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.DependencyInjection;

namespace Dynamo.CMS.API.Authentication;

public static class ApiKeyAuthenticationExtensions
{
    public static AuthenticationBuilder AddApiKey(this AuthenticationBuilder builder)
    {
        return builder.AddScheme<ApiKeyAuthenticationSchemeOptions, ApiKeyAuthenticationHandler>(
            "ApiKey",
            "API Key",
            _ => { });
    }
}

public class ApiKeyAuthenticationSchemeOptions : AuthenticationSchemeOptions
{
}