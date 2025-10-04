# Dynamo.CMS Roadmap

This document outlines the future development path for Dynamo.CMS, based on a comparative analysis with established headless CMS platforms like Strapi and an assessment of potential innovative features.

The roadmap is divided into two main sections:
1.  **Core Features**: Essential functionalities that are currently missing but are standard in modern CMSs. These are critical for broadening the system's appeal and usability.
2.  **Future Enhancements**: Innovative and advanced features that would differentiate Dynamo.CMS, improve its architecture, and provide a competitive edge.

---

## 1. Core Features (Missing vs. Strapi)

These features are considered essential for Dynamo.CMS to be a competitive and complete headless CMS solution. They address the most significant gaps when compared to platforms like Strapi.

### 1.1. Internationalization (i18n)
- **Description**: A system for creating and managing content in multiple languages. This would allow users to define locales for their `DataCollections` and provide translations for each content entry.
- **Justification**: Essential for any application targeting a global audience. Without i18n, the CMS is limited to single-language use cases.
- **Potential Implementation**: Introduce new metadata tables to store locale information and relationships between translated entries. The API would need to be updated to handle locale-based queries (e.g., `GET /api/data/products?locale=fr`).

### 1.2. Webhooks
- **Description**: A mechanism to send HTTP notifications to external services when specific events occur within the CMS (e.g., `entry.create`, `entry.update`, `entry.delete`).
- **Justification**: Crucial for integrating the CMS with other systems in a modern tech stack. Common use cases include triggering a CDN cache purge, updating a search index (like Elasticsearch), or sending notifications to a Slack channel.
- **Potential Implementation**: Create a `Webhook` model to store URL and event configurations. A background service (e.g., a hosted ASP.NET Core Background Service) would listen for application events and dispatch the HTTP requests.

### 1.3. GraphQL API
- **Description**: Provide a GraphQL endpoint alongside the existing REST API. This would allow clients to request exactly the data they need, no more and no less, in a single query.
- **Justification**: Offers greater flexibility and efficiency for frontend developers, reducing over-fetching and under-fetching of data. It's becoming a standard expectation for modern headless CMSs.
- **Potential Implementation**: Integrate a library like **Hot Chocolate** or **GraphQL for .NET** to expose the `DataCollections` and their data through a GraphQL schema.

### 1.4. Rich Text Editor Field Type
- **Description**: A dedicated `BaseType` for rich text content, storing structured data (e.g., JSON) that can be rendered by a client-side WYSIWYG editor.
- **Justification**: Plain text fields are insufficient for articles, blog posts, or product descriptions. A rich text field is a fundamental requirement for most content-heavy applications.
- **Potential Implementation**: Add a new `BaseType` (e.g., "richtext"). The `PostgreSQLGenerator` would store this as `jsonb`.

### 1.5. Plugin/Extension System
- **Description**: An architecture that allows third-party developers to extend the CMS's functionality with plugins. This could involve adding new field types, new controllers, and new services.
- **Justification**: A plugin system fosters a community and allows the CMS to evolve beyond the core team's capacity. It's the primary reason for Strapi's vast ecosystem.
- **Potential Implementation**: This is a significant architectural change. It would likely involve defining clear interfaces, using a dependency injection container that supports dynamic loading, and creating a packaging/manifest system for plugins.

### 1.6. Advanced Media Management
- **Description**: Enhance the existing `Media` model with features like automatic image resizing (on upload), focal point cropping for responsive images, and direct integration with cloud storage providers (AWS S3, Azure Blob Storage).
- **Justification**: Basic file upload is not enough. Modern web applications require optimized images and scalable, durable cloud storage.
- **Potential Implementation**: Use a library like **ImageSharp** for on-the-fly image processing. Create an abstraction layer for storage providers so that the filesystem can be swapped out for S3 or other services.

### 1.7. Content Lifecycle / Workflows
- **Description**: Introduce states for content entries, such as "Draft" and "Published". Support for scheduled publishing (publish at a future date/time) and potentially multi-stage approval workflows.
- **Justification**: Critical for professional content management where content needs to be reviewed, approved, and published at specific times.
- **Potential Implementation**: Add status and `publishDate` columns to the dynamic tables. The `DataController` would need to be updated to filter by these states. A background scheduler (like Hangfire or Quartz.NET) could handle timed publishing.

