# Advanced Search Integration

## Overview
Replace basic database text search with dedicated search engine like Elasticsearch for full-text search, typo tolerance, and better performance.

## Priority: 14 (Low)
Enables powerful search capabilities for large datasets.

## Implementation Plan

### Backend Changes

#### 1. Install Elasticsearch Client
```xml
<PackageReference Include="Elastic.Clients.Elasticsearch" Version="8.15.0" />
```

#### 2. Configure Elasticsearch
**File: `backend/src/Dynamo.CMS.API/Services/Search/ElasticsearchService.cs`**
```csharp
public interface ISearchService
{
    Task IndexDocumentAsync(string collection, string id, Dictionary<string, object> document);
    Task BulkIndexDocumentsAsync(string collection, List<Dictionary<string, object>> documents);
    Task UpdateDocumentAsync(string collection, string id, Dictionary<string, object> document);
    Task DeleteDocumentAsync(string collection, string id);
    Task<SearchResult> SearchAsync(SearchQuery query);
    Task<bool> CreateIndexAsync(string collection);
    Task DeleteIndexAsync(string collection);
}

public class ElasticsearchService : ISearchService
{
    private readonly ElasticsearchClient _client;
    private readonly IConfiguration _configuration;

    public ElasticsearchService(IConfiguration configuration)
    {
        var settings = new ElasticsearchClientSettings(new Uri(configuration["Elasticsearch:Url"]))
            .DefaultIndex("dynamo-cms")
            .Authentication(new BasicAuthentication(
                configuration["Elasticsearch:Username"],
                configuration["Elasticsearch:Password"]
            ));

        _client = new ElasticsearchClient(settings);
    }

    public async Task<SearchResult> SearchAsync(SearchQuery query)
    {
        var indexName = $"collection-{query.CollectionName.ToLower()}";

        var searchResponse = await _client.SearchAsync<object>(s => s
            .Index(indexName)
            .From((query.Page - 1) * query.PageSize)
            .Size(query.PageSize)
            .Query(q =>
            {
                // Multi-match query for multiple fields
                var multiMatch = new MultiMatchQuery()
                {
                    Query = query.Query,
                    Fuzziness = query.Fuzzy ? "AUTO" : "0",
                    Operator = Operator.And,
                    Fields = query.Fields
                };

                if (query.Filters?.Any() == true)
                {
                    var boolQuery = new BoolQuery
                    {
                        Must = new[] { multiMatch }
                    };

                    foreach (var filter in query.Filters)
                    {
                        boolQuery.Filter = new[] {
                            new TermQuery { Field = filter.Key, Value = filter.Value }
                        };
                    }

                    return boolQuery;
                }

                return multiMatch;
            })
            .Sort(sort =>
            {
                if (!string.IsNullOrEmpty(query.SortField))
                {
                    return query.SortDescending
                        ? sort.Field(f => f.Field(query.SortField).Order(SortOrder.Descending))
                        : sort.Field(f => f.Field(query.SortField).Order(SortOrder.Ascending));
                }

                return sort.Field(f => f.Field("_score").Order(SortOrder.Descending));
            })
            .Highlight(h =>
            {
                h.Fields(query.Fields.Take(5).ToArray());
                h.PreTags("<mark>");
                h.PostTags("</mark>");
                h.FragmentSize(150);
                h.NumberOfFragments(3);
            })
        );

        return new SearchResult
        {
            Total = searchResponse.Total,
            Page = query.Page,
            PageSize = query.PageSize,
            Results = searchResponse.Documents.ToList(),
            Highlights = searchResponse.Hits.Select(h => h.Highlight).ToList()
        };
    }

    public async Task<bool> CreateIndexAsync(string collection)
    {
        var indexName = $"collection-{collection.ToLower()}";

        var response = await _client.Indices.CreateAsync(indexName, c => c
            .Mappings(m => m
                .Properties(p => new Properties(new Dictionary<PropertyName, IProperty>
                {
                    ["name"] = new TextProperty { Analyzer = "standard" },
                    ["description"] = new TextProperty { Analyzer = "standard" },
                    ["content"] = new TextProperty { Analyzer = "standard" },
                    ["status"] = new KeywordProperty(),
                    ["createdAt"] = new DateProperty(),
                    ["updatedAt"] = new DateProperty()
                }))
            ));

        return response.IsValidResponse;
    }
}

public record SearchResult(
    long Total,
    int Page,
    int PageSize,
    List<object> Results,
    List<IReadOnlyDictionary<string, string[]>> Highlights
);

public record SearchQuery(
    string CollectionName,
    string Query,
    string[] Fields,
    int Page = 1,
    int PageSize = 20,
    bool Fuzzy = false,
    Dictionary<string, object>? Filters = null,
    string? SortField = null,
    bool SortDescending = false
);
```

#### 3. Create SearchController
**File: `backend/src/Dynamo.CMS.API/Controllers/SearchController.cs`**
```csharp
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SearchController : ControllerBase
{
    private readonly ISearchService _searchService;
    private readonly AppDbContext _context;

    [HttpPost]
    public async Task<ActionResult<SearchResult>> Search(SearchQuery query)
    {
        var result = await _searchService.SearchAsync(query);
        return Ok(result);
    }

    [HttpPost("reindex/{collection}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> ReindexCollection(string collection)
    {
        // Get all data from database
        var data = await _context.GetDataEntriesAsync(collection);

        // Index all documents
        var documents = data.Select(d => (Dictionary<string, object>)d).ToList();
        await _searchService.BulkIndexDocumentsAsync(collection, documents);

        return Ok(new { indexed = documents.Count });
    }

    [HttpDelete("index/{collection}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> DeleteIndex(string collection)
    {
        await _searchService.DeleteIndexAsync(collection);
        return Ok();
    }
}
```

