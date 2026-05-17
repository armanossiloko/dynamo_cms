using Dynamo.CMS.API.Contracts;
using Dynamo.CMS.API.Data;
using Dynamo.CMS.API.Models;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;

namespace Dynamo.CMS.API.Services;

public interface IApiKeyService
{
    Task<ApiKeyDto> GenerateAsync(CreateApiKeyDto dto, long userId);
    Task<ApiKeyDto> RegenerateAsync(int id);
    Task<IEnumerable<ApiKeyListItemDto>> ListByUserAsync(long userId);
    Task<ApiKey?> GetAsync(int id);
    Task<ApiKey> UpdateAsync(int id, UpdateApiKeyDto dto);
    Task DeleteAsync(int id);
    Task<bool> ValidateAsync(string plainKey);
    Task<ApiKeyValidationResultDto> ValidateWithResultAsync(string plainKey);
    Task UpdateLastUsedAsync(int id);
}

public class ApiKeyService : IApiKeyService
{
    private readonly AppDbContext _context;
    private readonly ILogger<ApiKeyService> _logger;

    private const int KeyLength = 32;
    private static readonly char[] KeyChars = 
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".ToCharArray();

    public ApiKeyService(AppDbContext context, ILogger<ApiKeyService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<ApiKeyDto> GenerateAsync(CreateApiKeyDto dto, long userId)
    {
        var plainKey = GenerateRandomKey();
        var keyHash = HashKey(plainKey);

        var scope = dto.Scope?.ToLowerInvariant() switch
        {
            "write" => ApiKeyScope.Write,
            "full" => ApiKeyScope.Full,
            _ => ApiKeyScope.ReadOnly
        };

        var apiKey = new ApiKey
        {
            Name = dto.Name,
            KeyHash = keyHash,
            Scope = scope,
            AllowedCollections = dto.AllowedCollections,
            ExpiresAt = dto.ExpiresAt,
            IsActive = true,
            UserId = userId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.ApiKeys.Add(apiKey);
        await _context.SaveChangesAsync();

        _logger.LogInformation("API key '{KeyName}' created for user {UserId}", dto.Name, userId);

        return new ApiKeyDto
        {
            Id = apiKey.Id,
            Name = apiKey.Name,
            Scope = apiKey.Scope.ToString(),
            AllowedCollections = apiKey.AllowedCollections,
            ExpiresAt = apiKey.ExpiresAt,
            IsActive = apiKey.IsActive,
            CreatedAt = apiKey.CreatedAt,
            UpdatedAt = apiKey.UpdatedAt,
            LastUsedAt = apiKey.LastUsedAt,
            PlainKey = plainKey
        };
    }

    public async Task<ApiKeyDto> RegenerateAsync(int id)
    {
        var apiKey = await _context.ApiKeys.FindAsync(id);
        if (apiKey == null)
            throw new ArgumentException("API key not found");

        var plainKey = GenerateRandomKey();
        apiKey.KeyHash = HashKey(plainKey);
        apiKey.UpdatedAt = DateTime.UtcNow;
        
        await _context.SaveChangesAsync();

        _logger.LogInformation("API key '{KeyName}' regenerated", apiKey.Name);

        return new ApiKeyDto
        {
            Id = apiKey.Id,
            Name = apiKey.Name,
            Scope = apiKey.Scope.ToString(),
            AllowedCollections = apiKey.AllowedCollections,
            ExpiresAt = apiKey.ExpiresAt,
            IsActive = apiKey.IsActive,
            CreatedAt = apiKey.CreatedAt,
            UpdatedAt = apiKey.UpdatedAt,
            LastUsedAt = apiKey.LastUsedAt,
            PlainKey = plainKey
        };
    }

    public async Task<IEnumerable<ApiKeyListItemDto>> ListByUserAsync(long userId)
    {
        return await _context.ApiKeys
            .Where(k => k.UserId == userId)
            .OrderByDescending(k => k.CreatedAt)
            .Select(k => new ApiKeyListItemDto
            {
                Id = k.Id,
                Name = k.Name,
                Scope = k.Scope.ToString(),
                AllowedCollections = k.AllowedCollections,
                ExpiresAt = k.ExpiresAt,
                IsActive = k.IsActive,
                CreatedAt = k.CreatedAt,
                UpdatedAt = k.UpdatedAt,
                LastUsedAt = k.LastUsedAt
            })
            .ToListAsync();
    }

    public async Task<ApiKey?> GetAsync(int id)
    {
        return await _context.ApiKeys.FindAsync(id);
    }

    public async Task<ApiKey> UpdateAsync(int id, UpdateApiKeyDto dto)
    {
        var apiKey = await _context.ApiKeys.FindAsync(id);
        if (apiKey == null)
            throw new ArgumentException("API key not found");

        if (dto.Name != null) apiKey.Name = dto.Name;
        
        if (dto.Scope != null)
        {
            apiKey.Scope = dto.Scope.ToLowerInvariant() switch
            {
                "write" => ApiKeyScope.Write,
                "full" => ApiKeyScope.Full,
                _ => ApiKeyScope.ReadOnly
            };
        }

        if (dto.AllowedCollections != null)
            apiKey.AllowedCollections = dto.AllowedCollections;
        
        if (dto.ExpiresAt.HasValue)
            apiKey.ExpiresAt = dto.ExpiresAt;
        
        if (dto.IsActive.HasValue)
            apiKey.IsActive = dto.IsActive.Value;

        apiKey.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        _logger.LogInformation("API key {KeyId} updated", id);

        return apiKey;
    }

    public async Task DeleteAsync(int id)
    {
        var apiKey = await _context.ApiKeys.FindAsync(id);
        if (apiKey != null)
        {
            _context.ApiKeys.Remove(apiKey);
            await _context.SaveChangesAsync();
            
            _logger.LogInformation("API key '{KeyName}' deleted", apiKey.Name);
        }
    }

    public async Task<bool> ValidateAsync(string plainKey)
    {
        var result = await ValidateWithResultAsync(plainKey);
        return result.IsValid;
    }

    public async Task<ApiKeyValidationResultDto> ValidateWithResultAsync(string plainKey)
    {
        if (string.IsNullOrWhiteSpace(plainKey))
        {
            return new ApiKeyValidationResultDto
            {
                IsValid = false,
                Error = "API key is required"
            };
        }

        var keyHash = HashKey(plainKey);
        var apiKey = await _context.ApiKeys
            .FirstOrDefaultAsync(k => k.KeyHash == keyHash);

        if (apiKey == null)
        {
            return new ApiKeyValidationResultDto
            {
                IsValid = false,
                Error = "Invalid API key"
            };
        }

        if (!apiKey.IsActive)
        {
            return new ApiKeyValidationResultDto
            {
                IsValid = false,
                Error = "API key is revoked"
            };
        }

        if (apiKey.ExpiresAt.HasValue && apiKey.ExpiresAt.Value < DateTime.UtcNow)
        {
            return new ApiKeyValidationResultDto
            {
                IsValid = false,
                Error = "API key has expired"
            };
        }

        return new ApiKeyValidationResultDto
        {
            IsValid = true,
            Scope = apiKey.Scope.ToString(),
            AllowedCollections = apiKey.AllowedCollections
        };
    }

    public async Task UpdateLastUsedAsync(int id)
    {
        var apiKey = await _context.ApiKeys.FindAsync(id);
        if (apiKey != null)
        {
            apiKey.LastUsedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
    }

    private static string GenerateRandomKey()
    {
        var sb = new StringBuilder("dk_live_");
        var random = RandomNumberGenerator.Create();
        var bytes = new byte[KeyLength];
        random.GetBytes(bytes);

        foreach (var b in bytes)
        {
            sb.Append(KeyChars[b % KeyChars.Length]);
        }

        return sb.ToString();
    }

    private static string HashKey(string plainKey)
    {
        using var sha256 = SHA256.Create();
        var hashBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(plainKey));
        return Convert.ToHexString(hashBytes).ToLowerInvariant();
    }
}