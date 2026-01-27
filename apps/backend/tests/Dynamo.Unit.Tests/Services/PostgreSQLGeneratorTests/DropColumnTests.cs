using Dynamo.CMS.API.Services;

namespace Dynamo.Unit.Tests.Services.PostgreSQLGeneratorTests;

[UnitTest]
public class DropColumnTests
{
    private readonly PostgreSQLGenerator _sqlGenerator;

    public DropColumnTests()
    {
        _sqlGenerator = new(new SqlValidator());
    }

    [Fact]
    public void GenerateAlterTableSql_ShouldReturnProperDropColumnSql_WhenInputIsValid()
    {
        // Arrange
        const string expectedAlterSql = @"ALTER TABLE ""users""
DROP COLUMN ""username""";
        var tableName = "users";
        var addColumnInfo = new TableColumnInfo { Name = "username", DbDataType = "" };

        // Act
        var alterResult = _sqlGenerator.GenerateAlterTableSql(tableName, ColumnAlterationType.Drop, addColumnInfo);

        // Assert
        Assert.NotNull(alterResult);
        Assert.NotEmpty(alterResult);
        Assert.Equal(expectedAlterSql, alterResult);
    }
}
