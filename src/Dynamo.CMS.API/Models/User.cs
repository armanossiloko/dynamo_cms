using Microsoft.AspNetCore.Identity;
using System.ComponentModel.DataAnnotations.Schema;

namespace Dynamo.CMS.API.Models;

public class User : IdentityUser<long>
{
    public string? FirstName { get; set; }

    public string? LastName { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset? UpdatedAt { get; set; }

    public bool IsActive { get; set; }

}

public class Role : IdentityRole<long>
{
}

public class UserClaim : IdentityUserClaim<long>
{
}

public class UserRole : IdentityUserRole<long>
{
}

public class UserLogin : IdentityUserLogin<long>
{
}

public class RoleClaim : IdentityRoleClaim<long>
{
}

public class UserToken : IdentityUserToken<long>
{
}