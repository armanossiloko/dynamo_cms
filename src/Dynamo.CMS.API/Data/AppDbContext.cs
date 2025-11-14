using Dynamo.CMS.API.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Dynamo.CMS.API.Data;

public class AppDbContext : IdentityDbContext<User, Role, long, UserClaim, UserRole, UserLogin, RoleClaim, UserToken>
{
    public DbSet<BaseType> BaseTypes { get; set; }

    public DbSet<DataCollection> DataCollections { get; set; }

    public DbSet<DataCollectionColumn> DataCollectionColumns { get; set; }

    public DbSet<UploadedFileEntity> UploadedFiles { get; set; }

    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<User>().ToTable("dynamo_users");
        builder.Entity<Role>().ToTable("dynamo_roles");
        builder.Entity<UserClaim>().ToTable("dynamo_user_claims");
        builder.Entity<UserRole>().ToTable("dynamo_user_roles");
        builder.Entity<UserLogin>().ToTable("dynamo_user_logins");
        builder.Entity<RoleClaim>().ToTable("dynamo_role_claims");
        builder.Entity<UserToken>().ToTable("dynamo_user_tokens");

        builder.Entity<DataCollection>()
            .HasMany(e => e.Columns)
            .WithOne(e => e.DataCollection)
            .HasForeignKey(e => e.DataCollectionName)
            .IsRequired();

        builder.Entity<UploadedFileEntity>()
            .HasOne(e => e.Uploader)
            .WithMany()
            .HasForeignKey(e => e.UploadedBy)
            .OnDelete(DeleteBehavior.SetNull);

    }

    /// <summary>
    ///     Adds or updates referential data to the database.
    ///     This method is called once after the migrations have been applied.
    /// </summary>
    /// <remarks>
    ///     Calling this method multiple times should NEVER cause trouble.
    ///     It is recommended to avoid using Database generated PK incremental columns (e.g int, long, etc.) for data that is seeded.
    /// </remarks>
    public void Seed()
    {
        var baseTypes = new List<BaseType>
        {
            new() { Name = "integer", DisplayName = "Integer", DbDataType = "integer", DataType = "int", Description = "Whole number without decimal places" },
            new() { Name = "decimal", DisplayName = "Decimal", DbDataType = "decimal", DataType = "decimal", Description = "Fixed-point number with decimal places" },
            //new() { Name = "smallInt", DisplayName = "Small Integer", DbDataType = "smallint", DataType = "short", Description = "Small whole number without decimal places" },
            new() { Name = "bigint", DisplayName = "Big Integer", DbDataType = "bigint", DataType = "long", Description = "Large whole number without decimal places" },
            //new() { Name = "double", DisplayName = "Double Precision", DbDataType = "double precision", DataType = "double", Description = "Double-precision floating-point number" },
            new() { Name = "boolean", DisplayName = "Boolean", DbDataType = "boolean", DataType = "bool", Description = "Logical true/false value" },
            new() { Name = "datetime", DisplayName = "Date and Time", DbDataType = "timestamp without time zone", DataType = "DateTime", Description = "Date and time representation" },
            new() { Name = "date", DisplayName = "Date", DbDataType = "date", DataType = "DateOnly", Description = "Date representation without time" },
            new() { Name = "time", DisplayName = "Time", DbDataType = "time", DataType = "TimeOnly", Description = "Time representation without date" },
            new() { Name = "string", DisplayName = "String", DbDataType = "varchar", DataType = "string", Description = "Variable-length character data" },
            new() { Name = "text", DisplayName = "Text", DbDataType = "text", DataType = "string", Description = "Variable-length text data" },
            new() { Name = "reference", DisplayName = "Reference", DbDataType = GetDataTypeName<Reference>(), DataType = "object", Description = "Reference to another entity" },
            new() { Name = "file", DisplayName = "File", DbDataType = GetDataTypeName<UploadedFile>(), DataType = "object", Description = "Single file attachment" },
            new() { Name = "file[]", DisplayName = "File Array", DbDataType = ObjectsNpgsqlType, DataType = "object[]", Description = "Multiple file attachments" },
        };

        var existingBaseTypes = BaseTypes.AsNoTracking().ToList();
        foreach (var baseType in baseTypes)
        {
            if (existingBaseTypes.Any(b => b.Name == baseType.Name))
            {
                BaseTypes.Update(baseType);
            }
            else
            {
                BaseTypes.Add(baseType);
            }
        }

        // Add more referential data if / when needed

        SaveChanges();
    }


    /// <summary>
    /// The SQL equivalent of JSON / C# object - this will be the the type of class-type columns in the database.
    /// </summary>
    private const string ObjectsNpgsqlType = "jsonb";
    private const string DefaultPropertyType = "text";

    private static readonly Dictionary<Type, string> _types = new()
    {
        //{ typeof(Size), ObjectsNpgsqlType },
        //{ typeof(Position), ObjectsNpgsqlType },
        { typeof(Reference), ObjectsNpgsqlType },
        { typeof(UploadedFile), ObjectsNpgsqlType },
    };

    public string GetDataTypeName<T>()
    {
        _types.TryGetValue(typeof(T), out var name);
        return name ?? DefaultPropertyType;
    }

}