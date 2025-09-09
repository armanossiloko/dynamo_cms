using Vivicasa.CMS.API.Models.Dto;

namespace Vivicasa.CMS.API.Services;

public interface IIdentityService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request);
    Task<AuthResponse> LoginAsync(LoginRequest request);
}
