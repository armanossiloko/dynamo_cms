using Dynamo.CMS.API.Contracts;
using Dynamo.CMS.API.Data;
using Dynamo.CMS.API.Models;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Dynamo.CMS.API.Services;

public interface IWebhookService
{
    Task<Webhook> CreateWebhookAsync(CreateWebhookDto dto, string userId);
    Task<Webhook?> GetWebhookAsync(int id);
    Task<IEnumerable<Webhook>> GetAllWebhooksAsync(bool activeOnly = false);
    Task<IEnumerable<Webhook>> GetWebhooksForEventAsync(string eventName);
    Task<Webhook> UpdateWebhookAsync(int id, UpdateWebhookDto dto);
    Task DeleteWebhookAsync(int id);
    Task TriggerWebhooksAsync(string eventName, object payload);
    Task TriggerWebhooksAsync(string eventName, string collectionName, object payload);
    Task TestWebhookAsync(int id, WebhookTestDto dto);
    Task<WebhookDelivery> CreateDeliveryAsync(Webhook webhook, string eventName, object payload);
    Task UpdateDeliveryStatusAsync(int deliveryId, HttpResponseMessage response, TimeSpan duration);
    Task UpdateDeliveryErrorAsync(int deliveryId, Exception error, TimeSpan duration);
    Task<IEnumerable<WebhookDelivery>> GetDeliveriesAsync(int webhookId, int page = 1, int pageSize = 20);
    Task<WebhookDelivery?> GetDeliveryAsync(int id);
    Task RetryDeliveryAsync(int deliveryId);
    Task<WebhookStatsDto> GetStatsAsync();
    Task ProcessRetriesAsync();
}

public class WebhookService : IWebhookService
{
    private readonly AppDbContext _context;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<WebhookService> _logger;

