using Dynamo.CMS.API.Models;
using System.Text.Json;

namespace Dynamo.CMS.API.GraphQL;

public class EntryChangePayload
{
    public string CollectionName { get; set; } = string.Empty;
    public int EntryId { get; set; }
    public string DataJson { get; set; } = "{}";
}

public class Subscription
{
    [Subscribe]
    [Topic("entry_created_{collectionName}")]
    public EntryChangePayload OnEntryCreated(
        string collectionName,
        [EventMessage] EntryChangePayload message)
    {
        return message;
    }

    [Subscribe]
    [Topic("entry_updated_{collectionName}")]
    public EntryChangePayload OnEntryUpdated(
        string collectionName,
        [EventMessage] EntryChangePayload message)
    {
        return message;
    }

    [Subscribe]
    [Topic("entry_deleted_{collectionName}")]
    public int OnEntryDeleted(
        string collectionName,
        [EventMessage] int id)
    {
        return id;
    }

    [Subscribe]
    [Topic("collection_changed")]
    public DataCollection OnCollectionChanged(
        [EventMessage] DataCollection collection)
    {
        return collection;
    }
}
