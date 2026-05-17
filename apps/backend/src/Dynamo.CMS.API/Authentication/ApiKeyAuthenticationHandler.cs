using Dynamo.CMS.API.Contracts;
using Dynamo.CMS.API.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Threading.Tasks;

namespace Dynamo.CMS.API.Authentication;

public class ApiKeyAuthenticationHandler : AuthenticationHandler<ApiKeyAuthenticationSchemeOptions>
{
    private readonly IApiKeyService _apiKeyService;
    private readonly ILogger<ApiKeyAuthenticationHandler> _logger;

    public ApiKeyAuthenticationHandler(
        IOptionsMonitor<ApiKeyAuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        IApiKeyService apiKeyService)
        : base(options, logger, encoder)
    {
        _apiKeyService = apiKeyService;
        _logger = logger.CreateLogger<ApiKeyAuthenticationHandler>();
    }

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue("X-Api-Key", out var apiKeyHeader))
        {
            return AuthenticateResult.NoResult();
        }

        var plainKey = apiKeyHeader.ToString();
        if (string.IsNullOrWhiteSpace(plainKey))
        {
            return AuthenticateResult.NoResult();
        }

        var validationResult = await _apiKeyService.ValidateWithResultAsync(plainKey);
        
        if (!validationResult.IsValid)
        {
            _logger.LogWarning("Invalid API key: {Error}", validationResult.Error);
            return AuthenticateResult.Fail(validationResult.Error ?? "Invalid API key");
        }

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, $"api-key:{validationResult.Scope}"),
            new("api:key:scope", validationResult.Scope ?? "ReadOnly")
        };

        if (validationResult.AllowedCollections != null)
        {
            foreach (var collection in validationResult.AllowedCollections)
            {
                claims.Add(new Claim("api:key:collection", collection));
            }
        }

        var identity = new ClaimsIdentity(claims, "ApiKey");
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, "ApiKey");

        _logger.LogDebug("API key authenticated: scope={Scope}", validationResult.Scope);

        return AuthenticateResult.Success(ticket);
    }
}