    public WebhookService(
        AppDbContext context,
        IHttpClientFactory httpClientFactory,
        ILogger<WebhookService> logger)
    {
        _context = context;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<Webhook> CreateWebhookAsync(CreateWebhookDto dto, string userId)
    {
        var webhook = new Webhook
        {
            Name = dto.Name,
            Url = dto.Url,
            HttpMethod = dto.HttpMethod ?? "POST",
            Events = dto.Events ?? [],
            Headers = dto.Headers,
            SecretKey = dto.SecretKey,
            TimeoutSeconds = dto.TimeoutSeconds ?? 30,
            MaxRetries = dto.MaxRetries ?? 3,
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Webhooks.Add(webhook);
        await _context.SaveChangesAsync();
        return webhook;
    }

    public async Task<Webhook?> GetWebhookAsync(int id)
    {
        return await _context.Webhooks.FindAsync(id);
    }

    public async Task<IEnumerable<Webhook>> GetAllWebhooksAsync(bool activeOnly = false)
    {
        var query = _context.Webhooks.AsQueryable();
        if (activeOnly)
        {
            query = query.Where(w => w.IsActive);
        }
        return await query.ToListAsync();
    }

    public async Task<IEnumerable<Webhook>> GetWebhooksForEventAsync(string eventName)
    {
        return await _context.Webhooks
            .Where(w => w.IsActive && w.Events.Contains(eventName))
            .ToListAsync();
    }

    public async Task<Webhook> UpdateWebhookAsync(int id, UpdateWebhookDto dto)
    {
        var webhook = await _context.Webhooks.FindAsync(id);
        if (webhook == null) throw new ArgumentException("Webhook not found");

        if (dto.Name != null) webhook.Name = dto.Name;
        if (dto.Url != null) webhook.Url = dto.Url;
        if (dto.HttpMethod != null) webhook.HttpMethod = dto.HttpMethod;
        if (dto.Events != null) webhook.Events = dto.Events;
        if (dto.Headers != null) webhook.Headers = dto.Headers;
        if (dto.IsActive.HasValue) webhook.IsActive = dto.IsActive.Value;
        if (dto.SecretKey != null) webhook.SecretKey = dto.SecretKey;
        if (dto.TimeoutSeconds.HasValue) webhook.TimeoutSeconds = dto.TimeoutSeconds.Value;
        if (dto.MaxRetries.HasValue) webhook.MaxRetries = dto.MaxRetries.Value;

        webhook.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return webhook;
    }

    public async Task DeleteWebhookAsync(int id)
    {
        var webhook = await _context.Webhooks.FindAsync(id);
        if (webhook != null)
        {
            _context.Webhooks.Remove(webhook);
            await _context.SaveChangesAsync();
        }
    }

    public async Task TriggerWebhooksAsync(string eventName, object payload)
    {
        var webhooks = await GetWebhooksForEventAsync(eventName);
        if (!webhooks.Any())
        {
            _logger.LogDebug("No webhooks configured for event: {EventName}", eventName);
            return;
        }

        foreach (var webhook in webhooks)
        {
            _ = Task.Run(async () =>
            {
                try
                {
                    await ExecuteWebhookAsync(webhook, eventName, payload);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to execute webhook {WebhookId} for event {EventName}", 
                        webhook.Id, eventName);
                }
            });
        }
    }

    public async Task TriggerWebhooksAsync(string eventName, string collectionName, object payload)
    {
        await TriggerWebhooksAsync(eventName, new { collection = collectionName, data = payload });
    }

    public async Task TestWebhookAsync(int id, WebhookTestDto dto)
    {
        var webhook = await GetWebhookAsync(id);
        if (webhook == null) throw new ArgumentException("Webhook not found");

        await ExecuteWebhookAsync(webhook, dto.EventName, dto.Payload ?? new Dictionary<string, object>());
    }

    private async Task ExecuteWebhookAsync(Webhook webhook, string eventName, object payload)
    {
        var delivery = await CreateDeliveryAsync(webhook, eventName, payload);
        var startTime = DateTime.UtcNow;

        try
        {
            using var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(webhook.TimeoutSeconds);

            var request = new HttpRequestMessage(
                new HttpMethod(webhook.HttpMethod), 
                webhook.Url);

            var webhookPayload = new
            {
                event_ = eventName,
                timestamp = DateTime.UtcNow.ToString("o"),
                data = payload
            };

            var jsonPayload = JsonSerializer.Serialize(webhookPayload, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            });

            request.Content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

            if (webhook.Headers != null)
            {
                foreach (var header in webhook.Headers)
                {
                    request.Headers.TryAddWithoutValidation(header.Key, header.Value);
                }
            }

            if (!string.IsNullOrEmpty(webhook.SecretKey))
            {
                var signature = ComputeSignature(jsonPayload, webhook.SecretKey);
                request.Headers.Add("X-Webhook-Signature", signature);
                request.Headers.Add("X-Webhook-Timestamp", DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString());
            }

            request.Headers.Add("X-Webhook-Id", delivery.Id.ToString());
            request.Headers.Add("X-Event-Name", eventName);
            request.Headers.Add("User-Agent", "DynamoCMS-Webhook/1.0");

            var response = await client.SendAsync(request);
            var duration = DateTime.UtcNow - startTime;

            await UpdateDeliveryStatusAsync(delivery.Id, response, duration);

            if (response.IsSuccessStatusCode)
            {
                webhook.SuccessCount++;
                webhook.LastTriggeredAt = DateTime.UtcNow;
                webhook.LastError = null;
            }
            else
            {
                webhook.FailureCount++;
                webhook.LastError = $"HTTP {(int)response.StatusCode}";
                
                if (delivery.RetryCount < webhook.MaxRetries)
                {
                    delivery.NextRetryAt = DateTime.UtcNow.AddSeconds(
                        webhook.RetryDelaySeconds * (int)Math.Pow(2, delivery.RetryCount));
                }
            }

            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            var duration = DateTime.UtcNow - startTime;
            await UpdateDeliveryErrorAsync(delivery.Id, ex, duration);
            
            webhook.FailureCount++;
            webhook.LastError = ex.Message;
            
            if (delivery.RetryCount < webhook.MaxRetries)
            {
                delivery.NextRetryAt = DateTime.UtcNow.AddSeconds(
                    webhook.RetryDelaySeconds * (int)Math.Pow(2, delivery.RetryCount));
            }
            
            await _context.SaveChangesAsync();
            _logger.LogError(ex, "Webhook delivery failed for {WebhookId}", webhook.Id);
        }
    }

    public async Task<WebhookDelivery> CreateDeliveryAsync(Webhook webhook, string eventName, object payload)
    {
        var delivery = new WebhookDelivery
        {
            WebhookId = webhook.Id,
            EventName = eventName,
            Payload = payload is Dictionary<string, object> dict ? dict : 
                JsonSerializer.Deserialize<Dictionary<string, object>>(
                    JsonSerializer.Serialize(payload)) ?? new Dictionary<string, object>(),
            SentAt = DateTime.UtcNow
        };

        _context.WebhookDeliveries.Add(delivery);
        await _context.SaveChangesAsync();
        return delivery;
    }

