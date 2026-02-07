using Dynamo.CMS.API.Contracts;
using Dynamo.CMS.API.Models;
using Dynamo.CMS.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Dynamo.CMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class WebhooksController : ControllerBase
{
    private readonly IWebhookService _webhookService;
    private readonly ILogger<WebhooksController> _logger;

    public WebhooksController(IWebhookService webhookService, ILogger<WebhooksController> logger)
    {
        _webhookService = webhookService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<WebhookDto>>> GetWebhooks(
        [FromQuery] bool activeOnly = false)
    {
        var webhooks = await _webhookService.GetAllWebhooksAsync(activeOnly);
        
        var dto = webhooks.Select(w => new WebhookDto
        {
            Id = w.Id,
            Name = w.Name,
            Url = w.Url,
            HttpMethod = w.HttpMethod,
            Events = w.Events,
            Headers = w.Headers,
            IsActive = w.IsActive,
            TimeoutSeconds = w.TimeoutSeconds,
            MaxRetries = w.MaxRetries,
            CreatedAt = w.CreatedAt,
            UpdatedAt = w.UpdatedAt,
            LastTriggeredAt = w.LastTriggeredAt,
            SuccessCount = w.SuccessCount,
            FailureCount = w.FailureCount,
            LastError = w.LastError
        });

        return Ok(dto);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<WebhookDto>> GetWebhook(int id)
    {
        var webhook = await _webhookService.GetWebhookAsync(id);
        if (webhook == null) return NotFound();

        var dto = new WebhookDto
        {
            Id = webhook.Id,
            Name = webhook.Name,
            Url = webhook.Url,
            HttpMethod = webhook.HttpMethod,
            Events = webhook.Events,
            Headers = webhook.Headers,
            IsActive = webhook.IsActive,
            TimeoutSeconds = webhook.TimeoutSeconds,
            MaxRetries = webhook.MaxRetries,
            CreatedAt = webhook.CreatedAt,
            UpdatedAt = webhook.UpdatedAt,
            LastTriggeredAt = webhook.LastTriggeredAt,
            SuccessCount = webhook.SuccessCount,
            FailureCount = webhook.FailureCount,
            LastError = webhook.LastError
        };

        return Ok(dto);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<WebhookDto>> CreateWebhook(CreateWebhookDto dto)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "unknown";
        var webhook = await _webhookService.CreateWebhookAsync(dto, userId);

        var response = new WebhookDto
        {
            Id = webhook.Id,
            Name = webhook.Name,
            Url = webhook.Url,
            HttpMethod = webhook.HttpMethod,
            Events = webhook.Events,
            Headers = webhook.Headers,
            IsActive = webhook.IsActive,
            TimeoutSeconds = webhook.TimeoutSeconds,
            MaxRetries = webhook.MaxRetries,
            CreatedAt = webhook.CreatedAt,
            UpdatedAt = webhook.UpdatedAt,
            LastTriggeredAt = webhook.LastTriggeredAt,
            SuccessCount = webhook.SuccessCount,
            FailureCount = webhook.FailureCount,
            LastError = webhook.LastError
        };

        return CreatedAtAction(nameof(GetWebhook), new { id = webhook.Id }, response);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<WebhookDto>> UpdateWebhook(int id, UpdateWebhookDto dto)
    {
        var webhook = await _webhookService.UpdateWebhookAsync(id, dto);
        
        var response = new WebhookDto
        {
            Id = webhook.Id,
            Name = webhook.Name,
            Url = webhook.Url,
            HttpMethod = webhook.HttpMethod,
            Events = webhook.Events,
            Headers = webhook.Headers,
            IsActive = webhook.IsActive,
            TimeoutSeconds = webhook.TimeoutSeconds,
            MaxRetries = webhook.MaxRetries,
            CreatedAt = webhook.CreatedAt,
            UpdatedAt = webhook.UpdatedAt,
            LastTriggeredAt = webhook.LastTriggeredAt,
            SuccessCount = webhook.SuccessCount,
            FailureCount = webhook.FailureCount,
            LastError = webhook.LastError
        };

        return Ok(response);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> DeleteWebhook(int id)
    {
        await _webhookService.DeleteWebhookAsync(id);
        return NoContent();
    }

    [HttpPost("{id}/test")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> TestWebhook(int id, WebhookTestDto dto)
    {
        await _webhookService.TestWebhookAsync(id, dto);
        return Ok(new { message = "Webhook test sent" });
    }

    [HttpGet("{id}/deliveries")]
    public async Task<ActionResult<IEnumerable<WebhookDeliveryDto>>> GetDeliveries(
        int id, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var deliveries = await _webhookService.GetDeliveriesAsync(id, page, pageSize);
        
        var dto = deliveries.Select(d => new WebhookDeliveryDto
        {
            Id = d.Id,
            WebhookId = d.WebhookId,
            EventName = d.EventName,
            StatusCode = d.StatusCode,
            IsSuccess = d.IsSuccess,
            ErrorMessage = d.ErrorMessage,
            SentAt = d.SentAt,
            DurationMs = d.DurationMs,
            RetryCount = d.RetryCount
        });

        return Ok(dto);
    }

    [HttpGet("deliveries/{deliveryId}")]
    public async Task<ActionResult<WebhookDeliveryDetailDto>> GetDelivery(int deliveryId)
    {
        var delivery = await _webhookService.GetDeliveryAsync(deliveryId);
        if (delivery == null) return NotFound();

        var dto = new WebhookDeliveryDetailDto
        {
            Id = delivery.Id,
            WebhookId = delivery.WebhookId,
            EventName = delivery.EventName,
            Payload = delivery.Payload,
            StatusCode = delivery.StatusCode,
            Response = delivery.Response,
            ResponseHeaders = delivery.ResponseHeaders,
            IsSuccess = delivery.IsSuccess,
            ErrorMessage = delivery.ErrorMessage,
            SentAt = delivery.SentAt,
            CompletedAt = delivery.CompletedAt,
            DurationMs = delivery.DurationMs,
            RetryCount = delivery.RetryCount
        };

        return Ok(dto);
    }

    [HttpPost("deliveries/{deliveryId}/retry")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> RetryDelivery(int deliveryId)
    {
        await _webhookService.RetryDeliveryAsync(deliveryId);
        return Ok(new { message = "Delivery retry queued" });
    }

    [HttpGet("stats")]
    public async Task<ActionResult<WebhookStatsDto>> GetStats()
    {
        var stats = await _webhookService.GetStatsAsync();
        return Ok(stats);
    }

    [HttpGet("events")]
    [AllowAnonymous]
    public ActionResult<IEnumerable<string>> GetAvailableEvents()
    {
        return Ok(WebhookEvents.AllEvents);
    }
}
