using Dynamo.CMS.API.Contracts;
using Dynamo.CMS.API.Data;
using Dynamo.CMS.API.Models;
using Microsoft.EntityFrameworkCore;

namespace Dynamo.CMS.API.Services;

public interface ILocalizationService
{
    Task<List<LocaleDto>> GetAllLocalesAsync();
    Task<LocaleDto?> GetLocaleByCodeAsync(string code);
    Task<LocaleDto?> GetDefaultLocaleAsync();
    Task<LocaleDto> CreateLocaleAsync(CreateLocaleDto dto);
    Task<LocaleDto?> UpdateLocaleAsync(int id, UpdateLocaleDto dto);
    Task<bool> DeleteLocaleAsync(int id);
    Task<ContentTranslation?> GetTranslationAsync(string collectionName, int entryId, string localeCode);
    Task<List<ContentTranslation>> GetTranslationsForEntryAsync(string collectionName, int entryId);
    Task<ContentTranslation> CreateTranslationAsync(CreateTranslationDto dto, string userId);
    Task<ContentTranslation?> UpdateTranslationAsync(int id, UpdateTranslationDto dto, string userId);
    Task<bool> DeleteTranslationAsync(int id);
    Task<TranslationStatusDto> GetTranslationStatusAsync(string collectionName, int entryId);
}

public class LocalizationService : ILocalizationService
{
    private readonly AppDbContext _context;

    public LocalizationService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<LocaleDto>> GetAllLocalesAsync()
    {
        return await _context.Locales
            .OrderBy(l => l.SortOrder)
            .ThenBy(l => l.Name)
            .Select(l => new LocaleDto
            {
                Id = l.Id,
                Code = l.Code,
                Name = l.Name,
                NativeName = l.NativeName,
                IsDefault = l.IsDefault,
                IsActive = l.IsActive,
                IsRtl = l.IsRtl,
                FlagEmoji = l.FlagEmoji,
                SortOrder = l.SortOrder,
                CreatedAt = l.CreatedAt,
                UpdatedAt = l.UpdatedAt
            })
            .ToListAsync();
    }

    public async Task<LocaleDto?> GetLocaleByCodeAsync(string code)
    {
        var locale = await _context.Locales.FirstOrDefaultAsync(l => l.Code == code);
        if (locale == null) return null;

        return new LocaleDto
        {
            Id = locale.Id,
            Code = locale.Code,
            Name = locale.Name,
            NativeName = locale.NativeName,
            IsDefault = locale.IsDefault,
            IsActive = locale.IsActive,
            IsRtl = locale.IsRtl,
            FlagEmoji = locale.FlagEmoji,
            SortOrder = locale.SortOrder,
            CreatedAt = locale.CreatedAt,
            UpdatedAt = locale.UpdatedAt
        };
    }

    public async Task<LocaleDto?> GetDefaultLocaleAsync()
    {
        var locale = await _context.Locales.FirstOrDefaultAsync(l => l.IsDefault);
        if (locale == null) return null;

        return new LocaleDto
        {
            Id = locale.Id,
            Code = locale.Code,
            Name = locale.Name,
            NativeName = locale.NativeName,
            IsDefault = locale.IsDefault,
            IsActive = locale.IsActive,
            IsRtl = locale.IsRtl,
            FlagEmoji = locale.FlagEmoji,
            SortOrder = locale.SortOrder,
            CreatedAt = locale.CreatedAt,
            UpdatedAt = locale.UpdatedAt
        };
    }

    public async Task<LocaleDto> CreateLocaleAsync(CreateLocaleDto dto)
    {
        if (dto.IsDefault)
        {
            var existingDefault = await _context.Locales.FirstOrDefaultAsync(l => l.IsDefault);
            if (existingDefault != null)
            {
                existingDefault.IsDefault = false;
                _context.Locales.Update(existingDefault);
            }
        }

        var locale = new Locale
        {
            Code = dto.Code,
            Name = dto.Name,
            NativeName = dto.NativeName,
            IsDefault = dto.IsDefault,
            IsRtl = dto.IsRtl,
            FlagEmoji = dto.FlagEmoji,
            SortOrder = dto.SortOrder
        };

        _context.Locales.Add(locale);
        await _context.SaveChangesAsync();

        return new LocaleDto
        {
            Id = locale.Id,
            Code = locale.Code,
            Name = locale.Name,
            NativeName = locale.NativeName,
            IsDefault = locale.IsDefault,
            IsActive = locale.IsActive,
            IsRtl = locale.IsRtl,
            FlagEmoji = locale.FlagEmoji,
            SortOrder = locale.SortOrder,
            CreatedAt = locale.CreatedAt,
            UpdatedAt = locale.UpdatedAt
        };
    }

