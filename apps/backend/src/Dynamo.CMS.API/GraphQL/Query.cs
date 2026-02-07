using Dynamo.CMS.API.Data;
using Dynamo.CMS.API.Models;
using Microsoft.EntityFrameworkCore;

namespace Dynamo.CMS.API.GraphQL;

public class Query
{
    [UsePaging]
    [UseProjection]
    [UseFiltering]
    [UseSorting]
    public IQueryable<DataCollection> GetCollections(AppDbContext context)
    {
        return context.DataCollections.AsNoTracking();
    }

    public async Task<DataCollection?> GetCollection(string name, AppDbContext context)
    {
        return await context.DataCollections
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Name == name);
    }

    public async Task<IEnumerable<Locale>> GetLocales(AppDbContext context)
    {
        return await context.Locales
            .Where(l => l.IsActive)
            .OrderBy(l => l.SortOrder)
            .ToListAsync();
    }

    public async Task<Locale?> GetDefaultLocale(AppDbContext context)
    {
        return await context.Locales
            .FirstOrDefaultAsync(l => l.IsDefault);
    }

    public async Task<IEnumerable<ComponentDefinition>> GetComponents(AppDbContext context)
    {
        return await context.Components
            .Where(c => c.IsActive)
            .OrderBy(c => c.Category)
            .ThenBy(c => c.DisplayName)
            .ToListAsync();
    }

    public async Task<IEnumerable<Webhook>> GetWebhooks(AppDbContext context)
    {
        return await context.Webhooks
            .OrderByDescending(w => w.CreatedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<ContentVersion>> GetVersions(
        string collectionName, 
        int entryId,
        AppDbContext context)
    {
        return await context.ContentVersions
            .Where(v => v.CollectionName == collectionName && v.EntryId == entryId && !v.IsDeleted)
            .OrderByDescending(v => v.VersionNumber)
            .ToListAsync();
    }

    [UsePaging]
    [UseProjection]
    [UseFiltering]
    [UseSorting]
    [HotChocolate.Authorization.Authorize(Roles = new[] { "Admin" })]
    public IQueryable<User> GetUsers(AppDbContext context)
    {
        return context.Users.AsNoTracking();
    }

    [HotChocolate.Authorization.Authorize]
    public async Task<User?> GetMe(AppDbContext context, string userId)
    {
        return await context.Users.FindAsync(long.Parse(userId));
    }
}
