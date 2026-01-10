using System.Data;
using System.Text;
using System.Text.Json;
using Dynamo.CMS.API.Extensions;
using Dynamo.CMS.API.Contracts;
using Dynamo.CMS.API.Models;

namespace Dynamo.CMS.API.Services;

public class TableColumnInfo
{
    public string? OldName { get; set; }
    public required string Name { get; set; }
    public string? DisplayName { get; set; }
    public string? DbDataType { get; set; }
    public bool Nullable { get; set; }
    public bool Unique { get; set; }
    public bool AutoIncrement { get; set; }
}


public class PostgreSQLGenerator
{
    private readonly SqlValidator _sqlValidator;

    public PostgreSQLGenerator(SqlValidator sqlValidator)
    {
        _sqlValidator = sqlValidator;
    }

    public string GenerateCreateTableSql(string tableName, List<TableColumnInfo> columns)
    {
        var tableBuilder = new StringBuilder();
        tableBuilder.AppendLine($"CREATE TABLE {tableName}");
        tableBuilder.AppendLine("(");

        for (var i = 0; i < columns.Count; i++)
        {
            var column = columns[i];

            tableBuilder.Append('\t');
            tableBuilder.Append('"');
            tableBuilder.Append(column.Name);
            tableBuilder.Append('"');
            tableBuilder.Append(' ');

            if (column.AutoIncrement)
            {
                tableBuilder.Append("SERIAL UNIQUE");
                if (i < columns.Count - 1)
                {
                    tableBuilder.Append(',');
                }
                tableBuilder.AppendLine();
                continue;
            }

            // Re-add if we decide to use FOREIGN KEY references in our dynamic SQL.
            //if (column.Reference is not null)
            //{
            //    tableBuilder.Append(column.Reference.DbDataType);
            //    tableBuilder.Append(' ');
            //    tableBuilder.Append($"REFERENCES {column.Reference.Name}({column.Reference.Property})");
            //    if (!column.Nullable)
            //    {
            //        tableBuilder.Append(' ');
            //        tableBuilder.Append("NOT NULL");
            //    }
            //}
            //else
            //{
            //    tableBuilder.Append(column.DbDataType);
            //    tableBuilder.Append(' ');
            //    tableBuilder.Append(column.Nullable ? "NULL" : "NOT NULL");
            //}

            tableBuilder.Append(column.DbDataType);
            tableBuilder.Append(' ');
            tableBuilder.Append(column.Nullable ? "NULL" : "NOT NULL");

            if (column.Unique)
            {
                tableBuilder.Append(' ');
                tableBuilder.Append("UNIQUE");
            }

            if (i < columns.Count - 1)
            {
                tableBuilder.Append(',');
            }

            tableBuilder.AppendLine();
        }

        tableBuilder.Append(')');

        var query = tableBuilder.ToString();
        if (_sqlValidator.ContainsPotentialSqlInjection(query))
        {
            throw new InvalidOperationException("Possible SQL Injection detected.");
        }

        return query;
    }

    public string GenerateAlterTableSql(string tableName, ColumnAlterationType alterationType, TableColumnInfo column)
    {
        var alterBuilder = new StringBuilder();
        alterBuilder.AppendLine($"ALTER TABLE \"{tableName}\"");

        switch (alterationType)
        {
            case ColumnAlterationType.Add:
                if (string.IsNullOrWhiteSpace(column.Name))
                {
                    throw new ArgumentNullException(nameof(column.Name));
                }

                if (string.IsNullOrWhiteSpace(column.DbDataType))
                {
                    throw new ArgumentNullException(nameof(column.DbDataType));
                }
                alterBuilder.Append($"ADD COLUMN \"{column.Name}\" {column.DbDataType}");
                break;
            case ColumnAlterationType.Rename:
                if (string.IsNullOrWhiteSpace(column.OldName))
                {
                    throw new ArgumentNullException(nameof(column.OldName));
                }

                if (string.IsNullOrWhiteSpace(column.Name))
                {
                    throw new ArgumentNullException(nameof(column.Name));
                }
                alterBuilder.Append($"RENAME COLUMN \"{column.OldName}\" TO \"{column.Name}\"");
                break;
            case ColumnAlterationType.ChangeType:
                if (string.IsNullOrWhiteSpace(column.Name))
                {
                    throw new ArgumentNullException(nameof(column.Name));
                }

                if (string.IsNullOrWhiteSpace(column.DbDataType))
                {
                    throw new ArgumentNullException(nameof(column.DbDataType));
                }
                alterBuilder.Append($"ALTER COLUMN \"{column.Name}\" TYPE {column.DbDataType}");
                break;
            case ColumnAlterationType.Drop:
                alterBuilder.Append($"DROP COLUMN \"{column.Name}\"");
                break;
            default:
                throw new ArgumentException($"Invalid alteration type: {alterationType}", nameof(alterationType));
        }

        var query = alterBuilder.ToString();
        if (_sqlValidator.ContainsPotentialSqlInjection(query))
        {
            throw new InvalidOperationException("Possible SQL Injection detected.");
        }

        return query;
    }

