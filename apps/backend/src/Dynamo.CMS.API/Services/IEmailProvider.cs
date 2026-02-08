namespace Dynamo.CMS.API.Services;

/// <summary>
/// Represents an email message to be sent
/// </summary>
public class EmailMessage
{
    /// <summary>
    /// The recipient email address(es)
    /// </summary>
    public required List<string> To { get; set; }

    /// <summary>
    /// CC recipient email address(es)
    /// </summary>
    public List<string> Cc { get; set; } = [];

    /// <summary>
    /// BCC recipient email address(es)
    /// </summary>
    public List<string> Bcc { get; set; } = [];

    /// <summary>
    /// The email subject
    /// </summary>
    public required string Subject { get; set; }

    /// <summary>
    /// The plain text body of the email
    /// </summary>
    public string? TextBody { get; set; }

    /// <summary>
    /// The HTML body of the email
    /// </summary>
    public string? HtmlBody { get; set; }

    /// <summary>
    /// The sender email address (overrides default from configuration)
    /// </summary>
    public string? From { get; set; }

    /// <summary>
    /// The sender display name
    /// </summary>
    public string? FromName { get; set; }

    /// <summary>
    /// Reply-to email address
    /// </summary>
    public string? ReplyTo { get; set; }

    /// <summary>
    /// Email attachments
    /// </summary>
    public List<EmailAttachment> Attachments { get; set; } = [];
}

/// <summary>
/// Represents an email attachment
/// </summary>
public class EmailAttachment
{
    /// <summary>
    /// The filename of the attachment
    /// </summary>
    public required string Filename { get; set; }

    /// <summary>
    /// The content type (MIME type) of the attachment
    /// </summary>
    public required string ContentType { get; set; }

    /// <summary>
    /// The attachment data as a byte array
    /// </summary>
    public required byte[] Data { get; set; }
}

/// <summary>
/// Result of an email send operation
/// </summary>
public class EmailResult
{
    /// <summary>
    /// Whether the email was sent successfully
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Error message if the send failed
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Provider-specific message ID (if available)
    /// </summary>
    public string? MessageId { get; set; }
}

/// <summary>
/// Interface for email providers
/// </summary>
public interface IEmailProvider
{
    /// <summary>
    /// Sends an email message
    /// </summary>
    /// <param name="message">The email message to send</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The result of the send operation</returns>
    Task<EmailResult> SendEmailAsync(EmailMessage message, CancellationToken cancellationToken = default);

    /// <summary>
    /// Checks if the email provider is properly configured and can send emails
    /// </summary>
    /// <returns>True if the provider is ready to send emails</returns>
    bool IsConfigured();
}
