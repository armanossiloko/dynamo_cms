using Dynamo.CMS.API.Models;
using System.Net.Http.Json;

namespace Dynamo.Integration.Tests.Controllers;

[IntegrationTest]
public class BaseTypesControllerTests : IClassFixture<DynamoFactory>
{
    private const string _baseUrl = "api/basetypes";
    private readonly DynamoFactory _dynamoFactory;

    public BaseTypesControllerTests(
        DynamoFactory dynamoFactory
        )
    {
        _dynamoFactory = dynamoFactory;
    }

    [Fact]
    public async Task GetBaseTypes_ShouldReturnBaseTypes()
    {
        // Arrange
        using var client = _dynamoFactory.CreateClient();

        // Act
        using var response = await client.GetAsync(_baseUrl);

        // Assert
        var responseData = await response.Content.ReadFromJsonAsync<List<BaseType>>();
        Assert.NotNull(responseData);
        Assert.NotEmpty(responseData);
    }
}