using Dapper;
using Microsoft.EntityFrameworkCore;
using System.Data;

namespace Dynamo.CMS.API.Extensions;

public static class DbContextExtensions
{
    /// <inheritdoc cref="SqlMapper.Execute(IDbConnection, string, object?, IDbTransaction?, int?, CommandType?)"/>
    public static int Execute(this DbContext context, string sql, Dictionary<string, object?>? parameters = null)
    {
        IDbConnection? dbConnection = context.Database.GetDbConnection()
            ?? throw new InvalidOperationException("Attempted to execute an ADO.NET query on a non-existent DbConnection.");

        var dbArgs = new DynamicParameters();
        foreach (var pair in parameters ?? [])
        {
            dbArgs.Add(pair.Key, pair.Value);
        }

        return dbConnection.Execute(sql, dbArgs);
    }

    /// <inheritdoc cref="SqlMapper.ExecuteAsync(IDbConnection, string, object?, IDbTransaction?, int?, CommandType?)"/>
    /// <exception cref="InvalidOperationException"></exception>
    public static async Task<int> ExecuteAsync(this DbContext context, string sql, Dictionary<string, object>? parameters = null)
    {
        IDbConnection? dbConnection = context.Database.GetDbConnection()
            ?? throw new InvalidOperationException("Attempted to execute an ADO.NET query on a non-existent DbConnection.");

        var dbArgs = new DynamicParameters();
        foreach (var pair in parameters ?? [])
        {
            dbArgs.Add(pair.Key, pair.Value);
        }

        return await dbConnection.ExecuteAsync(sql, dbArgs);
    }

    /// <summary>
    ///     Executes a given SELECT statement and returns a list of dictionaries (each dictionary represents 1 record from the query result).
    /// </summary>
    /// <param name="query">A SELECT query to execute.</param>
    /// <returns>A list of dictionaries (each dictionary represents 1 record from the query result)</returns>
    /// <exception cref="InvalidOperationException">Thrown when the underlying DbConnection is null or when a non-SELECT query is executed.</exception>
    public static IEnumerable<Dictionary<string, object?>> GetDbRecords(this DbContext context, string query)
    {
        if (!query.StartsWith("SELECT", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Attempted to execute a non SELECT query using ADO.NET.");
        }

        var result = new List<Dictionary<string, object?>>();

        IDbConnection? dbConnection = context.Database.GetDbConnection()
            ?? throw new InvalidOperationException("Attempted to execute an ADO.NET query on a non-existent DbConnection.");

        using var resultReader = dbConnection.ExecuteReader(query);
        while (resultReader.Read())
        {
            var @object = new Dictionary<string, object?>();

            for (int i = 0; i < resultReader.FieldCount; i++)
            {
                var columnName = resultReader.GetName(i);
                var columnValue = resultReader.GetValue(i);

                switch (columnValue)
                {
                    case DBNull:
                        columnValue = null;
                        break;
                    case DateTime dateTime:
                        // All DateTime values are stored in UTC in the database
                        columnValue = DateTime.SpecifyKind(dateTime, DateTimeKind.Utc);
                        break;
                }

                @object[columnName] = columnValue;
            }
            result.Add(@object);
            yield return @object;
        }
    }

}