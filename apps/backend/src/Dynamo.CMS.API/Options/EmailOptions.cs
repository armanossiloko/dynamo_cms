namespace Dynamo.CMS.API.Options;

/// <summary>
/// Configuration options for email services
/// </summary>
public class EmailOptions
{
    public const string OptionsName = "Email";

    /// <summary>
    /// The email provider type: "smtp", "sendgrid", "ses", "mailgun", or "log" (for development)
    /// </summary>
    public string Provider { get; set; } = "smtp";

    /// <summary>
    /// Default sender email address
    /// </summary>
    public string DefaultFrom { get; set; } = "noreply@dynamo.local";

    /// <summary>
    /// Default sender display name
    /// </summary>
    public string DefaultFromName { get; set; } = "Dynamo CMS";

    /// <summary>
    /// SMTP-specific settings
    /// </summary>
    public SmtpSettings Smtp { get; set; } = new();

    /// <summary>
    /// SendGrid-specific settings
    /// </summary>
    public SendGridSettings SendGrid { get; set; } = new();

    /// <summary>
    /// Amazon SES-specific settings
    /// </summary>
    public SesSettings Ses { get; set; } = new();

    /// <summary>
    /// Mailgun-specific settings
    /// </summary>
    public MailgunSettings Mailgun { get; set; } = new();
}

/// <summary>
/// SMTP server configuration
/// </summary>
public class SmtpSettings
{
    /// <summary>
    /// SMTP server host
    /// </summary>
    public string Host { get; set; } = "localhost";

    /// <summary>
    /// SMTP server port
    /// </summary>
    public int Port { get; set; } = 587;

    /// <summary>
    /// Whether to use SSL/TLS
    /// </summary>
    public bool EnableSsl { get; set; } = true;

    /// <summary>
    /// SMTP username for authentication
    /// </summary>
    public string? Username { get; set; }

    /// <summary>
    /// SMTP password for authentication
    /// </summary>
    public string? Password { get; set; }
}

/// <summary>
/// SendGrid configuration
/// </summary>
public class SendGridSettings
{
    /// <summary>
    /// SendGrid API key
    /// </summary>
    public string? ApiKey { get; set; }
}

/// <summary>
/// Amazon SES configuration
/// </summary>
public class SesSettings
{
    /// <summary>
    /// AWS Access Key ID
    /// </summary>
    public string? AccessKeyId { get; set; }

    /// <summary>
    /// AWS Secret Access Key
    /// </summary>
    public string? SecretAccessKey { get; set; }

    /// <summary>
    /// AWS Region
    /// </summary>
    public string Region { get; set; } = "us-east-1";
}

/// <summary>
/// Mailgun configuration
/// </summary>
public class MailgunSettings
{
    /// <summary>
    /// Mailgun API key
    /// </summary>
    public string? ApiKey { get; set; }

    /// <summary>
    /// Mailgun domain
    /// </summary>
    public string? Domain { get; set; }

    /// <summary>
    /// Mailgun region (us or eu)
    /// </summary>
    public string Region { get; set; } = "us";
}
