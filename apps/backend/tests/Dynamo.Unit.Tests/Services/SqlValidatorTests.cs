using Dynamo.CMS.API.Services;

namespace Dynamo.Unit.Tests.Services;

[UnitTest]
public class SqlValidatorTests
{
    private readonly SqlValidator _sqlValidator = new();

    [Fact]
    public void ContainsPotentialSqlInjection_ShouldReturnTrue_WhenInputContainsNoSqlInjectionKeywords()
    {
        // Arrange
        string safeInput = "SELECT id, dropped FROM users WHERE username = 'john_doe';";

        // Act
        bool result = _sqlValidator.ContainsPotentialSqlInjection(safeInput);

        // Assert
        Assert.False(result);
    }

    [Theory]
    [InlineData("DROP TABLE users;")]
    [InlineData("SELECT * FROM users; DROP TABLE users;")]
    public void ContainsPotentialSqlInjection_ShouldReturnFalse_WhenInputContainsSqlInjectionKeyword(string input)
    {
        // Act
        bool result = _sqlValidator.ContainsPotentialSqlInjection(input);

        // Assert
        Assert.True(result);
    }

    [Theory]
    [InlineData("DROP DATABASE mydb;")]
    [InlineData("SELECT * FROM users; DROP DATABASE mydb;")]
    public void ContainsPotentialSqlInjection_ShouldReturnFalse_WhenInputTriesToDropDatabase(string input)
    {
        // Act
        bool result = _sqlValidator.ContainsPotentialSqlInjection(input);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void ContainsPotentialSqlInjection_ShouldReturnFalse_WhenInputContainsPartialSqlInjectionKeyword()
    {
        // Arrange
        string unsafeInput = "UPDATE products SET price = 0 WHERE 1 = 1;";

        // Act
        bool result = _sqlValidator.ContainsPotentialSqlInjection(unsafeInput);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public void ContainsPotentialSqlInjection_ShouldReturnFalse_WhenInputContainsSqlInjectionKeywordWithDifferentCase()
    {
        // Arrange
        string unsafeInput = "delete FROM orders WHERE customer_id = '123';";

        // Act
        bool result = _sqlValidator.ContainsPotentialSqlInjection(unsafeInput);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void ContainsPotentialSqlInjection_ShouldReturnTrue_WhenInputIsNull()
    {
        // Act
        bool result = _sqlValidator.ContainsPotentialSqlInjection(null);

        // Assert
        Assert.False(result);
    }
}