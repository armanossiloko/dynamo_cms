using System.Text;
using System.Text.RegularExpressions;

namespace Dynamo.CMS.API.Extensions;

public static class StringExtensions
{
    /// <summary>
    /// Converts a string to camelCase format.
    /// Examples: "Created At" -> "createdAt", "user_name" -> "userName", "ID" -> "id"
    /// </summary>
    public static string ToCamelCase(this string input)
    {
        if (string.IsNullOrWhiteSpace(input))
            return input;

        // Remove leading/trailing whitespace
        input = input.Trim();

        // Split by spaces, underscores, or hyphens, and handle mixed case
        var words = Regex.Split(input, @"[\s_\-]+|(?<!^)(?=[A-Z])")
            .Where(w => !string.IsNullOrWhiteSpace(w))
            .Select(w => w.Trim())
            .ToList();

        if (words.Count == 0)
            return input;

        var result = new StringBuilder();

        // First word: lowercase
        result.Append(words[0].ToLowerInvariant());

        // Subsequent words: capitalize first letter, lowercase rest
        for (int i = 1; i < words.Count; i++)
        {
            var word = words[i];
            if (word.Length > 0)
            {
                result.Append(char.ToUpperInvariant(word[0]));
                if (word.Length > 1)
                {
                    result.Append(word.Substring(1).ToLowerInvariant());
                }
            }
        }

        return result.ToString();
    }

    /// <summary>
    /// Validates that a string is a valid camelCase identifier.
    /// Must start with a lowercase letter and contain only letters, numbers, and underscores.
    /// </summary>
    public static bool IsValidCamelCaseIdentifier(this string input)
    {
        if (string.IsNullOrWhiteSpace(input))
            return false;

        // Must start with lowercase letter
        if (!char.IsLower(input[0]))
            return false;

        // Must contain only letters, numbers, and underscores
        return Regex.IsMatch(input, @"^[a-z][a-zA-Z0-9_]*$");
    }
}
