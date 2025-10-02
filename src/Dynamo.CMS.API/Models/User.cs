using Microsoft.AspNetCore.Identity;
using System.ComponentModel.DataAnnotations.Schema;

namespace Dynamo.CMS.API.Models;

[Table("users")]
public class User : IdentityUser<long>
{
    public string? FirstName { get; set; }

    public string? LastName { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset? UpdatedAt { get; set; }

    public bool IsActive { get; set; }

}

[Table("roles")]
public class Role : IdentityRole<long>
{
}

[Table("user_claims")]
public class UserClaim : IdentityUserClaim<long>
{
}

[Table("user_roles")]
public class UserRole : IdentityUserRole<long>
{
}

[Table("user_logins")]
public class UserLogin : IdentityUserLogin<long>
{
}

[Table("role_claims")]
public class RoleClaim : IdentityRoleClaim<long>
{
}

[Table("user_tokens")]
public class UserToken : IdentityUserToken<long>
{
}