    public async Task<LocaleDto?> UpdateLocaleAsync(int id, UpdateLocaleDto dto)
    {
        var locale = await _context.Locales.FindAsync(id);
        if (locale == null) return null;

        if (dto.IsDefault == true)
        {
            var existingDefault = await _context.Locales.FirstOrDefaultAsync(l => l.IsDefault && l.Id != id);
            if (existingDefault != null)
            {
                existingDefault.IsDefault = false;
                _context.Locales.Update(existingDefault);
            }
        }

        if (dto.Name != null) locale.Name = dto.Name;
        if (dto.NativeName != null) locale.NativeName = dto.NativeName;
        if (dto.IsDefault.HasValue) locale.IsDefault = dto.IsDefault.Value;
        if (dto.IsActive.HasValue) locale.IsActive = dto.IsActive.Value;
        if (dto.IsRtl.HasValue) locale.IsRtl = dto.IsRtl.Value;
        if (dto.FlagEmoji != null) locale.FlagEmoji = dto.FlagEmoji;
        if (dto.SortOrder.HasValue) locale.SortOrder = dto.SortOrder.Value;

        locale.UpdatedAt = DateTime.UtcNow;

        _context.Locales.Update(locale);
        await _context.SaveChangesAsync();

        return new LocaleDto
        {
            Id = locale.Id,
            Code = locale.Code,
            Name = locale.Name,
            NativeName = locale.NativeName,
            IsDefault = locale.IsDefault,
            IsActive = locale.IsActive,
            IsRtl = locale.IsRtl,
            FlagEmoji = locale.FlagEmoji,
            SortOrder = locale.SortOrder,
            CreatedAt = locale.CreatedAt,
            UpdatedAt = locale.UpdatedAt
        };
    }

    public async Task<bool> DeleteLocaleAsync(int id)
    {
        var locale = await _context.Locales.FindAsync(id);
        if (locale == null) return false;

        if (locale.IsDefault)
        {
            throw new InvalidOperationException("Cannot delete the default locale");
        }

        _context.Locales.Remove(locale);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<ContentTranslation?> GetTranslationAsync(string collectionName, int entryId, string localeCode)
    {
        return await _context.ContentTranslations
            .Include(t => t.Locale)
            .FirstOrDefaultAsync(t => 
                t.CollectionName == collectionName && 
                t.EntryId == entryId && 
                t.LocaleCode == localeCode);
    }

    public async Task<List<ContentTranslation>> GetTranslationsForEntryAsync(string collectionName, int entryId)
    {
        return await _context.ContentTranslations
            .Include(t => t.Locale)
            .Where(t => t.CollectionName == collectionName && t.EntryId == entryId)
            .ToListAsync();
    }

    public async Task<ContentTranslation> CreateTranslationAsync(CreateTranslationDto dto, string userId)
    {
        var existing = await _context.ContentTranslations.FirstOrDefaultAsync(t =>
            t.CollectionName == dto.CollectionName &&
            t.EntryId == dto.EntryId &&
            t.LocaleCode == dto.LocaleCode);

        if (existing != null)
        {
            throw new InvalidOperationException($"Translation already exists for {dto.CollectionName}/{dto.EntryId}/{dto.LocaleCode}");
        }

        var translation = new ContentTranslation
        {
            CollectionName = dto.CollectionName,
            EntryId = dto.EntryId,
            LocaleCode = dto.LocaleCode,
            TranslatedFields = dto.TranslatedFields,
            IsComplete = dto.IsComplete,
            CompletionPercentage = dto.CompletionPercentage,
            CreatedBy = userId,
            UpdatedBy = userId
        };

        _context.ContentTranslations.Add(translation);
        await _context.SaveChangesAsync();

        return translation;
    }

    public async Task<ContentTranslation?> UpdateTranslationAsync(int id, UpdateTranslationDto dto, string userId)
    {
        var translation = await _context.ContentTranslations.FindAsync(id);
        if (translation == null) return null;

        if (dto.TranslatedFields != null)
            translation.TranslatedFields = dto.TranslatedFields;
        if (dto.IsComplete.HasValue)
            translation.IsComplete = dto.IsComplete.Value;
        if (dto.CompletionPercentage.HasValue)
            translation.CompletionPercentage = dto.CompletionPercentage.Value;

        translation.UpdatedBy = userId;
        translation.UpdatedAt = DateTime.UtcNow;

        _context.ContentTranslations.Update(translation);
        await _context.SaveChangesAsync();

        return translation;
    }

    public async Task<bool> DeleteTranslationAsync(int id)
    {
        var translation = await _context.ContentTranslations.FindAsync(id);
        if (translation == null) return false;

        _context.ContentTranslations.Remove(translation);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<TranslationStatusDto> GetTranslationStatusAsync(string collectionName, int entryId)
    {
        var collection = await _context.DataCollections.FindAsync(collectionName);
        var defaultLocale = collection?.DefaultLocale ?? "en";
        
        var translations = await _context.ContentTranslations
            .Where(t => t.CollectionName == collectionName && t.EntryId == entryId)
            .ToListAsync();

        var allLocales = await _context.Locales.Where(l => l.IsActive).ToListAsync();

        var localeStatuses = allLocales.Select(l =>
        {
            var translation = translations.FirstOrDefault(t => t.LocaleCode == l.Code);
            return new LocaleTranslationStatusDto
            {
                LocaleCode = l.Code,
                Exists = translation != null,
                IsComplete = translation?.IsComplete ?? false,
                CompletionPercentage = translation?.CompletionPercentage ?? 0,
                LastUpdated = translation?.UpdatedAt
            };
        }).ToList();

        return new TranslationStatusDto
        {
            CollectionName = collectionName,
            EntryId = entryId,
            DefaultLocale = defaultLocale,
            LocaleStatuses = localeStatuses
        };
    }
}
