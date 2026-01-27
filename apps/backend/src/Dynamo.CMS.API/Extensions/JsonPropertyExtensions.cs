using System.Text.Json;

namespace Dynamo.CMS.API.Extensions;

public static class JsonPropertyExtensions
{
    private static bool TryGetNumber(this JsonProperty property, out object? exportedNumber)
    {
        exportedNumber = null;

        if (property.Value.TryGetInt16(out var @int16))
        {
            exportedNumber = @int16;
            return true;
        }
        if (property.Value.TryGetInt32(out var @int32))
        {
            exportedNumber = @int32;
            return true;
        }
        if (property.Value.TryGetInt64(out var @int64))
        {
            exportedNumber = @int64;
            return true;
        }
        if (property.Value.TryGetDecimal(out var @decimal))
        {
            exportedNumber = @decimal;
            return true;
        }
        return false;
    }

    /// <summary>
    ///     Converts a given <see cref="JsonProperty.Value"/> to a C# object.
    /// </summary>
    /// <param name="property"></param>
    /// <returns></returns>
    /// <exception cref="ArgumentOutOfRangeException"></exception>
    public static object? ToCSharpObject(this JsonProperty property)
    {
        if (property.Value.ValueKind == JsonValueKind.Number && property.TryGetNumber(out var number))
        {
            return number;
        }

        var element = property.Value;
        switch (element.ValueKind)
        {
            case JsonValueKind.Object:
            case JsonValueKind.Array:
                return element;
            case JsonValueKind.String:
                if (element.TryGetDateTime(out var dateTime))
                {
                    return dateTime;
                }
                else if (DateTime.TryParse(element.ToString(), out dateTime))
                {
                    return dateTime;
                }
                else
                {
                    // Likely just a normal string
                    return element.ToString();
                }
            case JsonValueKind.True:
            case JsonValueKind.False:
                return element.GetBoolean();
            case JsonValueKind.Undefined:
            case JsonValueKind.Null:
                return null;
            case JsonValueKind.Number:
            default:
                // JsonValueKind.Number is handled by TryGetNumber above
                throw new ArgumentOutOfRangeException(nameof(property));
        }
    }
}
