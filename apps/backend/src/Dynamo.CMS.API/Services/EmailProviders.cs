using Dynamo.CMS.API.Options;
using Microsoft.Extensions.Options;

namespace Dynamo.CMS.API.Services;

/// <summary>
/// Development email provider that logs emails instead of sending them
/// </summary>
public class LogEmailProvider : IEmailProvider
{
    private readonly ILogger<LogEmailProvider> _logger;
    private readonly EmailOptions _options;

    public LogEmailProvider(ILogger<LogEmailProvider> logger, IOptions<EmailOptions> options)
    {
        _logger = logger;
        _options = options.Value;
    }

    public Task<EmailResult> SendEmailAsync(EmailMessage message, CancellationToken cancellationToken = default)
    {
        var from = message.From ?? _options.DefaultFrom;
        var fromName = message.FromName ?? _options.DefaultFromName;

        _logger.LogInformation("""
            [EMAIL LOG - NOT SENT]
            From: {FromName} <{From}>
            To: {To}
            Subject: {Subject}
            Text Body: {TextBody}
            HTML Body: {HtmlBody}
            """,
            fromName,
            from,
            string.Join(", ", message.To),
            message.Subject,
            message.TextBody,
            message.HtmlBody?.Substring(0, Math.Min(200, message.HtmlBody?.Length ?? 0)) + "...");

        return Task.FromResult(new EmailResult
        {
            Success = true,
            MessageId = $"log-{Guid.NewGuid():N}"
        });
    }

    public bool IsConfigured() => true;
}

/// <summary>
/// Factory for creating email providers based on configuration
/// </summary>
public class EmailProviderFactory
{
    private readonly IServiceProvider _serviceProvider;
    private readonly EmailOptions _options;

    public EmailProviderFactory(IServiceProvider serviceProvider, IOptions<EmailOptions> options)
    {
        _serviceProvider = serviceProvider;
        _options = options.Value;
    }

    public IEmailProvider CreateProvider()
    {
        return _options.Provider?.ToLowerInvariant() switch
        {
            "smtp" => _serviceProvider.GetRequiredService<SmtpEmailProvider>(),
            "log" or "console" or "debug" => _serviceProvider.GetRequiredService<LogEmailProvider>(),
            _ => _serviceProvider.GetRequiredService<SmtpEmailProvider>() // Default to SMTP
        };
    }
}
