using Dynamo.CMS.API.Models;
using Dynamo.CMS.API.Options;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Dynamo.CMS.API.Services;

public interface IJwtService
{
    Task<string> GenerateTokenAsync(User user);
}

public class JwtService : IJwtService
{
    private readonly UserManager<User> _userManager;
    private readonly IOptions<JwtOptions> _jwtOptions;
    private readonly TimeProvider _timeProvider;

    public JwtService(
        UserManager<User> userManager,
        IOptions<JwtOptions> jwtOptions,
        TimeProvider timeProvider
        )
    {
        _userManager = userManager;
        _jwtOptions = jwtOptions;
        _timeProvider = timeProvider;
    }

    public async Task<string> GenerateTokenAsync(User user)
    {
        var userRoles = await _userManager.GetRolesAsync(user);

        var issuedAt = _timeProvider.GetUtcNow();
        var expiresAt = issuedAt.Add(_jwtOptions.Value.AccessTokenLifetime);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email!),
            new(ClaimTypes.Name, user.UserName!),
        };
        claims.AddRange(userRoles.Select(role => new Claim(ClaimTypes.Role, role)));
        claims.Add(new Claim(JwtRegisteredClaimNames.Iat, issuedAt.ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64));

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtOptions.Value.Key));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _jwtOptions.Value.Issuer,
            audience: _jwtOptions.Value.Audience,
            claims: claims,
            expires: expiresAt.UtcDateTime,
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

}