    public string GenerateSelectSql(
        string tableName,
        List<DataCollectionColumn> columns,
        string? orderBy = null,
        string? orderByDesc = null,
        int? page = null,
        int? itemsPerPage = null,
        FilterConditionDTO? where = null
        )
    {
        //var columnsSelector = string.Join(", ", columns.Select(c =>
        //{
        //    if (string.IsNullOrWhiteSpace(c.DisplayName))
        //    {
        //        return $"\"{c.Name}\"";
        //    }
        //    else
        //    {
        //        return $"\"{c.Name}\" as \"{c.DisplayName}\"";
        //    }
        //}));

        // Always use the column Name (camelCase) in JSON responses, not DisplayName
        // DisplayName is only for UI purposes
        var columnsSelector = string.Join(", ", columns.Select(c => $"\"{c.Name}\""));

        var queryBuilder = new StringBuilder();
        queryBuilder.Append("SELECT ");
        queryBuilder.AppendLine(columnsSelector);
        queryBuilder.Append("FROM ");
        queryBuilder.Append('"');
        queryBuilder.Append(tableName);
        queryBuilder.Append('"');

        if (where is not null)
        {
            string whereClause = BuildWhereClause(where);
            queryBuilder.AppendLine();
            queryBuilder.Append("WHERE");
            queryBuilder.Append(' ');
            queryBuilder.Append(whereClause);
        }

        if (!string.IsNullOrWhiteSpace(orderBy))
        {
            queryBuilder.AppendLine();
            queryBuilder.Append($"ORDER BY \"{orderBy}\"");
        }
        else if (!string.IsNullOrWhiteSpace(orderByDesc))
        {
            queryBuilder.AppendLine();
            queryBuilder.Append($"ORDER BY \"{orderByDesc}\" DESC");
        }

        if (page.HasValue && itemsPerPage.HasValue)
        {
            int offset = (page.Value - 1) * itemsPerPage.Value;
            queryBuilder.AppendLine();
            queryBuilder.AppendLine($"OFFSET {offset} ROWS");
            queryBuilder.Append($"FETCH NEXT {itemsPerPage} ROWS ONLY");
        }

        var query = queryBuilder.ToString();
        if (_sqlValidator.ContainsPotentialSqlInjection(query))
        {
            throw new InvalidOperationException("Possible SQL Injection detected.");
        }

        return query;
    }

