namespace Dynamo.CMS.API.Contracts;

public class UserDTO
{
    public long Id { get; set; }
    public string? UserName { get; set; }
    public string? Email { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public bool IsActive { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? UpdatedAt { get; set; }
    public List<string> Roles { get; set; } = new();
}

public class UserUpdateDTO
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Email { get; set; }
    public bool? IsActive { get; set; }
    public List<string>? Roles { get; set; }
}

public class ResetPasswordDTO
{
    public required string NewPassword { get; set; }
}

public class UserListResponseDTO
{
    public List<UserDTO> Users { get; set; } = new();
    public int TotalCount { get; set; }
}
