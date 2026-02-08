using Dynamo.CMS.API.Options;
using Microsoft.Extensions.Options;
using System.Net;
using System.Net.Mail;

namespace Dynamo.CMS.API.Services;

/// <summary>
/// SMTP email provider implementation
/// </summary>
public class SmtpEmailProvider : IEmailProvider
{
    private readonly EmailOptions _options;
    private readonly ILogger<SmtpEmailProvider> _logger;

    public SmtpEmailProvider(IOptions<EmailOptions> options, ILogger<SmtpEmailProvider> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public async Task<EmailResult> SendEmailAsync(EmailMessage message, CancellationToken cancellationToken = default)
    {
        try
        {
            var smtpSettings = _options.Smtp;

            using var client = new SmtpClient(smtpSettings.Host, smtpSettings.Port);
            client.EnableSsl = smtpSettings.EnableSsl;

            if (!string.IsNullOrEmpty(smtpSettings.Username) && !string.IsNullOrEmpty(smtpSettings.Password))
            {
                client.Credentials = new NetworkCredential(smtpSettings.Username, smtpSettings.Password);
            }

            var mailMessage = new MailMessage
            {
                Subject = message.Subject,
                Body = message.HtmlBody ?? message.TextBody ?? string.Empty,
                IsBodyHtml = message.HtmlBody != null
            };

            // Set sender
            var fromAddress = message.From ?? _options.DefaultFrom;
            var fromName = message.FromName ?? _options.DefaultFromName;
            mailMessage.From = new MailAddress(fromAddress, fromName);

            // Add recipients
            foreach (var to in message.To)
            {
                mailMessage.To.Add(to);
            }

            foreach (var cc in message.Cc)
            {
                mailMessage.CC.Add(cc);
            }

            foreach (var bcc in message.Bcc)
            {
                mailMessage.Bcc.Add(bcc);
            }

            // Set reply-to
            if (!string.IsNullOrEmpty(message.ReplyTo))
            {
                mailMessage.ReplyToList.Add(message.ReplyTo);
            }

            // Add attachments
            foreach (var attachment in message.Attachments)
            {
                var contentStream = new MemoryStream(attachment.Data);
                mailMessage.Attachments.Add(new Attachment(contentStream, attachment.Filename, attachment.ContentType));
            }

            // Add alternative text body if HTML is present
            if (!string.IsNullOrEmpty(message.HtmlBody) && !string.IsNullOrEmpty(message.TextBody))
            {
                var altView = AlternateView.CreateAlternateViewFromString(message.TextBody, null, "text/plain");
                mailMessage.AlternateViews.Add(altView);
            }

            await client.SendMailAsync(mailMessage, cancellationToken);

            _logger.LogInformation("Email sent successfully to {Recipients}", string.Join(", ", message.To));

            return new EmailResult
            {
                Success = true,
                MessageId = Guid.NewGuid().ToString("N")
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {Recipients}", string.Join(", ", message.To));
            return new EmailResult
            {
                Success = false,
                ErrorMessage = ex.Message
            };
        }
    }

    public bool IsConfigured()
    {
        // SMTP is considered configured if it has a valid host
        return !string.IsNullOrEmpty(_options.Smtp.Host) && _options.Smtp.Port > 0;
    }
}
