# Caching Layer

## Overview
Implement multi-layered caching using Redis for improved performance and scalability.

## Priority: 9 (Medium)
Effective way to improve application performance and reduce database load.

## Implementation Plan

### Backend Changes

#### 1. Install Redis Packages
```xml
<PackageReference Include="Microsoft.Extensions.Caching.StackExchangeRedis" Version="9.0.0" />
<PackageReference Include="EasyCaching.Core" Version="1.9.0" />
<PackageReference Include="EasyCaching.Redis" Version="1.9.0" />
<PackageReference Include="EasyCaching.Serialization.SystemTextJson" Version="1.9.0" />
```

#### 2. Configure Redis Cache
**File: `backend/src/Dynamo.CMS.API/Program.cs`**
```csharp
builder.Services.AddEasyCaching(options =>
{
    options.UseRedis(config =>
    {
        config.DBConfig.ConfigurationOptions = ConfigurationOptions.Parse(builder.Configuration["Redis:ConnectionString"]);
        config.DBConfig.ConnectionName = "Default";
        config.SerializerName = "Json";
    }, "redis")
    .WithMessagePack("messagepack")
    .WithSystemTextJson("json");
});
```

#### 3. Create Cache Service
**File: `backend/src/Dynamo.CMS.API/Services/CacheService.cs`**
```csharp
public interface ICacheService
{
    Task<T?> GetAsync<T>(string key);
    Task SetAsync<T>(string key, T value, TimeSpan? expiration = null);
    Task RemoveAsync(string key);
    Task RemoveByPrefixAsync(string prefix);
    Task<T?> GetOrCreateAsync<T>(string key, Func<Task<T>> factory, TimeSpan? expiration = null);
}

public class CacheService : ICacheService
{
    private readonly IEasyCachingProvider _cacheProvider;

    public async Task<T?> GetAsync<T>(string key)
    {
        var result = await _cacheProvider.GetAsync<T>(key);
        return result.HasValue ? result.Value : default;
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan? expiration = null)
    {
        await _cacheProvider.SetAsync(key, value, expiration ?? TimeSpan.FromMinutes(30));
    }

    public async Task<T?> GetOrCreateAsync<T>(string key, Func<Task<T>> factory, TimeSpan? expiration = null)
    {
        var result = await _cacheProvider.GetOrSetAsync(key, async () => await factory(), expiration);
        return result.HasValue ? result.Value : default;
    }

    public async Task RemoveByPrefixAsync(string prefix)
    {
        var keys = await GetAllKeysAsync(prefix);
        foreach (var key in keys)
        {
            await _cacheProvider.RemoveAsync(key);
        }
    }
}
```

#### 4. Cache Decorators for Data Service
**File: `backend/src/Dynamo.CMS.API/Services/DataServiceCacheDecorator.cs`**
```csharp
public class DataServiceCacheDecorator : IDataService
{
    private readonly IDataService _inner;
    private readonly ICacheService _cache;

    public async Task<IEnumerable<Dictionary<string, object>>> GetAllAsync(string collection)
    {
        var cacheKey = $"collection:{collection}:all";
        return await _cache.GetOrCreateAsync(cacheKey, async () =>
            await _inner.GetAllAsync(collection),
            TimeSpan.FromMinutes(5));
    }

    public async Task<Dictionary<string, object>?> GetByIdAsync(string collection, string id)
    {
        var cacheKey = $"collection:{collection}:entry:{id}";
        return await _cache.GetOrCreateAsync(cacheKey, async () =>
            await _inner.GetByIdAsync(collection, id),
            TimeSpan.FromHours(1));
    }

    public async Task<int> CreateAsync(string collection, Dictionary<string, object> data)
    {
        var result = await _inner.CreateAsync(collection, data);
        await _cache.RemoveByPrefixAsync($"collection:{collection}");
        return result;
    }

    public async Task<bool> UpdateAsync(string collection, string id, Dictionary<string, object> data)
    {
        var result = await _inner.UpdateAsync(collection, id, data);
        if (result)
        {
            await _cache.RemoveAsync($"collection:{collection}:entry:{id}");
            await _cache.RemoveByPrefixAsync($"collection:{collection}");
        }
        return result;
    }

    public async Task<bool> DeleteAsync(string collection, string id)
    {
        var result = await _inner.DeleteAsync(collection, id);
        if (result)
        {
            await _cache.RemoveAsync($"collection:{collection}:entry:{id}");
            await _cache.RemoveByPrefixAsync($"collection:{collection}");
        }
        return result;
    }
}
```