---

## 2. Future Enhancements (Cool & Innovative Features)

These features go beyond the basics and aim to make Dynamo.CMS a more powerful, scalable, and unique platform.

### 2.1. Advanced Audit Logging
- **Description**: A comprehensive, immutable audit trail that logs every action performed within the system. This includes who created, updated, or deleted a record, what the changes were (old value vs. new value), and a timestamp.
- **Justification**: Invaluable for security compliance, debugging issues, and understanding user activity.
- **Potential Implementation**: Create an `AuditLog` table. Use Entity Framework Core's `ChangeTracker` to automatically detect and log changes. Alternatively, use database triggers for a more robust, app-agnostic solution.

### 2.2. API Versioning
- **Description**: Implement a formal API versioning strategy (e.g., `/api/v1/data/...`, `/api/v2/data/...`) to manage changes and breaking updates to the API without disrupting existing client applications.
- **Justification**: Essential for the long-term maintainability of any public or widely used API. It provides a clear contract for consumers.
- **Potential Implementation**: Leverage ASP.NET Core's built-in API versioning support, which is robust and flexible.

### 2.3. Real-Time Updates with SignalR
- **Description**: Use ASP.NET Core SignalR to push real-time notifications to connected clients. For example, if an admin user updates a product, other users viewing the product list could see the update instantly.
- **Justification**: Greatly improves the user experience in collaborative environments and for dashboards that need to display live data.
- **Potential Implementation**: Integrate SignalR and broadcast messages from the `DataController` (and other controllers) when data is modified.

### 2.4. Advanced Search Integration
- **Description**: Replace or augment basic database text search with a dedicated, powerful search engine like **Elasticsearch** or **Azure Cognitive Search**.
- **Justification**: Enables full-text search, typo tolerance, faceting, filtering on aggregated data, and much higher performance for large datasets.
- **Potential Implementation**: Set up a search engine cluster. Create a background process that indexes data from Dynamo.CMS into the search engine. The `DataController` could then be augmented to optionally route search queries to the search engine instead of the database.

### 2.5. Multi-Tenancy
- **Description**: Architect the system to support multiple, isolated tenants (e.g., different customers or projects) on a single instance of the application.
- **Justification**: A key requirement for SaaS (Software as a Service) applications, allowing for efficient resource utilization and simplified management.
- **Potential Implementation**: This is a major architectural change. Strategies include:
    - **Shared Database, Separate Schema**: Each tenant gets its own database schema.
    *   **Shared Database, Shared Schema, Discriminator Column**: All tables have a `TenantId` column. This is often simpler to implement but requires careful filtering in every query.

### 2.6. Event-Driven Architecture
- **Description**: Decouple the system's components by using an event bus. Instead of services calling each other directly, they publish events (e.g., `ProductCreatedEvent`) and other services subscribe to and react to these events.
- **Justification**: Increases scalability, maintainability, and resilience. It makes the system easier to extend and reason about.
- **Potential Implementation**: Integrate a message broker like **RabbitMQ** or **Azure Service Bus**. For simpler scenarios, an in-memory event bus could be a starting point.

### 2.7. Advanced Caching Layer
- **Description**: Implement a multi-layered caching strategy using a distributed cache like **Redis**. Cache frequently accessed data, entire API responses, and rendered database query results.
- **Justification**: One of the most effective ways to improve application performance and scalability, reducing load on the primary database.
- **Potential Implementation**: Use IDistributedCache interface in ASP.NET Core with a Redis provider. Implement cache-aside patterns for data access.

### 2.8. AI-Powered Features
- **Description**: Integrate with external AI services to provide intelligent features.
    -   **Automated Content Tagging/Suggestion**: Use NLP services to analyze text and suggest relevant tags or categories.
    -   **Image Alt-Text Generation**: Use vision AI models to automatically generate descriptive alt-text for images upon upload.
    *   **Content Summarization**: Automatically generate concise summaries for long-form content.
- **Justification**: Adds significant value by automating tedious tasks, improving SEO (via alt-text), and enhancing content discoverability.
- **Potential Implementation**: Integrate with cloud AI providers like **Azure Cognitive Services**, **Google AI Platform**, or **OpenAI** via their respective SDKs.
