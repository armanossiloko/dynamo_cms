using Dynamo.CMS.API.Services;

namespace Dynamo.Unit.Tests.Services.PostgreSQLGeneratorTests;

[UnitTest]
public class AddColumnTests
{
    private readonly PostgreSQLGenerator _sqlGenerator;

    public AddColumnTests()
    {
        _sqlGenerator = new(new SqlValidator());
    }

    [Fact]
    public void GenerateAlterTableSql_ShouldReturnProperAddColumnSql_WhenInputIsValid()
    {
        // Arrange
        const string expectedAlterSql = @"ALTER TABLE ""users""
ADD COLUMN ""birthdate"" timestamp without time zone";
        var tableName = "users";
        var addColumnInfo = new TableColumnInfo { Name = "birthdate", DbDataType = "timestamp without time zone", Nullable = true };

        // Act
        var alterResult = _sqlGenerator.GenerateAlterTableSql(tableName, ColumnAlterationType.Add, addColumnInfo);

        // Assert
        Assert.NotNull(alterResult);
        Assert.NotEmpty(alterResult);
        Assert.Equal(expectedAlterSql, alterResult);
    }

    [Fact]
    public void GenerateAlterTableSql_ShouldThrowExceptionOnAddColumn_WhenDbDataTypeIsNull()
    {
        // Arrange
        var tableName = "users";
        var addColumnInfo = new TableColumnInfo { Name = "birthdate", DbDataType = "" };

        // Act
        Action alterResult = () => _sqlGenerator.GenerateAlterTableSql(tableName, ColumnAlterationType.Add, addColumnInfo);

        // Assert
        Assert.Throws<ArgumentNullException>(nameof(addColumnInfo.DbDataType), alterResult);
    }

    [Fact]
    public void GenerateAlterTableSql_ShouldThrowExceptionOnAddColumn_WhenNameIsNull()
    {
        // Arrange
        var tableName = "users";
        var addColumnInfo = new TableColumnInfo { Name = "" };

        // Act
        Action alterResult = () => _sqlGenerator.GenerateAlterTableSql(tableName, ColumnAlterationType.Add, addColumnInfo);

        // Assert
        Assert.Throws<ArgumentNullException>(nameof(addColumnInfo.Name), alterResult);
    }

}
