using Dynamo.CMS.API.Services;

namespace Dynamo.CMS.API.BackgroundServices;

public class WebhookRetryBackgroundService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<WebhookRetryBackgroundService> _logger;

    public WebhookRetryBackgroundService(
        IServiceProvider serviceProvider,
        ILogger<WebhookRetryBackgroundService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Webhook retry background service started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var webhookService = scope.ServiceProvider.GetRequiredService<IWebhookService>();
                
                await webhookService.ProcessRetriesAsync();
                await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
            }
            catch (TaskCanceledException tex)
            {
                _logger.LogError(tex, "Error processing webhook retries");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing webhook retries");
            }

        }

        _logger.LogInformation("Webhook retry background service stopped");
    }
}
