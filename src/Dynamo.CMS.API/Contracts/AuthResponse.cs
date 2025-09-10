namespace Dynamo.CMS.API.Contracts;

public class LoginRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class RegisterRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
}

public class AuthResponse
{
    public bool Success { get; set; }
    public string? AccessToken { get; set; }
    public string? Message { get; set; }
    public string? Email { get; set; }

}