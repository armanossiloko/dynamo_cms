# GraphQL API

## Overview
Provide a GraphQL endpoint alongside the existing REST API, allowing clients to request exactly the data they need.

## Priority: 8 (Medium)
Offers greater flexibility and efficiency for frontend developers, reducing over-fetching and under-fetching of data.

## Implementation Plan

### Backend Changes

#### 1. Install HotChocolate
**File: `backend/src/Dynamo.CMS.API/Dynamo.CMS.API.csproj`**
```xml
<PackageReference Include="HotChocolate.AspNetCore" Version="14.0.0" />
<PackageReference Include="HotChocolate.Data.EntityFramework" Version="14.0.0" />
<PackageReference Include="HotChocolate.Types.Analyzers" Version="14.0.0" />
```

#### 2. Configure GraphQL
**File: `backend/src/Dynamo.CMS.API/Program.cs`**
```csharp
builder.Services.AddGraphQLServer()
    .AddQueryType<Query>()
    .AddMutationType<Mutation>()
    .AddSubscriptionType<Subscription>()
    .AddProjections()
    .AddFiltering()
    .AddSorting()
    .SetRequestOptions(new RequestOptions
    {
        IncludeExceptionDetails = builder.Environment.IsDevelopment()
    })
    .AddAuthorization();

app.MapGraphQL();
app.UseGraphQLVoyager("/graphql-voyager");
app.UseGraphQLPlayground("/graphql-playground");
```

#### 3. Create GraphQL Types
**File: `backend/src/Dynamo.CMS.API/GraphQL/Types/DataCollectionType.cs`**
```csharp
public class DataCollectionType : ObjectType<DataCollection>
{
    protected override void Configure(IObjectTypeDescriptor<DataCollection> descriptor)
    {
        descriptor.Name("DataCollection");
        descriptor.Field(x => x.Id).Type<NonNullType<IdType>>();
        descriptor.Field(x => x.Name).Type<NonNullType<StringType>>();
        descriptor.Field(x => x.DisplayName).Type<NonNullType<StringType>>();
        descriptor.Field(x => x.Description).Type<StringType>();
        descriptor.Field(x => x.EnableI18n).Type<NonNullType<BooleanType>>();
    }
}
```

#### 4. Create Dynamic Entry Type
**File: `backend/src/Dynamo.CMS.API/GraphQL/Types/DynamicEntryType.cs`**
```csharp
public class DynamicEntryType : ObjectType
{
    protected override void Configure(IObjectTypeDescriptor descriptor)
    {
        descriptor.Name("DynamicEntry");
        descriptor.IsDynamic();

        // This will be populated dynamically based on collection schema
    }
}
```

#### 5. Create Query Type
**File: `backend/src/Dynamo.CMS.API/GraphQL/Query.cs`**
```csharp
[ExtendObjectType(OperationType.Query)]
public class Query
{
    [UseProjection]
    [UseFiltering]
    [UseSorting]
    public IQueryable<DataCollection> GetDataCollections([Service] AppDbContext context)
    {
        return context.DataCollections;
    }

    public async Task<IEnumerable<Dictionary<string, object>>> GetEntries(
        string collectionName,
        [Service] AppDbContext context,
        [Service] IDynamicSchemaService schemaService)
    {
        var schema = await schemaService.GetSchemaAsync(collectionName);
        return await context.GetDataEntriesAsync(collectionName);
    }

    public async Task<Dictionary<string, object>?> GetEntry(
        string collectionName,
        int id,
        [Service] AppDbContext context)
    {
        return await context.GetDataEntryAsync(collectionName, id);
    }
}
```

#### 6. Create Mutation Type
**File: `backend/src/Dynamo.CMS.API/GraphQL/Mutation.cs`**
```csharp
[ExtendObjectType(OperationType.Name)]
public class Mutation
{
    public async Task<Dictionary<string, object>> CreateEntry(
        string collectionName,
        Dictionary<string, object> data,
        [Service] AppDbContext context,
        [Service] IDynamicSchemaService schemaService)
    {
        var id = await context.CreateDataEntryAsync(collectionName, data);
        return await context.GetDataEntryAsync(collectionName, id);
    }

    public async Task<Dictionary<string, object>?> UpdateEntry(
        string collectionName,
        int id,
        Dictionary<string, object> data,
        [Service] AppDbContext context)
    {
        var success = await context.UpdateDataEntryAsync(collectionName, id, data);
        if (!success) return null;
        return await context.GetDataEntryAsync(collectionName, id);
    }

    public async Task<bool> DeleteEntry(
        string collectionName,
        int id,
        [Service] AppDbContext context)
    {
        return await context.DeleteDataEntryAsync(collectionName, id);
    }
}
```

#### 7. Create Subscription Type
**File: `backend/src/Dynamo.CMS.API/GraphQL/Subscription.cs`**
```csharp
[ExtendObjectType(OperationType.Name)]
public class Subscription
{
    [Subscribe]
    [Topic("entry_created")]
    public async Task<Dictionary<string, object>> OnEntryCreated(string collectionName)
    {
        await Task.CompletedTask;
        return new Dictionary<string, object>();
    }

    [Subscribe]
    [Topic("entry_updated")]
    public async Task<Dictionary<string, object>> OnEntryUpdated(string collectionName)
    {
        await Task.CompletedTask;
        return new Dictionary<string, object>();
    }

    [Subscribe]
    [Topic("entry_deleted")]
    public async Task<int> OnEntryDeleted(string collectionName)
    {
        await Task.CompletedTask;
        return 0;
    }
}
```

