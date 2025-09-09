using Vivicasa.CMS.API.Models;

namespace Vivicasa.CMS.API.Services;

public interface IJwtService
{
    Task<string> GenerateJwtTokenAsync(User user);
}
