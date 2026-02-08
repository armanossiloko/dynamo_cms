namespace Dynamo.CMS.API.Services;

/// <summary>
/// Service for generating URL-safe slugs from text
/// </summary>
public interface ISlugService
{
    /// <summary>
    /// Generates a URL-safe slug from the provided text
    /// </summary>
    /// <param name="text">The text to convert to a slug</param>
    /// <returns>A URL-safe slug string</returns>
    string GenerateSlug(string text);

    /// <summary>
    /// Generates a unique slug by appending a number if the slug already exists
    /// </summary>
    /// <param name="text">The text to convert to a slug</param>
    /// <param name="existingSlugs">Collection of existing slugs to check against</param>
    /// <returns>A unique URL-safe slug string</returns>
    string GenerateUniqueSlug(string text, IEnumerable<string> existingSlugs);
}

/// <summary>
/// Implementation of slug generation service
/// </summary>
public class SlugService : ISlugService
{
    public string GenerateSlug(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return string.Empty;

        // Convert to lowercase
        var slug = text.ToLowerInvariant();

        // Replace spaces and underscores with hyphens
        slug = slug.Replace(' ', '-').Replace('_', '-');

        // Remove invalid characters (keep only alphanumeric and hyphens)
        var validChars = slug.Where(c => char.IsLetterOrDigit(c) || c == '-').ToArray();
        slug = new string(validChars);

        // Remove consecutive hyphens
        while (slug.Contains("--"))
        {
            slug = slug.Replace("--", "-");
        }

        // Trim hyphens from start and end
        slug = slug.Trim('-');

        return slug;
    }

    public string GenerateUniqueSlug(string text, IEnumerable<string> existingSlugs)
    {
        var baseSlug = GenerateSlug(text);
        
        if (string.IsNullOrEmpty(baseSlug))
            return baseSlug;

        var existingSet = new HashSet<string>(existingSlugs, StringComparer.OrdinalIgnoreCase);
        
        if (!existingSet.Contains(baseSlug))
            return baseSlug;

        // Find a unique suffix
        var counter = 1;
        var uniqueSlug = $"{baseSlug}-{counter}";
        
        while (existingSet.Contains(uniqueSlug))
        {
            counter++;
            uniqueSlug = $"{baseSlug}-{counter}";
        }

        return uniqueSlug;
    }
}
