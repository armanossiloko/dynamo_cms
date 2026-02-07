using Dynamo.CMS.API.Models;
using Dynamo.CMS.API.Services;

namespace Dynamo.CMS.API.GraphQL;

public class Mutation
{
    [HotChocolate.Authorization.Authorize(Roles = new[] { "Admin" })]
    public async Task<Webhook> CreateWebhook(
        string name,
        string url,
        List<string> events,
        [Service] IWebhookService webhookService)
    {
        var dto = new Contracts.CreateWebhookDto
        {
            Name = name,
            Url = url,
            Events = events
        };

        return await webhookService.CreateWebhookAsync(dto, "graphql-user");
    }

    [HotChocolate.Authorization.Authorize(Roles = new[] { "Admin" })]
    public async Task<bool> DeleteWebhook(
        int id,
        [Service] IWebhookService webhookService)
    {
        await webhookService.DeleteWebhookAsync(id);
        return true;
    }
}