#### 8. Add SignalR for Subscriptions
**File: `backend/src/Dynamo.CMS.API/GraphQL/SubscriptionExtensions.cs`**
```csharp
public static class SubscriptionExtensions
{
    public static void PublishEntryCreated(string collectionName, Dictionary<string, object> entry)
    {
        // Publish to subscribers
    }

    public static void PublishEntryUpdated(string collectionName, Dictionary<string, object> entry)
    {
        // Publish to subscribers
    }

    public static void PublishEntryDeleted(string collectionName, int id)
    {
        // Publish to subscribers
    }
}
```

### Frontend Changes

#### 1. Install Apollo Client
```bash
cd frontend
npm install @apollo/client graphql
```

#### 2. Configure Apollo Client
**File: `frontend/src/app/config/apollo.config.ts`**
```typescript
import { ApolloClient, InMemoryCache, HttpLink, split } from '@apollo/client/core';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';

const httpLink = new HttpLink({
  uri: '/graphql'
});

const wsLink = new GraphQLWsLink(createClient({
  url: 'ws://localhost:5000/graphql',
}));

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  httpLink
);

export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache()
});
```

#### 3. Create GraphQL Service
**File: `frontend/src/app/services/graphql.service.ts`**
```typescript
import { Injectable } from '@angular/core';
import { Apollo, gql, Mutation, Query } from '@apollo/client/core';

@Injectable({ providedIn: 'root' })
export class GraphQLService {
  constructor(private apollo: Apollo) {}

  getEntries(collectionName: string, fields: string[]) {
    return this.apollo.query({
      query: gql`
        query GetEntries($collectionName: String!) {
          getEntries(collectionName: $collectionName) {
            ${fields.join('\n')}
          }
        }
      `,
      variables: { collectionName }
    });
  }

  createEntry(collectionName: string, data: any) {
    return this.apollo.mutate({
      mutation: gql`
        mutation CreateEntry($collectionName: String!, $data: GenericInput!) {
          createEntry(collectionName: $collectionName, data: $data) {
            id
            name
          }
        }
      `,
      variables: { collectionName, data }
    });
  }

  updateEntry(collectionName: string, id: number, data: any) {
    return this.apollo.mutate({
      mutation: gql`
        mutation UpdateEntry($collectionName: String!, $id: Int!, $data: GenericInput!) {
          updateEntry(collectionName: $collectionName, id: $id, data: $data) {
            id
            name
          }
        }
      `,
      variables: { collectionName, id, data }
    });
  }

  deleteEntry(collectionName: string, id: number) {
    return this.apollo.mutate({
      mutation: gql`
        mutation DeleteEntry($collectionName: String!, $id: Int!) {
          deleteEntry(collectionName: $collectionName, id: $id)
        }
      `,
      variables: { collectionName, id }
    });
  }

  subscribeToEntryCreated(collectionName: string, fields: string[]) {
    return this.apollo.subscribe({
      query: gql`
        subscription OnEntryCreated($collectionName: String!) {
          onEntryCreated(collectionName: $collectionName) {
            ${fields.join('\n')}
          }
        }
      `,
      variables: { collectionName }
    });
  }
}
```

#### 4. Create GraphQL Explorer Component
**File: `frontend/src/app/components/graphql/graphql-explorer.component.ts`**
```typescript
@Component({
  selector: 'app-graphql-explorer',
  template: `
    <div class="graphql-explorer">
      <div class="query-editor">
        <label>GraphQL Query</label>
        <textarea [(ngModel)]="query" rows="15"></textarea>
        <button (click)="executeQuery()">Execute</button>
      </div>

      <div class="result">
        <label>Result</label>
        <pre>{{ result | json }}</pre>
      </div>
    </div>
  `,
  standalone: true
})
export class GraphQLExplorerComponent {
  query = `query {
  getDataCollections {
    id
    name
    displayName
  }
}`;
  result: any = null;

  constructor(private apollo: Apollo) {}

  executeQuery() {
    this.apollo.query({
      query: gql(this.query)
    }).subscribe({
      next: (data) => this.result = data.data,
      error: (err) => this.result = { error: err.message }
    });
  }
}
```

## API Changes

### GraphQL Endpoint
```
POST /graphql
GET  /graphql-voyager
GET  /graphql-playground
```

## Dependencies

### Backend
```xml
<PackageReference Include="HotChocolate.AspNetCore" Version="14.0.0" />
<PackageReference Include="HotChocolate.Data.EntityFramework" Version="14.0.0" />
```

### Frontend
```bash
npm install @apollo/client graphql graphql-ws
```

## Rollout Plan

1. **Phase 1**: Install and configure HotChocolate
2. **Phase 2**: Create GraphQL types for existing models
3. **Phase 3**: Implement dynamic schema generation
4. **Phase 4**: Create Query and Mutation types
5. **Phase 5**: Add Subscription support with SignalR
6. **Phase 6**: Configure Apollo Client in frontend
7. **Phase 7**: Create GraphQL service and components
8. **Phase 8**: Add GraphQL explorer/playground
9. **Phase 9**: Add authentication/authorization
10. **Phase 10**: Add caching and performance optimization

## Success Criteria

- GraphQL endpoint available alongside REST API
- Dynamic schema generation for collections
- Queries support projections, filtering, and sorting
- Mutations for CRUD operations
- Subscriptions for real-time updates
- GraphQL playground accessible
- Authentication and authorization working
- Frontend can use GraphQL for data fetching