#### 4. Update DataController for Auto-indexing
```csharp
public class DataController : ControllerBase
{
    private readonly ISearchService _searchService;

    [HttpPost]
    public async Task<IActionResult> Create(string collection, [FromBody] Dictionary<string, object> data)
    {
        var result = await _dataService.CreateAsync(collection, data);
        var entry = await _dataService.GetByIdAsync(collection, result.ToString());

        // Index the document
        await _searchService.IndexDocumentAsync(collection, result.ToString(), entry);

        return Ok(entry);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string collection, string id, [FromBody] Dictionary<string, object> data)
    {
        var success = await _dataService.UpdateAsync(collection, id, data);
        if (success)
        {
            var entry = await _dataService.GetByIdAsync(collection, id);
            await _searchService.UpdateDocumentAsync(collection, id, entry);
        }

        return success ? Ok() : NotFound();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string collection, string id)
    {
        var success = await _dataService.DeleteAsync(collection, id);
        if (success)
        {
            await _searchService.DeleteDocumentAsync(collection, id);
        }

        return success ? NoContent() : NotFound();
    }
}
```

#### 5. Update Program.cs
```csharp
builder.Services.AddSingleton<ISearchService, ElasticsearchService>();
```

### Frontend Changes

#### 1. Create Search Component
```typescript
@Component({
  selector: 'app-search',
  template: `
    <div class="search">
      <div class="search-bar">
        <input
          type="text"
          [(ngModel)]="query"
          (keyup.enter)="search()"
          placeholder="Search..."
        >
        <button (click)="search()">Search</button>
      </div>

      <div class="search-options">
        <label>
          <input type="checkbox" [(ngModel)]="fuzzy">
          Fuzzy Search
        </label>
        <select [(ngModel)]="selectedCollection">
          <option value="">All Collections</option>
          @for (collection of collections; track collection.name) {
            <option [value]="collection.name">{{ collection.displayName }}</option>
          }
        </select>
      </div>

      <div class="results">
        @if (loading) {
          <div class="loading">Searching...</div>
        } @else if (results.length > 0) {
          <div class="result-info">
            Found {{ totalResults }} results
          </div>

          @for (result of results; track result.id) {
            <div class="result-item">
              <h3 [innerHTML]="highlight(result, 'name')"></h3>
              <p [innerHTML]="highlight(result, 'description')"></p>
            </div>
          }

          <div class="pagination">
            <button (click)="prevPage()" [disabled]="page === 1">Previous</button>
            <span>Page {{ page }}</span>
            <button (click)="nextPage()" [disabled]="page * pageSize >= totalResults">Next</button>
          </div>
        } @else {
          <div class="no-results">No results found</div>
        }
      </div>
    </div>
  `,
  standalone: true
})
export class SearchComponent {
  query = '';
  fuzzy = false;
  selectedCollection = '';
  collections: DataCollection[] = [];
  results: any[] = [];
  totalResults = 0;
  page = 1;
  pageSize = 20;
  loading = false;

  async ngOnInit() {
    this.collections = await this.collectionService.getCollections();
  }

  async search() {
    if (!this.query) return;

    this.loading = true;

    const searchQuery: SearchQuery = {
      collectionName: this.selectedCollection,
      query: this.query,
      fields: ['name', 'description', 'content'],
      page: this.page,
      pageSize: this.pageSize,
      fuzzy: this.fuzzy
    };

    const result = await firstValueFrom(this.searchService.search(searchQuery));

    this.results = result.results;
    this.totalResults = result.total;
    this.loading = false;
  }

  highlight(result: any, field: string): string {
    // Apply Elasticsearch highlighting
    const highlight = result._highlight?.[field]?.[0];
    return highlight || result[field] || '';
  }

  prevPage() {
    if (this.page > 1) {
      this.page--;
      this.search();
    }
  }

  nextPage() {
    if (this.page * this.pageSize < this.totalResults) {
      this.page++;
      this.search();
    }
  }
}
```

#### 2. Update Data List with Search
```typescript
@Component({
  template: `
    <div class="data-list-with-search">
      <app-search></app-search>
      <app-data-list></app-data-list>
    </div>
  `
})
```

## Dependencies

### Backend
```xml
<PackageReference Include="Elastic.Clients.Elasticsearch" Version="8.15.0" />
```

### Frontend
No new dependencies

## Rollout Plan

1. **Phase 1**: Install Elasticsearch client
2. **Phase 2**: Configure Elasticsearch connection
3. **Phase 3**: Implement search service
4. **Phase 4**: Create search controller
5. **Phase 5**: Add auto-indexing to data controller
6. **Phase 6**: Create search UI component
7. **Phase 7**: Add reindexing functionality
8. **Phase 8**: Add advanced filtering
9. **Phase 9**: Add search analytics
10. **Phase 10**: Add search suggestions/autocomplete

## Success Criteria

- Elasticsearch configured
- Search service working
- Auto-indexing on create/update/delete
- Search UI functional
- Fuzzy search supported
- Highlighting in results
- Pagination working
- Reindexing working
