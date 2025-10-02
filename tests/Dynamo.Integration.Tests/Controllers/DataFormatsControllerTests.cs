using Dynamo.CMS.API.Contracts;
using System.Net;
using System.Net.Http.Json;

namespace Dynamo.Integration.Tests.Controllers;

[IntegrationTest]
public class dataCollectionsControllerTests : IClassFixture<DynamoFactory>
{
    private const string _baseUrl = "api/collections";
    private readonly DynamoFactory _dynamoFactory;

    public dataCollectionsControllerTests(
        DynamoFactory dynamoFactory
        )
    {
        _dynamoFactory = dynamoFactory;
    }

    [Fact]
    public async Task CreateTable_ShouldCreatedataCollection()
    {
        // Arrange
        var postdataCollection = DataCollectionData.PostDataCollections["employees"];
        using var client = _dynamoFactory.CreateClient();

        // Act
        using var postResponse = await client.PostAsJsonAsync(_baseUrl, postdataCollection);
        using var getResponse = await client.GetAsync(_baseUrl);
        var dataCollections = await getResponse.Content.ReadFromJsonAsync<List<DataCollectionDTO>>();

        // Assert
        Assert.Equal(HttpStatusCode.OK, postResponse.StatusCode);
        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);
        Assert.NotNull(dataCollections);
        Assert.NotEmpty(dataCollections);

        var dataCollection = dataCollections!.FirstOrDefault(d => d.Name == postdataCollection.Name);
        Assert.NotNull(dataCollection);
        Assert.Equal(postdataCollection.Name, dataCollection!.Name);
    }

    [Fact]
    public async Task AlterTable_ShouldCreatedataCollection()
    {
        // Arrange
        const string dataCollectionName = "people";
        var postdataCollection = DataCollectionData.PostDataCollections[dataCollectionName];
        var patchdataCollection = DataCollectionData.PatchDataCollections[dataCollectionName];
        using var client = _dynamoFactory.CreateClient();
        var uri = $"{_baseUrl}?dataCollectionName={postdataCollection.Name}";

        // Act
        using var postResponse = await client.PostAsJsonAsync(_baseUrl, postdataCollection);
        using var patchResponse = await client.PatchAsJsonAsync(uri, patchdataCollection);
        using var getResponse = await client.GetAsync(_baseUrl);
        var dataCollections = await getResponse.Content.ReadFromJsonAsync<List<DataCollectionDTO>>();

        // Assert
        Assert.Equal(HttpStatusCode.OK, postResponse.StatusCode);
        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);
        Assert.NotNull(dataCollections);
        Assert.NotEmpty(dataCollections);

        var dataCollection = dataCollections!.FirstOrDefault(d => d.Name == postdataCollection.Name);
        Assert.NotNull(dataCollection);
        Assert.Equal(postdataCollection.Name, dataCollection!.Name);
        Assert.Equal(patchdataCollection.DisplayName, dataCollection.DisplayName);
        Assert.NotNull(dataCollection.Columns);
        Assert.NotEmpty(dataCollection.Columns);
        Assert.Equal(4, dataCollection.Columns.Count);

        var columns = dataCollection.Columns.Select(c => c.Name).ToList();
        Assert.Contains("age", columns);
        Assert.Contains("password_hash", columns);
        Assert.DoesNotContain("username", columns);
    }
}