    public async Task UpdateDeliveryStatusAsync(int deliveryId, HttpResponseMessage response, TimeSpan duration)
    {
        var delivery = await _context.WebhookDeliveries.FindAsync(deliveryId);
        if (delivery == null) return;

        delivery.StatusCode = (int)response.StatusCode;
        delivery.Response = await response.Content.ReadAsStringAsync();
        delivery.ResponseHeaders = response.Headers.ToDictionary(
            h => h.Key, 
            h => string.Join(", ", h.Value));
        delivery.IsSuccess = response.IsSuccessStatusCode;
        delivery.CompletedAt = DateTime.UtcNow;
        delivery.DurationMs = (int)duration.TotalMilliseconds;

        await _context.SaveChangesAsync();
    }

    public async Task UpdateDeliveryErrorAsync(int deliveryId, Exception error, TimeSpan duration)
    {
        var delivery = await _context.WebhookDeliveries.FindAsync(deliveryId);
        if (delivery == null) return;

        delivery.IsSuccess = false;
        delivery.ErrorMessage = error.Message;
        delivery.CompletedAt = DateTime.UtcNow;
        delivery.DurationMs = (int)duration.TotalMilliseconds;

        await _context.SaveChangesAsync();
    }

    public async Task<IEnumerable<WebhookDelivery>> GetDeliveriesAsync(int webhookId, int page = 1, int pageSize = 20)
    {
        return await _context.WebhookDeliveries
            .Where(d => d.WebhookId == webhookId)
            .OrderByDescending(d => d.SentAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }

    public async Task<WebhookDelivery?> GetDeliveryAsync(int id)
    {
        return await _context.WebhookDeliveries.FindAsync(id);
    }

    public async Task RetryDeliveryAsync(int deliveryId)
    {
        var delivery = await _context.WebhookDeliveries
            .Include(d => d.Webhook)
            .FirstOrDefaultAsync(d => d.Id == deliveryId);

        if (delivery?.Webhook == null) throw new ArgumentException("Delivery not found");

        delivery.RetryCount++;
        delivery.NextRetryAt = null;
        await _context.SaveChangesAsync();

        await ExecuteWebhookAsync(delivery.Webhook, delivery.EventName, delivery.Payload);
    }

    public async Task<WebhookStatsDto> GetStatsAsync()
    {
        var twentyFourHoursAgo = DateTime.UtcNow.AddHours(-24);
        
        var totalWebhooks = await _context.Webhooks.CountAsync();
        var activeWebhooks = await _context.Webhooks.CountAsync(w => w.IsActive);
        var totalDeliveries24h = await _context.WebhookDeliveries
            .CountAsync(d => d.SentAt >= twentyFourHoursAgo);
        var successfulDeliveries24h = await _context.WebhookDeliveries
            .CountAsync(d => d.SentAt >= twentyFourHoursAgo && d.IsSuccess);
        var failedDeliveries24h = await _context.WebhookDeliveries
            .CountAsync(d => d.SentAt >= twentyFourHoursAgo && !d.IsSuccess);

        var successRate = totalDeliveries24h > 0 
            ? (int)((double)successfulDeliveries24h / totalDeliveries24h * 100) 
            : 0;

        return new WebhookStatsDto
        {
            TotalWebhooks = totalWebhooks,
            ActiveWebhooks = activeWebhooks,
            TotalDeliveries24h = totalDeliveries24h,
            SuccessRate24h = successRate,
            FailedDeliveries24h = failedDeliveries24h
        };
    }

    public async Task ProcessRetriesAsync()
    {
        var now = DateTime.UtcNow;
        var pendingRetries = await _context.WebhookDeliveries
            .Where(d => !d.IsSuccess && d.NextRetryAt <= now && d.RetryCount < d.Webhook!.MaxRetries)
            .Include(d => d.Webhook)
            .ToListAsync();

        foreach (var delivery in pendingRetries)
        {
            if (delivery.Webhook == null) continue;
            
            try
            {
                delivery.RetryCount++;
                delivery.NextRetryAt = null;
                await _context.SaveChangesAsync();
                
                await ExecuteWebhookAsync(delivery.Webhook, delivery.EventName, delivery.Payload);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Retry failed for delivery {DeliveryId}", delivery.Id);
            }
        }
    }

    private string ComputeSignature(string payload, string secret)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        return "sha256=" + Convert.ToHexString(hash).ToLowerInvariant();
    }
}