    private static readonly string[] _supportedWhereOperators = ["=", ">", "<", ">=", "<=", "!=", "IN", "BETWEEN"];
    public string BuildWhereClause(FilterConditionDTO? filterGroup)
    {
        if (filterGroup is null || filterGroup.Conditions is null || filterGroup.Conditions.Count == 0)
        {
            throw new ArgumentNullException(nameof(filterGroup));
        }

        StringBuilder whereClause = new();
        whereClause.Append('(');

        for (int i = 0; i < filterGroup.Conditions.Count; i++)
        {
            FilterConditionDTO condition = filterGroup.Conditions[i];

            if (condition.Filter.HasValue)
            {
                if (condition.Conditions is null || condition.Conditions.Count == 0)
                {
                    throw new ArgumentException("A filter requires at least one condition.");
                }

                whereClause.Append(BuildWhereClause(condition));
            }
            else if (!string.IsNullOrWhiteSpace(condition.Operator))
            {
                if (!_supportedWhereOperators.Contains(condition.Operator))
                {
                    throw new NotSupportedException($"Operator {condition.Operator} is not supported or does not exist.");
                }

                if (condition.Operator.Equals("IN", StringComparison.OrdinalIgnoreCase))
                {
                    IEnumerable<object> values = condition.Value as IEnumerable<object>
                        ?? throw new ArgumentException("The IN operator requires a range of values to apply to.");

                    whereClause.Append($"\"{condition.Field}\" {condition.Operator} ({string.Join(", ", values.Select(ToSqlRawValue))})");
                }
                else if (condition.Operator.Equals("BETWEEN", StringComparison.OrdinalIgnoreCase))
                {
                    IEnumerable<object>? conditionBetweenValues = condition.Value as IEnumerable<object>
                        ?? throw new ArgumentException("The BETWEEN operator requires a range of values to apply to.");

                    var values = conditionBetweenValues.ToList();
                    if (values.Count != 2)
                    {
                        throw new ArgumentException("Ranges for BETWEEN must consist of 2 elements.");
                    }

                    var first = ToSqlRawValue(values[0]);
                    var last = ToSqlRawValue(values[1]);
                    whereClause.Append($"\"{condition.Field}\" {condition.Operator} {first} AND {last}");
                }
                else
                {
                    whereClause.Append($"\"{condition.Field}\" {condition.Operator} {ToSqlRawValue(condition.Value)}");
                }
            }
            else
            {
                throw new ArgumentException("Either a filter or an operator with conditions are required");
            }

            if (i < filterGroup.Conditions.Count - 1)
            {
                whereClause.Append($" {filterGroup.Filter} ");
            }
        }

        whereClause.Append(')');

        return whereClause.ToString();
    }

    private static string ToSqlRawValue(object? value)
    {
        if (value is JsonElement element)
        {
            switch (element.ValueKind)
            {
                case JsonValueKind.Object:
                case JsonValueKind.Array:
                    return $"'{JsonSerializer.Serialize(value)}'";
                case JsonValueKind.String:
                    if (DateTime.TryParse(value.ToString(), out var date))
                    {
                        return $"'{date:yyyy-MM-dd HH:mm:ss}'";
                    }
                    else
                    {
                        return $"'{value}'";
                    }
                case JsonValueKind.Number:
                case JsonValueKind.True:
                case JsonValueKind.False:
                    return value.ToString()!;
                case JsonValueKind.Null:
                    return "null";
                case JsonValueKind.Undefined:
                default:
                    throw new ArgumentOutOfRangeException(nameof(value));
            }
        }

        switch (value)
        {
            case string:
                return $"'{value}'";
            case DateTime dateTime:
                return $"'{dateTime:O}'";
            case DateOnly dateOnly:
                return $"'{dateOnly}'";
            case TimeOnly timeOnly:
                return $"'{timeOnly}'";
            case TimeSpan ts:
                var to = new TimeOnly(ts.Ticks);
                return $"'{to}'";
            case bool:
            case short:
            case ushort:
            case int:
            case uint:
            case long:
            case ulong:
                return value.ToString()!;
            default:
                if (value is null)
                {
                    return "null";
                }
                throw new ArgumentOutOfRangeException(nameof(value));
        }
    }

