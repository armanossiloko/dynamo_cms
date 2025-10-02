using Dynamo.CMS.API.Services;

namespace Dynamo.Unit.Tests.Services.PostgreSQLGeneratorTests;

[UnitTest]
public class RenameColumnTests
{
    private readonly PostgreSQLGenerator _sqlGenerator;

    public RenameColumnTests()
    {
        _sqlGenerator = new(new SqlValidator());
    }

    [Fact]
    public void GenerateAlterTableSql_ShouldReturnProperRenameColumnSql_WhenInputIsValid()
    {
        // Arrange
        var tableName = "users";
        const string expectedAlterSql = @"ALTER TABLE ""users""
RENAME COLUMN ""username"" TO ""user_name""";
        var addColumnInfo = new TableColumnInfo { OldName = "username", Name = "user_name", };

        // Act
        var alterResult = _sqlGenerator.GenerateAlterTableSql(tableName, ColumnAlterationType.Rename, addColumnInfo);

        // Assert
        Assert.NotNull(alterResult);
        Assert.NotEmpty(alterResult);
        Assert.Equal(expectedAlterSql, alterResult);
    }

    [Fact]
    public void GenerateAlterTableSql_ShouldThrowExceptionOnRenameColumn_WhenOldNameIsNull()
    {
        // Arrange
        var tableName = "users";
        var addColumnInfo = new TableColumnInfo { OldName = "", Name = "" };

        // Act
        Action alterResult = () => _sqlGenerator.GenerateAlterTableSql(tableName, ColumnAlterationType.Rename, addColumnInfo);

        // Assert
        Assert.Throws<ArgumentNullException>(nameof(addColumnInfo.OldName), alterResult);
    }

    [Fact]
    public void GenerateAlterTableSql_ShouldThrowExceptionOnRenameColumn_WhenNameIsNull()
    {
        // Arrange
        var tableName = "users";
        var addColumnInfo = new TableColumnInfo { OldName = "username", Name = "" };

        // Act
        Action alterResult = () => _sqlGenerator.GenerateAlterTableSql(tableName, ColumnAlterationType.Rename, addColumnInfo);

        // Assert
        Assert.Throws<ArgumentNullException>(nameof(addColumnInfo.Name), alterResult);
    }

}
