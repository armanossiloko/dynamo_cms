using Dynamo.CMS.API.Services;

namespace Dynamo.Unit.Tests.Services.PostgreSQLGeneratorTests;

[UnitTest]
public class ChangeColumnTypeTests
{
    private readonly PostgreSQLGenerator _sqlGenerator;

    public ChangeColumnTypeTests()
    {
        _sqlGenerator = new(new SqlValidator());
    }

    [Fact]
    public void GenerateAlterTableSql_ShouldReturnProperChangeTypeColumnSql_WhenInputIsValid()
    {
        // Arrange
        var tableName = "users";
        const string expectedAlterSql = @"ALTER TABLE ""users""
ALTER COLUMN ""username"" TYPE TEXT";
        var addColumnInfo = new TableColumnInfo { Name = "username", DbDataType = "TEXT", };

        // Act
        var alterResult = _sqlGenerator.GenerateAlterTableSql(tableName, ColumnAlterationType.ChangeType, addColumnInfo);

        // Assert
        Assert.NotNull(alterResult);
        Assert.NotEmpty(alterResult);
        Assert.Equal(expectedAlterSql, alterResult);
    }

    [Fact]
    public void GenerateAlterTableSql_ShouldThrowExceptionOnChangeTypeColumn_WhenDbDataTypeIsNull()
    {
        // Arrange
        var tableName = "users";
        var addColumnInfo = new TableColumnInfo { Name = "username", DbDataType = "" };

        // Act
        Action alterResult = () => _sqlGenerator.GenerateAlterTableSql(tableName, ColumnAlterationType.ChangeType, addColumnInfo);

        // Assert
        Assert.Throws<ArgumentNullException>(nameof(addColumnInfo.DbDataType), alterResult);
    }

    [Fact]
    public void GenerateAlterTableSql_ShouldThrowExceptionOnChangeTypeColumn_WhenNameIsNull()
    {
        // Arrange
        var tableName = "users";
        var addColumnInfo = new TableColumnInfo { Name = "", DbDataType = "" };

        // Act
        Action alterResult = () => _sqlGenerator.GenerateAlterTableSql(tableName, ColumnAlterationType.ChangeType, addColumnInfo);

        // Assert
        Assert.Throws<ArgumentNullException>(nameof(addColumnInfo.Name), alterResult);
    }
}