    /// <summary>
    ///     Generates a list of INSERT INTO statements for each <paramref name="data"/> item.
    ///     The resulting <see cref="SqlQuery"/> instances can be then executed upon the database.
    /// </summary>
    /// <param name="tableName"></param>
    /// <param name="data"></param>
    /// <param name="allDataCollectionColumns"></param>
    /// <param name="baseTypes">A list of all existing <see cref="BaseType"/> in order to find complex DB data types.</param>
    /// <returns></returns>
    /// <exception cref="InvalidOperationException"></exception>
    public IEnumerable<SqlQuery> GenerateInsertIntoSql(
        string tableName,
        List<JsonElement> data,
        List<DataCollectionColumn> allDataCollectionColumns,
        List<BaseType> baseTypes
        )
    {
        // AutoIncrement columns should be excluded from the INSERT INTO becasue the database assigns them on its own
        List<DataCollectionColumn> columns = allDataCollectionColumns.Where(x => !x.AutoIncrement).ToList();
        List<string> columnNames = columns.Select(c => c.Name).ToList();

        for (int i = 0; i < data.Count; i++)
        {
            JsonElement record = data[i];
            var queryParams = record.EnumerateObject().ToDictionary(el => el.Name, el => el.ToCSharpObject());
            
            // Check that all non-nullable columns are present
            var nonNullableColumns = columns.Where(c => !c.Nullable).Select(c => c.Name).ToList();
            var missingRequiredColumns = nonNullableColumns.Where(col => !queryParams.ContainsKey(col)).ToList();
            
            if (missingRequiredColumns.Any())
            {
                throw new InvalidOperationException(
                    $"Missing required columns: {string.Join(", ", missingRequiredColumns)}. " +
                    $"All non-nullable columns must be provided.");
            }
            
            // Ensure all provided columns exist in the collection
            var invalidColumns = queryParams.Keys.Where(key => !columnNames.Contains(key)).ToList();
            if (invalidColumns.Any())
            {
                throw new InvalidOperationException(
                    $"Invalid columns provided: {string.Join(", ", invalidColumns)}. " +
                    $"Valid columns are: {string.Join(", ", columnNames)}");
            }

            // Only include columns that are provided or are non-nullable
            var columnsToInsert = columns.Where(c => queryParams.ContainsKey(c.Name) || !c.Nullable).ToList();
            var columnsToInsertNames = columnsToInsert.Select(c => c.Name).ToList();
            string columnsSelector = string.Join(", ", columnsToInsertNames.Select(column => $"\"{column}\""));

            // Ensure all columns to insert have entries in parameters (set to null if missing)
            var finalParams = new Dictionary<string, object?>(queryParams);
            foreach (var col in columnsToInsert)
            {
                if (!finalParams.ContainsKey(col.Name))
                {
                    finalParams[col.Name] = null;
                }
            }

            StringBuilder queryBuilder = new();
            queryBuilder.AppendLine($"INSERT INTO \"{tableName}\" ({columnsSelector})");
            queryBuilder.Append("VALUES");
            queryBuilder.Append(' ');
            queryBuilder.Append('(');
            for (int j = 0; j < columnsToInsert.Count; j++)
            {
                DataCollectionColumn column = columnsToInsert[j];
                string columnName = column.Name;
                object? value = finalParams[columnName];

                queryBuilder.Append($"@{columnName}");
                
                // Handle Reference types
                if (value is JsonElement reference && column.BaseTypeName == "reference")
                {
                    try
                    {
                        var referenceObject = JsonSerializer.Deserialize<Reference>(reference);
                        if (referenceObject is null || referenceObject.Value is null)
                        {
                            throw new NullReferenceException("External reference data must have a value.");
                        }

                        var dbDataType = baseTypes.First(d => d.Name == column.BaseTypeName).DbDataType;
                        queryBuilder.Append($"::{dbDataType}");
                        finalParams[columnName] = JsonSerializer.Serialize(value);
                    }
                    catch
                    {
                        throw new InvalidOperationException("Could not deserialize external references to a proper Reference object.");
                    }
                }
                // Handle File types (single file or file array)
                else if (value is JsonElement fileElement && (column.BaseTypeName == "file" || column.BaseTypeName == "file[]"))
                {
                    try
                    {
                        // Try to deserialize as single file
                        if (column.BaseTypeName == "file")
                        {
                            var fileObject = JsonSerializer.Deserialize<UploadedFile>(fileElement);
                            if (fileObject is null)
                            {
                                throw new NullReferenceException("File data must have a value.");
                            }
                        }
                        // Try to deserialize as file array
                        else if (column.BaseTypeName == "file[]")
                        {
                            var fileArray = JsonSerializer.Deserialize<List<UploadedFile>>(fileElement);
                            if (fileArray is null)
                            {
                                throw new NullReferenceException("File array data must have a value.");
                            }
                        }

                        var dbDataType = baseTypes.First(d => d.Name == column.BaseTypeName).DbDataType;
                        queryBuilder.Append($"::{dbDataType}");
                        finalParams[columnName] = JsonSerializer.Serialize(value);
                    }
                    catch (JsonException)
                    {
                        throw new InvalidOperationException($"Could not deserialize file data to a proper {(column.BaseTypeName == "file" ? "UploadedFile" : "List<UploadedFile>")} object.");
                    }
                }

                if (j < columnsToInsert.Count - 1)
                {
                    queryBuilder.Append(", ");
                }

            }
            queryBuilder.Append(')');

            string query = queryBuilder.ToString();
            if (_sqlValidator.ContainsPotentialSqlInjection(query))
            {
                throw new InvalidOperationException("Possible SQL Injection detected.");
            }

            yield return new SqlQuery
            {
                Query = query,
                Parameters = finalParams
            };
        }
    }

    public class SqlQuery
    {
        public required string Query { get; set; }
        public Dictionary<string, object?>? Parameters { get; set; }
    }

}
