using Dynamo.CMS.API.Contracts;
using Dynamo.CMS.API.Data;
using Dynamo.CMS.API.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace Dynamo.CMS.API.Services;

public interface IVersioningService
{
    Task<ContentVersion> CreateVersionAsync(string collectionName, int entryId, Dictionary<string, object> data, string changeSummary, string userId, string? userName);
    Task<IEnumerable<ContentVersion>> GetVersionsAsync(string collectionName, int entryId);
    Task<ContentVersion?> GetVersionAsync(int versionId);
    Task<ContentVersion?> GetCurrentVersionAsync(string collectionName, int entryId);
    Task<ContentVersion?> RollbackToVersionAsync(int versionId);
    Task<ContentVersionDiffDto> CompareVersionsAsync(int fromVersionId, int toVersionId);
    Task DeleteVersionAsync(int versionId);
}

public class VersioningService : IVersioningService
{
    private readonly AppDbContext _context;
    private readonly ILogger<VersioningService> _logger;

    public VersioningService(AppDbContext context, ILogger<VersioningService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<ContentVersion> CreateVersionAsync(string collectionName, int entryId, Dictionary<string, object> data, string changeSummary, string userId, string? userName)
    {
        // Get next version number
        var lastVersion = await _context.ContentVersions
            .Where(v => v.CollectionName == collectionName && v.EntryId == entryId)
            .OrderByDescending(v => v.VersionNumber)
            .FirstOrDefaultAsync();

        var versionNumber = (lastVersion?.VersionNumber ?? 0) + 1;

        // Mark previous versions as not current
        var currentVersions = await _context.ContentVersions
            .Where(v => v.CollectionName == collectionName && v.EntryId == entryId && v.IsCurrent)
            .ToListAsync();

        foreach (var v in currentVersions)
        {
            v.IsCurrent = false;
        }

        var version = new ContentVersion
        {
            CollectionName = collectionName,
            EntryId = entryId,
            VersionNumber = versionNumber,
            Data = data,
            ChangeSummary = changeSummary,
            CreatedBy = userId,
            CreatedByName = userName,
            IsCurrent = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.ContentVersions.Add(version);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Created version {VersionNumber} for {Collection}/{EntryId}", 
            versionNumber, collectionName, entryId);

        return version;
    }

    public async Task<IEnumerable<ContentVersion>> GetVersionsAsync(string collectionName, int entryId)
    {
        return await _context.ContentVersions
            .Where(v => v.CollectionName == collectionName && v.EntryId == entryId && !v.IsDeleted)
            .OrderByDescending(v => v.VersionNumber)
            .ToListAsync();
    }

    public async Task<ContentVersion?> GetVersionAsync(int versionId)
    {
        return await _context.ContentVersions
            .FirstOrDefaultAsync(v => v.Id == versionId && !v.IsDeleted);
    }

    public async Task<ContentVersion?> GetCurrentVersionAsync(string collectionName, int entryId)
    {
        return await _context.ContentVersions
            .FirstOrDefaultAsync(v => v.CollectionName == collectionName && v.EntryId == entryId && v.IsCurrent && !v.IsDeleted);
    }

    public async Task<ContentVersion?> RollbackToVersionAsync(int versionId)
    {
        var targetVersion = await GetVersionAsync(versionId);
        if (targetVersion == null) return null;

        // Mark all versions as not current
        var currentVersions = await _context.ContentVersions
            .Where(v => v.CollectionName == targetVersion.CollectionName && v.EntryId == targetVersion.EntryId && v.IsCurrent)
            .ToListAsync();

        foreach (var v in currentVersions)
        {
            v.IsCurrent = false;
        }

        // Mark target as current
        targetVersion.IsCurrent = true;
        await _context.SaveChangesAsync();

        _logger.LogInformation("Rolled back to version {VersionId} for {Collection}/{EntryId}", 
            versionId, targetVersion.CollectionName, targetVersion.EntryId);

        return targetVersion;
    }

    public async Task<ContentVersionDiffDto> CompareVersionsAsync(int fromVersionId, int toVersionId)
    {
        var fromVersion = await GetVersionAsync(fromVersionId);
        var toVersion = await GetVersionAsync(toVersionId);

        if (fromVersion == null || toVersion == null)
            throw new ArgumentException("One or both versions not found");

        var changes = new List<FieldChange>();
        var allKeys = fromVersion.Data.Keys.Union(toVersion.Data.Keys).Distinct();

        foreach (var key in allKeys)
        {
            var hasInFrom = fromVersion.Data.TryGetValue(key, out var fromValue);
            var hasInTo = toVersion.Data.TryGetValue(key, out var toValue);

            if (!hasInFrom)
            {
                changes.Add(new FieldChange
                {
                    FieldName = key,
                    ChangeType = "added",
                    OldValue = null,
                    NewValue = toValue
                });
            }
            else if (!hasInTo)
            {
                changes.Add(new FieldChange
                {
                    FieldName = key,
                    ChangeType = "removed",
                    OldValue = fromValue,
                    NewValue = null
                });
            }
            else if (!JsonSerializer.Serialize(fromValue).Equals(JsonSerializer.Serialize(toValue)))
            {
                changes.Add(new FieldChange
                {
                    FieldName = key,
                    ChangeType = "modified",
                    OldValue = fromValue,
                    NewValue = toValue
                });
            }
        }

        return new ContentVersionDiffDto
        {
            FromVersionId = fromVersionId,
            ToVersionId = toVersionId,
            Changes = changes
        };
    }

    public async Task DeleteVersionAsync(int versionId)
    {
        var version = await _context.ContentVersions.FindAsync(versionId);
        if (version != null)
        {
            version.IsDeleted = true;
            await _context.SaveChangesAsync();
            
            _logger.LogInformation("Soft deleted version {VersionId}", versionId);
        }
    }
}
