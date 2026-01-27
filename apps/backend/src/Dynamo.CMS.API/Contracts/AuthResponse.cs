namespace Dynamo.CMS.API.Contracts;

public class LoginRequest
{
    public string? Email { get; set; }

    public string? UserName { get; set; }

    public required string Password { get; set; }
}

public class RegisterRequest
{
    public required string UserName { get; set; }
    public required string Email { get; set; }
    public required string Password { get; set; }
    public required string FirstName { get; set; }
    public required string LastName { get; set; }
}

public class AuthResponse
{
    public bool Success { get; set; }
    public string? AccessToken { get; set; }
    public string? Message { get; set; }
    public string? Email { get; set; }
}