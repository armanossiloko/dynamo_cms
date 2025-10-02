using Dynamo.CMS.API.Contracts;

namespace Dynamo.Integration.Tests.Data;

internal static class DataCollectionData
{
    public static readonly Dictionary<string, DataCollectionCreationDTO> PostDataCollections = new()
    {
        {
            "people",
            new()
            {
                Name = "people",
                DisplayName = "People",
                Columns =
                [
                    new()
                    {
                        Name = "id",
                        BaseTypeName = "integer",
                        AutoIncrement = true,
                        Unique = true,
                        Nullable = false
                    },
                    new()
                    {
                        Name = "username",
                        DisplayName = "Username",
                        BaseTypeName = "string",
                        Nullable = false
                    },
                    new()
                    {
                        Name = "password",
                        DisplayName = "Password",
                        BaseTypeName = "string",
                        Nullable = false
                    },
                    new()
                    {
                        Name = "created",
                        DisplayName = "Date created",
                        BaseTypeName = "datetime",
                        Nullable = true
                    },
                ]
            }
        },
        {
            "employees",
            new()
            {
                Name = "employees",
                DisplayName = "Employees",
                Columns =
                [
                    new()
                    {
                        Name = "id",
                        BaseTypeName = "integer",
                        AutoIncrement = true,
                        Unique = true,
                        Nullable = false
                    },
                    new()
                    {
                        Name = "first_name",
                        DisplayName = "First name",
                        BaseTypeName = "string",
                        Nullable = false
                    },
                    new()
                    {
                        Name = "last_name",
                        DisplayName = "Last name",
                        BaseTypeName = "string",
                        Nullable = false
                    },
                    new()
                    {
                        Name = "employment_date",
                        DisplayName = "Employment date",
                        BaseTypeName = "datetime",
                        Nullable = true
                    },
                ]
            }
        }
    };

    public static readonly Dictionary<string, DataCollectionUpdateDTO> PatchDataCollections = new()
    {
        {
            "people",
            new()
            {
                DisplayName = "Users updated",
                Columns =
                [
                    new()
                    {
                        Action = ColumnAlterationType.Add,
                        Name = "age",
                        DisplayName = "User age",
                        BaseTypeName = "integer",
                    },
                    new()
                    {
                        Action = ColumnAlterationType.Drop,
                        Name = "username",
                    },
                    new()
                    {
                        Action = ColumnAlterationType.Rename,
                        OldName = "password",
                        Name = "password_hash",
                        BaseTypeName = "string",
                    },
                ]
            }
        }
    };
}