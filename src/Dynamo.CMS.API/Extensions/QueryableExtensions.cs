using Microsoft.EntityFrameworkCore;

namespace Dynamo.CMS.API.Extensions;

public static class QueryableExtensions
{
    /// <summary>
    /// Paginates the specified query asynchronously.
    /// </summary>
    /// <typeparam name="T">The type of elements in the query.</typeparam>
    /// <param name="query">The query to paginate.</param>
    /// <param name="page">The page number to retrieve (default is 1).</param>
    /// <param name="itemsPerPage">The number of items per page (default is 20).</param>
    /// <param name="cancellationToken">The cancellation token (default is <see cref="CancellationToken"/>).</param>
    /// <returns>
    /// A tuple containing the total count of items in the query and the paginated query result.
    /// </returns>
    public static async Task<(int totalCount, IQueryable<T> postQuery)> PaginateAsync<T>(
        this IQueryable<T> query,
        int page,
        int itemsPerPage,
        CancellationToken cancellationToken = default
    )
    {
        var totalCount = await query.CountAsync(cancellationToken);
        var itemsToSkip = (page - 1) * itemsPerPage;
        query = query.Skip(itemsToSkip).Take(itemsPerPage);
        return (totalCount, query);
    }

}
