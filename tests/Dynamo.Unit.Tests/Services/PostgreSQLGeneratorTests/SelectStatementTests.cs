using Dynamo.CMS.API.Services;
using Dynamo.CMS.API.Models;

namespace Dynamo.Unit.Tests.Services.PostgreSQLGeneratorTests;

[UnitTest]
public class SelectStatementTests
{
    private readonly PostgreSQLGenerator _sqlGenerator;

    public SelectStatementTests()
    {
        _sqlGenerator = new(new SqlValidator());
    }

    [Theory]
    [InlineData(1, 10, 0)]
    [InlineData(6, 10, 50)]
    public void GenerateSelectSql_ShouldReturnValidSelectStatement(int page, int itemsPerPage, int expectedQueryOffset)
    {
        // Arrange
        string expectedSelectSql = $@"SELECT ""id"" as ""Id"", ""username"" as ""User Name""
FROM ""users""
ORDER BY ""username""
OFFSET {expectedQueryOffset} ROWS
FETCH NEXT 10 ROWS ONLY";
        const string tableName = "users";
        var columns = new List<DataCollectionColumn>
        {
            new() { Name = "id", DisplayName = "Id", Nullable = false, AutoIncrement = false, Unique = false, Visible = true },
            new() { Name = "username", DisplayName = "User Name", Nullable = false, AutoIncrement = false, Unique = false, Visible = true },
        };

        // Act
        var result = _sqlGenerator.GenerateSelectSql(tableName, columns, orderBy: "username", page: page, itemsPerPage: itemsPerPage);

        // Assert
        Assert.NotNull(result);
        Assert.NotEmpty(result);
        Assert.Equal(expectedSelectSql, result);
    }

    [Theory]
    [InlineData("USER")]
    [InlineData("SELECT")]
    [InlineData("FROM")]
    [InlineData("WHERE")]
    [InlineData("HAVING")]
    [InlineData("JOIN")]
    [InlineData("ON")]
    [InlineData("AS")]
    [InlineData("VALUES")]
    [InlineData("UPDATE")]
    [InlineData("SET")]
    [InlineData("CREATE")]
    [InlineData("ALTER")]
    [InlineData("DROP")]
    [InlineData("INDEX")]
    [InlineData("CONSTRAINT")]
    [InlineData("UNIQUE")]
    [InlineData("DEFAULT")]
    [InlineData("NULL")]
    [InlineData("LIKE")]
    [InlineData("BETWEEN")]
    [InlineData("IN")]
    [InlineData("EXISTS")]
    [InlineData("UNION")]
    [InlineData("CASE")]
    [InlineData("WHEN")]
    [InlineData("THEN")]
    [InlineData("ELSE")]
    [InlineData("END")]
    [InlineData("AVG")]
    [InlineData("COUNT")]
    [InlineData("SUM")]
    [InlineData("MIN")]
    [InlineData("MAX")]
    [InlineData("DISTINCT")]
    public void GenerateSelectSql_ShouldReturnSelectStatementWithEscapedSQLKeyword(string sqlKeywordToEscape)
    {
        // Arrange
        string expectedSelectSql = $@"SELECT ""id"", ""title"", ""{sqlKeywordToEscape}""
FROM ""posts""";
        const string tableName = "posts";
        var columns = new List<DataCollectionColumn>
        {
            new() { Name = "id", DisplayName = "", Nullable = false, AutoIncrement = false, Unique = false, Visible = true },
            new() { Name = "title", DisplayName = "", Nullable = false, AutoIncrement = false, Unique = false, Visible = true },
            new() { Name = sqlKeywordToEscape, DisplayName = "", Nullable = false, AutoIncrement = false, Unique = false, Visible = true },
        };

        // Act
        var result = _sqlGenerator.GenerateSelectSql(tableName, columns);

        // Assert
        Assert.NotNull(result);
        Assert.NotEmpty(result);
        Assert.Equal(expectedSelectSql, result);
    }

    [Theory]
    [InlineData("DELETE")]
    [InlineData("EXEC")]
    [InlineData("--")]
    public void GenerateSelectSql_ShouldThrowException_WhenForbiddenSqlKeywordsAreUsed(string sqlKeyword)
    {
        // Arrange
        const string tableName = "posts";
        var columns = new List<DataCollectionColumn>
        {
            new() { Name = "id", DisplayName = "", Nullable = false, AutoIncrement = false, Unique = false, Visible = true },
            new() { Name = "title", DisplayName = "", Nullable = false, AutoIncrement = false, Unique = false, Visible = true },
            new() { Name = sqlKeyword, DisplayName = "", Nullable = false, AutoIncrement = false, Unique = false, Visible = true },
        };

        // Act
        Action selectAction = () => _sqlGenerator.GenerateSelectSql(tableName, columns);

        // Assert
        Assert.Throws<InvalidOperationException>(selectAction);
        //selectAction.Should().Throw<InvalidOperationException>().WithMessage("Possible SQL Injection detected.");
    }

}
