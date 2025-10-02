using Dynamo.CMS.API.Services;

namespace Dynamo.Unit.Tests.Services.PostgreSQLGeneratorTests;

[UnitTest]
public class CreateTableTests
{
    private readonly PostgreSQLGenerator _sqlGenerator;

    public CreateTableTests()
    {
        _sqlGenerator = new(new SqlValidator());
    }

    [Fact]
    public void GenerateCreateTableSql_ShouldReturnProperSql_WhenInputIsValid()
    {
        // Arrange
        const string expectedSql = @"CREATE TABLE users
(
	""id"" SERIAL UNIQUE,
	""name"" VARCHAR(50) NOT NULL,
	""age"" INT NULL UNIQUE
)";

        var tableName = "users";
        var columns = new List<TableColumnInfo>
        {
            new() { Name = "id", DbDataType = "INT", AutoIncrement = true, Unique = true },
            new() { Name = "name", DisplayName = "Name", DbDataType = "VARCHAR(50)", Nullable = false },
            new() { Name = "age", DisplayName = "Age", DbDataType = "INT", Nullable = true, Unique = true },
        };

        // Act
        var result = _sqlGenerator.GenerateCreateTableSql(tableName, columns);

        // Assert
        Assert.NotNull(result);
        Assert.NotEmpty(result);
        Assert.Equal(expectedSql, result);
    }
}