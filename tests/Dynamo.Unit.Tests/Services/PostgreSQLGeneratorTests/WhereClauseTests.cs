using Dynamo.CMS.API.Services;

namespace Dynamo.Unit.Tests.Services.PostgreSQLGeneratorTests;

[UnitTest]
public class WhereClauseTests
{
    private readonly PostgreSQLGenerator _sqlGenerator;

    public WhereClauseTests()
    {
        _sqlGenerator = new(new SqlValidator());
    }

    [Fact]
    public void BuildWhereClause_ShouldThrowArgumentNullException_WhenTopFilterIsNull()
    {
        // Arrange
        FilterConditionDTO? filterCondition = null;

        // Act
        Action action = () => _sqlGenerator.BuildWhereClause(filterCondition);

        // Assert
        Assert.Throws<ArgumentNullException>(action);
    }

    [Fact]
    public void BuildWhereClause_ShouldThrowArgumentNullException_WhenTopFilterConditionsAreNull()
    {
        // Arrange
        FilterConditionDTO filterCondition = new()
        {
            Conditions = null,
        };

        // Act
        Action action = () => _sqlGenerator.BuildWhereClause(filterCondition);

        // Assert
        Assert.Throws<ArgumentNullException>(action);
    }

    [Fact]
    public void BuildWhereClause_ShouldThrowArgumentNullException_WhenTopFilterHasNoConditions()
    {
        // Arrange
        FilterConditionDTO filterCondition = new()
        {
            Conditions = [],
        };

        // Act
        Action action = () => _sqlGenerator.BuildWhereClause(filterCondition);

        // Assert
        Assert.Throws<ArgumentNullException>(action);
    }

    [Fact]
    public void BuildWhereClause_ShouldThrowArgumentException_WhenNestedConditionHasNoOperatorNorFilter()
    {
        // Arrange
        FilterConditionDTO filterCondition = new()
        {
            Conditions =
            [
                new FilterConditionDTO
                {
                    Filter = null,
                    Operator = null
                }
            ],
        };

        // Act
        Action action = () => _sqlGenerator.BuildWhereClause(filterCondition);

        // Assert
        Assert.Throws<ArgumentException>(action);
        //action.Should().Throw<ArgumentException>().WithMessage("Either a filter or an operator with conditions are required");
    }


    [Fact]
    public void BuildWhereClause_ShouldThrowInvalidOperationException_WhenNestedFilterHasNoConditions()
    {
        // Arrange
        FilterConditionDTO filterCondition = new()
        {
            Conditions =
            [
                new FilterConditionDTO
                {
                    Filter = FilterType.AND,
                    Conditions = [],
                }
            ],
        };

        // Act
        Action action = () => _sqlGenerator.BuildWhereClause(filterCondition);

        // Assert
        Assert.Throws<ArgumentException>(action);
        //action.Should().Throw<ArgumentException>().WithMessage("A filter requires at least one condition.");
    }

    [Theory]
    [InlineData("ANY")]
    public void BuildWhereClause_ShouldThrowInvalidOperationException_WhenNestedOperatorsAreNotSupported(string unsupportedOperator)
    {
        // Arrange
        FilterConditionDTO filterCondition = new()
        {
            Conditions =
            [
                new FilterConditionDTO
                {
                    Operator = "ANY",
                }
            ],
        };

        // Act
        Action action = () => _sqlGenerator.BuildWhereClause(filterCondition);

        // Assert
        Assert.Throws<NotSupportedException>(action);
        //action.Should().Throw<NotSupportedException>().WithMessage($"Operator {unsupportedOperator} is not supported or does not exist.");
    }

    [Theory]
    [InlineData("IN")]
    [InlineData("BETWEEN")]
    public void BuildWhereClause_ShouldThrowArgumentException_WhenRangeOperatorsHaveIncompatibleValues(string @operator)
    {
        // Arrange
        FilterConditionDTO filterCondition = new()
        {
            Filter = FilterType.AND,
            Conditions =
            [
                new FilterConditionDTO
                {
                    Operator = @operator,
                    Value = "not-a-range"
                }
            ],
        };

        // Act
        Action action = () => _sqlGenerator.BuildWhereClause(filterCondition);

        // Assert
        Assert.Throws<ArgumentException>(action);
        //action.Should().Throw<ArgumentException>().WithMessage($"The {@operator} operator requires a range of values to apply to.");
    }

    [Fact]
    public void BuildWhereClause_ShouldThrowArgumentException_WhenBETWEENOperatorHasMoreThanTwoValues()
    {
        // Arrange
        FilterConditionDTO filterCondition = new()
        {
            Filter = FilterType.AND,
            Conditions =
            [
                new FilterConditionDTO
                {
                    Operator = "BETWEEN",
                    Value = new[] { "2023-01-01", "2023-06-01", "2024-01-01" }
                }
            ],
        };

        // Act
        Action action = () => _sqlGenerator.BuildWhereClause(filterCondition);

        // Assert
        Assert.Throws<ArgumentException>(action);
        //action.Should().Throw<ArgumentException>().WithMessage("Ranges for BETWEEN must consist of 2 elements.");
    }

    [Fact]
    public void BuildWhereClause_ShouldBuildLevelOneClause_WhenFiltersAreValid()
    {
        // Arrange
        var filterCondition = new FilterConditionDTO
        {
            Filter = FilterType.AND,
            Conditions =
            [
                new()
                {
                    Field = "age",
                    Operator = ">",
                    Value = 21,
                },
                new()
                {
                    Field = "age",
                    Operator = "<=",
                    Value = 40,
                },
            ]
        };

        // Act
        var result = _sqlGenerator.BuildWhereClause(filterCondition);

        // Assert
        Assert.NotNull(result);
        Assert.NotEmpty(result);
        Assert.Equal(@"(""age"" > 21 AND ""age"" <= 40)", result);
    }

    [Fact()]
    public void BuildWhereClause_ShouldBuildLevelTwoClause_WhenFiltersAreValid()
    {
        // Arrange
        const string expected = @"(""age"" > 21 AND (""city"" = 'New York' OR ""city"" = 'San Francisco') AND ""salary"" > 21000 AND ""team"" IN ('Backend', 'Frontend'))";
        var filterCondition = new FilterConditionDTO
        {
            Filter = FilterType.AND,
            Conditions =
            [
                new()
                {
                    Field = "age",
                    Operator = ">",
                    Value = 21,
                },
                new()
                {
                    Filter = FilterType.OR,
                    Conditions =
                    [
                        new()
                        {
                            Field = "city",
                            Operator = "=",
                            Value = "New York",
                        },
                        new()
                        {
                            Field = "city",
                            Operator = "=",
                            Value = "San Francisco",
                        },
                    ],
                },
                new()
                {
                    Field = "salary",
                    Operator = ">",
                    Value = 21000,
                },
                new()
                {
                    Field = "team",
                    Operator = "IN",
                    Value = new[] { "Backend", "Frontend" },
                }
            ]
        };

        // Act
        var result = _sqlGenerator.BuildWhereClause(filterCondition);

        // Assert
        Assert.NotNull(result);
        Assert.NotEmpty(result);
        Assert.Equal(expected, result);
    }
}
