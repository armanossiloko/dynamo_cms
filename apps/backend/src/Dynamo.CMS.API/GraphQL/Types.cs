using Dynamo.CMS.API.Models;

namespace Dynamo.CMS.API.GraphQL;

/// <summary>
/// GraphQL type configurations for models that contain types
/// HotChocolate cannot auto-infer (Dictionary&lt;string, object&gt;, IdentityUser internals).
/// </summary>

public class ComponentDefinitionType : ObjectType<ComponentDefinition>
{
    protected override void Configure(IObjectTypeDescriptor<ComponentDefinition> descriptor)
    {
        descriptor.Field(f => f.Schema).Ignore();
        descriptor.Field(f => f.DefaultData).Ignore();
        descriptor.Field(f => f.ValidationRules).Ignore();
    }
}

public class ContentVersionType : ObjectType<ContentVersion>
{
    protected override void Configure(IObjectTypeDescriptor<ContentVersion> descriptor)
    {
        descriptor.Field(f => f.Data).Ignore();
    }
}

public class WebhookType : ObjectType<Webhook>
{
    protected override void Configure(IObjectTypeDescriptor<Webhook> descriptor)
    {
        descriptor.Field(f => f.Deliveries).Ignore();
    }
}

public class WebhookDeliveryType : ObjectType<WebhookDelivery>
{
    protected override void Configure(IObjectTypeDescriptor<WebhookDelivery> descriptor)
    {
        descriptor.Field(f => f.Payload).Ignore();
        descriptor.Field(f => f.Webhook).Ignore();
    }
}

public class ContentTranslationType : ObjectType<ContentTranslation>
{
    protected override void Configure(IObjectTypeDescriptor<ContentTranslation> descriptor)
    {
        descriptor.Field(f => f.TranslatedFields).Ignore();
    }
}

public class LocaleType : ObjectType<Locale>
{
    protected override void Configure(IObjectTypeDescriptor<Locale> descriptor)
    {
        descriptor.Field(f => f.ContentTranslations).Ignore();
    }
}

public class UserType : ObjectType<User>
{
    protected override void Configure(IObjectTypeDescriptor<User> descriptor)
    {
        // Only expose safe fields, ignore IdentityUser internals
        descriptor.Field(f => f.Id);
        descriptor.Field(f => f.UserName);
        descriptor.Field(f => f.Email);
        descriptor.Field(f => f.FirstName);
        descriptor.Field(f => f.LastName);
        descriptor.Field(f => f.IsActive);
        descriptor.Field(f => f.CreatedAt);
        descriptor.Field(f => f.UpdatedAt);
        descriptor.Field(f => f.EmailConfirmed);

        // Ignore sensitive IdentityUser properties
        descriptor.Field(f => f.PasswordHash).Ignore();
        descriptor.Field(f => f.SecurityStamp).Ignore();
        descriptor.Field(f => f.ConcurrencyStamp).Ignore();
        descriptor.Field(f => f.PhoneNumber).Ignore();
        descriptor.Field(f => f.PhoneNumberConfirmed).Ignore();
        descriptor.Field(f => f.TwoFactorEnabled).Ignore();
        descriptor.Field(f => f.LockoutEnd).Ignore();
        descriptor.Field(f => f.LockoutEnabled).Ignore();
        descriptor.Field(f => f.AccessFailedCount).Ignore();
        descriptor.Field(f => f.NormalizedUserName).Ignore();
        descriptor.Field(f => f.NormalizedEmail).Ignore();
    }
}
