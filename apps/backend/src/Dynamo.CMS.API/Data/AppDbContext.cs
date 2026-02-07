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

    public DbSet<Locale> Locales { get; set; }

    public DbSet<ContentTranslation> ContentTranslations { get; set; }

    public DbSet<ComponentDefinition> Components { get; set; }

    public DbSet<MediaFolder> MediaFolders { get; set; }

    public DbSet<MediaTransformation> MediaTransformations { get; set; }

    public DbSet<Webhook> Webhooks { get; set; }

    public DbSet<WebhookDelivery> WebhookDeliveries { get; set; }

    public DbSet<ScheduledJob> ScheduledJobs { get; set; }

    public DbSet<ContentVersion> ContentVersions { get; set; }

    public DbSet<SingleType> SingleTypes { get; set; }

    public DbSet<SingleTypeField> SingleTypeFields { get; set; }

    public DbSet<SingleTypeData> SingleTypeData { get; set; }

    public DbSet<FieldOption> FieldOptions { get; set; }

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

        // Locale configuration
        builder.Entity<Locale>().ToTable("dynamo_locales");
        builder.Entity<Locale>().HasIndex(e => e.Code).IsUnique();
        builder.Entity<Locale>().Property(e => e.Code).HasMaxLength(10);
        builder.Entity<Locale>().Property(e => e.Name).HasMaxLength(255);
        builder.Entity<Locale>().Property(e => e.NativeName).HasMaxLength(255);
        builder.Entity<Locale>().Property(e => e.FlagEmoji).HasMaxLength(10);

        // ContentTranslation configuration
        builder.Entity<ContentTranslation>().ToTable("dynamo_content_translations");
        builder.Entity<ContentTranslation>().HasIndex(e => new { e.CollectionName, e.EntryId, e.LocaleCode }).IsUnique();
        builder.Entity<ContentTranslation>().Property(e => e.CollectionName).HasMaxLength(255);
        builder.Entity<ContentTranslation>().Property(e => e.LocaleCode).HasMaxLength(10);
        builder.Entity<ContentTranslation>().Property(e => e.TranslatedFields).HasColumnType("jsonb");
        builder.Entity<ContentTranslation>()
            .HasOne(e => e.Locale)
            .WithMany(e => e.ContentTranslations)
            .HasForeignKey(e => e.LocaleCode)
            .HasPrincipalKey(e => e.Code);

        // ComponentDefinition configuration
        builder.Entity<ComponentDefinition>().ToTable("dynamo_components");
        builder.Entity<ComponentDefinition>().HasIndex(e => e.Name).IsUnique();
        builder.Entity<ComponentDefinition>().Property(e => e.Name).HasMaxLength(255);
        builder.Entity<ComponentDefinition>().Property(e => e.DisplayName).HasMaxLength(255);
        builder.Entity<ComponentDefinition>().Property(e => e.Category).HasMaxLength(100).HasDefaultValue("Content");
        builder.Entity<ComponentDefinition>().Property(e => e.Icon).HasMaxLength(100);
        builder.Entity<ComponentDefinition>().Property(e => e.DefaultData).HasColumnType("jsonb");
        builder.Entity<ComponentDefinition>().Property(e => e.Schema).HasColumnType("jsonb");
        builder.Entity<ComponentDefinition>().Property(e => e.ValidationRules).HasColumnType("jsonb");


        // MediaFolder configuration
        builder.Entity<MediaFolder>().ToTable("dynamo_media_folders");
        builder.Entity<MediaFolder>().Property(e => e.Name).HasMaxLength(255);
        builder.Entity<MediaFolder>().Property(e => e.Path).HasMaxLength(1000);
        builder.Entity<MediaFolder>()
            .HasOne(e => e.Parent)
            .WithMany(e => e.Children)
            .HasForeignKey(e => e.ParentId)
            .OnDelete(DeleteBehavior.Cascade);

        // MediaTransformation configuration
        builder.Entity<MediaTransformation>().ToTable("dynamo_media_transformations");
        builder.Entity<MediaTransformation>().HasIndex(e => new { e.FileId, e.TransformationKey }).IsUnique();
        builder.Entity<MediaTransformation>().Property(e => e.TransformationKey).HasMaxLength(255);
        builder.Entity<MediaTransformation>().Property(e => e.FilePath).HasMaxLength(1000);
        builder.Entity<MediaTransformation>()
            .HasOne(e => e.File)
            .WithMany(e => e.CachedTransformations)
            .HasForeignKey(e => e.FileId);

        // UploadedFileEntity JSON properties
        builder.Entity<UploadedFileEntity>().Property(e => e.Metadata).HasColumnType("jsonb");
        builder.Entity<UploadedFileEntity>().Property(e => e.Transformations).HasColumnType("jsonb");
        builder.Entity<UploadedFileEntity>().Property(e => e.Tags).HasColumnType("text[]");

        // Webhook configuration
        builder.Entity<Webhook>().ToTable("dynamo_webhooks");
        builder.Entity<Webhook>().Property(e => e.Name).HasMaxLength(255);
        builder.Entity<Webhook>().Property(e => e.Url).HasMaxLength(2048);
        builder.Entity<Webhook>().Property(e => e.HttpMethod).HasMaxLength(10);
        builder.Entity<Webhook>().Property(e => e.Events).HasColumnType("jsonb");
        builder.Entity<Webhook>().Property(e => e.Headers).HasColumnType("jsonb");
        builder.Entity<Webhook>().Property(e => e.SecretKey).HasMaxLength(255);
        builder.Entity<Webhook>().HasIndex(e => e.IsActive);

        // WebhookDelivery configuration
        builder.Entity<WebhookDelivery>().ToTable("dynamo_webhook_deliveries");
        builder.Entity<WebhookDelivery>().Property(e => e.EventName).HasMaxLength(255);
        builder.Entity<WebhookDelivery>().Property(e => e.Payload).HasColumnType("jsonb");
        builder.Entity<WebhookDelivery>().Property(e => e.Response).HasColumnType("text");
        builder.Entity<WebhookDelivery>().Property(e => e.ResponseHeaders).HasColumnType("jsonb");
        builder.Entity<WebhookDelivery>().Property(e => e.ErrorMessage).HasColumnType("text");
        builder.Entity<WebhookDelivery>().HasIndex(e => e.WebhookId);
        builder.Entity<WebhookDelivery>().HasIndex(e => e.SentAt);
        builder.Entity<WebhookDelivery>().HasIndex(e => new { e.IsSuccess, e.NextRetryAt });
        builder.Entity<WebhookDelivery>()
            .HasOne(e => e.Webhook)
            .WithMany(e => e.Deliveries)
            .HasForeignKey(e => e.WebhookId)
            .OnDelete(DeleteBehavior.Cascade);

        // ScheduledJob configuration
        builder.Entity<ScheduledJob>().ToTable("dynamo_scheduled_jobs");
        builder.Entity<ScheduledJob>().Property(e => e.JobType).HasMaxLength(50);
        builder.Entity<ScheduledJob>().Property(e => e.CollectionName).HasMaxLength(255);
        builder.Entity<ScheduledJob>().HasIndex(e => new { e.IsCompleted, e.ScheduledAt });
        builder.Entity<ScheduledJob>().HasIndex(e => new { e.CollectionName, e.EntryId });

        // ContentVersion configuration
        builder.Entity<ContentVersion>().ToTable("dynamo_content_versions");
        builder.Entity<ContentVersion>().Property(e => e.CollectionName).HasMaxLength(255);
        builder.Entity<ContentVersion>().Property(e => e.Data).HasColumnType("jsonb");
        builder.Entity<ContentVersion>().Property(e => e.ChangeSummary).HasColumnType("text");
        builder.Entity<ContentVersion>().Property(e => e.CreatedByName).HasMaxLength(255);
        builder.Entity<ContentVersion>().HasIndex(e => new { e.CollectionName, e.EntryId });
        builder.Entity<ContentVersion>().HasIndex(e => new { e.IsCurrent, e.IsDeleted });

        // SingleType configuration
        builder.Entity<SingleType>().ToTable("dynamo_single_types");
        builder.Entity<SingleType>().HasIndex(e => e.ApiId).IsUnique();
        builder.Entity<SingleType>().Property(e => e.Name).HasMaxLength(255).IsRequired();
        builder.Entity<SingleType>().Property(e => e.ApiId).HasMaxLength(255).IsRequired();
        builder.Entity<SingleType>().Property(e => e.Plugin).HasMaxLength(100);
        builder.Entity<SingleType>()
            .HasMany(e => e.Fields)
            .WithOne(e => e.SingleType)
            .HasForeignKey(e => e.SingleTypeId)
            .OnDelete(DeleteBehavior.Cascade);

        // SingleTypeField configuration
        builder.Entity<SingleTypeField>().ToTable("dynamo_single_type_fields");
        builder.Entity<SingleTypeField>().HasIndex(e => new { e.SingleTypeId, e.ApiId }).IsUnique();
        builder.Entity<SingleTypeField>().Property(e => e.Name).HasMaxLength(255).IsRequired();
        builder.Entity<SingleTypeField>().Property(e => e.ApiId).HasMaxLength(255).IsRequired();
        builder.Entity<SingleTypeField>().Property(e => e.Type).HasMaxLength(50).IsRequired();
        builder.Entity<SingleTypeField>().Property(e => e.RelatedCollectionName).HasMaxLength(255);
        builder.Entity<SingleTypeField>().Property(e => e.Placeholder).HasMaxLength(500);
        builder.Entity<SingleTypeField>().Property(e => e.CustomProperties).HasColumnType("jsonb");

        // SingleTypeData configuration
        builder.Entity<SingleTypeData>().ToTable("dynamo_single_type_data");
        builder.Entity<SingleTypeData>().HasIndex(e => new { e.SingleTypeId, e.SingletonKey, e.Locale }).IsUnique();
        builder.Entity<SingleTypeData>().HasIndex(e => new { e.SingleTypeId, e.Locale });
        builder.Entity<SingleTypeData>().HasIndex(e => e.Status);
        builder.Entity<SingleTypeData>().Property(e => e.Data).HasColumnType("jsonb").IsRequired();
        builder.Entity<SingleTypeData>().Property(e => e.Locale).HasMaxLength(10).HasDefaultValue("en");
        builder.Entity<SingleTypeData>()
            .HasOne(e => e.SingleType)
            .WithMany()
            .HasForeignKey(e => e.SingleTypeId)
            .OnDelete(DeleteBehavior.Cascade);

        // FieldOption configuration
        builder.Entity<FieldOption>().ToTable("dynamo_field_options");
        builder.Entity<FieldOption>().Property(e => e.Label).HasMaxLength(255).IsRequired();
        builder.Entity<FieldOption>().Property(e => e.Value).HasMaxLength(255).IsRequired();

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
            new() { Name = "richtext", DisplayName = "Rich Text", DbDataType = ObjectsNpgsqlType, DataType = "object", Description = "Rich text content with formatting stored as JSON" },
            new() { Name = "reference", DisplayName = "Reference", DbDataType = GetDataTypeName<Reference>(), DataType = "object", Description = "Reference to another entity" },
            new() { Name = "file", DisplayName = "File", DbDataType = GetDataTypeName<UploadedFile>(), DataType = "object", Description = "Single file attachment" },
            new() { Name = "file[]", DisplayName = "File Array", DbDataType = ObjectsNpgsqlType, DataType = "object[]", Description = "Multiple file attachments" },
            new() { Name = "dynamiczone", DisplayName = "Dynamic Zone", DbDataType = ObjectsNpgsqlType, DataType = "object", Description = "Array of reusable components" },
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

        // Seed default locales
        var locales = new List<Locale>
        {
            new() { Code = "en", Name = "English", NativeName = "English", IsDefault = true, FlagEmoji = "🇺🇸", IsRtl = false },
            new() { Code = "es", Name = "Spanish", NativeName = "Español", IsDefault = false, FlagEmoji = "🇪🇸", IsRtl = false },
            new() { Code = "fr", Name = "French", NativeName = "Français", IsDefault = false, FlagEmoji = "🇫🇷", IsRtl = false },
            new() { Code = "de", Name = "German", NativeName = "Deutsch", IsDefault = false, FlagEmoji = "🇩🇪", IsRtl = false },
            new() { Code = "ja", Name = "Japanese", NativeName = "日本語", IsDefault = false, FlagEmoji = "🇯🇵", IsRtl = false },
        };

        var existingLocales = Locales.AsNoTracking().ToList();
        foreach (var locale in locales)
        {
            if (existingLocales.Any(l => l.Code == locale.Code))
            {
                Locales.Update(locale);
            }
            else
            {
                Locales.Add(locale);
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
        { typeof(Reference), ObjectsNpgsqlType },
        { typeof(UploadedFile), ObjectsNpgsqlType },
    };

    public string GetDataTypeName<T>()
    {
        _types.TryGetValue(typeof(T), out var name);
        return name ?? DefaultPropertyType;
    }

}