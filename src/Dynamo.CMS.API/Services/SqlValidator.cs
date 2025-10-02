using System.Text.RegularExpressions;

namespace Dynamo.CMS.API.Services;

public class SqlValidator
{
    /// <summary>
    ///     Checks if <paramref name="input"/> contains any potential SQL injection keywords / if it appears to be safe from SQL injection.
    /// </summary>
    /// <param name="input">The input string to be checked.</param>
    /// <returns>
    ///     <c>true</c> if the input is considered likely to be safe from SQL injection; otherwise, <c>false</c>.
    /// </returns>
    public bool ContainsPotentialSqlInjection(string input)
    {
        if (string.IsNullOrEmpty(input))
        {
            return false;
        }

        if (input.Contains("--"))
        {
            // Comments are forbidden in SQL queries.
            return true;
        }

        string[] sqlInjectionKeywords = ["DELETE", "EXEC", "DROP TABLE", "DROP DATABASE"];
        foreach (string keyword in sqlInjectionKeywords)
        {
            // Use \b in the regex pattern to match whole words only (this shall skip the likes of DELETED)
            string pattern = $@"\b{Regex.Escape(keyword)}\b";

            // Check for the presence of SQL injection patterns
            if (Regex.IsMatch(input, pattern, RegexOptions.IgnoreCase))
            {
                // Potential SQL injection detected
                return true;
            }
        }

        return false;
    }
}