#### 5. Cache Attributes
**File: `backend/src/Dynamo.CMS.API/Attributes/CacheAttribute.cs`**
```csharp
[AttributeUsage(AttributeTargets.Method)]
public class CacheAttribute : Attribute
{
    public int DurationSeconds { get; set; } = 300;
    public string KeyPrefix { get; set; } = "";
}

public class InvalidateCacheAttribute : Attribute
{
    public string KeyPrefix { get; set; } = "";
}
```

#### 6. Cache Middleware
**File: `backend/src/Dynamo.CMS.API/Middleware/CacheMiddleware.cs`**
```csharp
public class CacheMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ICacheService _cache;

    public async Task InvokeAsync(HttpContext context)
    {
        if (context.Request.Method != "GET")
        {
            await _next(context);
            return;
        }

        var cacheKey = $"request:{context.Request.Path}{context.Request.QueryString}";
        var cachedResponse = await _cache.GetAsync<CachedResponse>(cacheKey);

        if (cachedResponse != null)
        {
            context.Response.StatusCode = cachedResponse.StatusCode;
            context.Response.ContentType = cachedResponse.ContentType;
            await context.Response.WriteAsync(cachedResponse.Body);
            return;
        }

        var originalBodyStream = context.Response.Body;
        using var responseBody = new MemoryStream();
        context.Response.Body = responseBody;

        await _next(context);

        var response = await _cacheResponse(context);
        await _cache.SetAsync(cacheKey, response, TimeSpan.FromMinutes(5));

        await responseBody.CopyToAsync(originalBodyStream);
    }
}
```

#### 7. Update Program.cs
```csharp
builder.Services.AddScoped<ICacheService, CacheService>();
builder.Services.Decorate<IDataService, DataServiceCacheDecorator>();

app.UseMiddleware<CacheMiddleware>();
```

### Frontend Changes

#### 1. Angular HTTP Caching
```typescript
import { withInterceptorsFromDi, provideHttpClient, withCacheEnabled } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
      withInterceptorsFromDi(),
      withCacheEnabled()
    )
  ]
};
```

#### 2. Custom Cache Service
**File: `frontend/src/app/services/cache.service.ts`**
```typescript
@Injectable({ providedIn: 'root' })
export class CacheService {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  set<T>(key: string, data: T, ttl: number = 300000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  invalidate(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}
```

## Dependencies

### Backend
```xml
<PackageReference Include="Microsoft.Extensions.Caching.StackExchangeRedis" Version="9.0.0" />
<PackageReference Include="EasyCaching.Core" Version="1.9.0" />
<PackageReference Include="EasyCaching.Redis" Version="1.9.0" />
```

## Rollout Plan

1. **Phase 1**: Install and configure Redis
2. **Phase 2**: Create cache service
3. **Phase 3**: Add cache decorators
4. **Phase 4**: Implement response caching
5. **Phase 5**: Add cache invalidation
6. **Phase 6**: Add cache monitoring
7. **Phase 7**: Implement frontend caching
8. **Phase 8**: Add cache stats/metrics

## Success Criteria

- Redis cache configured and working
- Data service calls are cached
- Response caching for GET requests
- Cache invalidation on updates
- Cache statistics available
- Frontend caching implemented
