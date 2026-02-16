# Dynamo CMS

A headless Content Management System built with .NET 9 and Angular 20. Dynamo CMS provides a flexible, API-first platform for managing dynamic content with custom schemas, media assets, and multilingual content.

<div align="center">

![.NET](https://img.shields.io/badge/.NET-9.0-512BD4?logo=dotnet)
![Angular](https://img.shields.io/badge/Angular-20-DD0031?logo=angular)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)
![License](https://img.shields.io/badge/License-MIT-green)

</div>

## Features

### Content Management
- **Dynamic Collections** - Create custom content types with flexible, schema-based field definitions
- **Single Types** - Manage unique content pages (e.g., homepage, about page)
- **Rich Text Editor** - TipTap-powered WYSIWYG editor with image and link support
- **Components & Dynamic Zones** - Reusable content blocks with flexible layouts
- **Media Library** - Upload, organize, and transform images and files with folder support
- **Versioning** - Track content changes and version history
- **Localization** - Multi-language content support with locale management

### API & Integration
- **RESTful API** - Full CRUD operations for all collections with API versioning
- **GraphQL API** - HotChocolate-powered GraphQL endpoint with playground and Voyager
- **Dynamic Swagger Docs** - Auto-generated OpenAPI documentation for each collection
- **Webhooks** - Event-driven integrations for content lifecycle events
- **API Versioning** - Support for multiple API versions

### Administration
- **User Management** - Complete user and role-based access control (RBAC)
- **JWT Authentication** - Secure token-based authentication with refresh tokens
- **Media Transformations** - On-demand image resizing and optimization
- **Email System** - SMTP integration with configurable providers
- **Dark/Light Theme** - Custom "Warm Obsidian" design system

## Quick Start with Docker

The fastest way to get started is using Docker Compose:

```bash
# Clone the repository
git clone <repository-url>
cd dynamo_cms

# Start all services
docker-compose up -d

# Access the applications
# Frontend: http://localhost:4200
# Backend API: http://localhost:7000
# API Docs: http://localhost:7000/scalar/v1
# GraphQL: http://localhost:7000/graphql
# PostgreSQL: localhost:15432
```

The default credentials are configured in [docker-compose.yml](docker-compose.yml).

## Tech Stack

### Backend
- **.NET 9.0** - High-performance web API
- **Entity Framework Core 9** - ORM with PostgreSQL provider
- **PostgreSQL 16** - Primary database
- **HotChocolate** - GraphQL server implementation
- **Swagger/Scalar** - API documentation
- **ImageSharp** - Image processing and transformations
- **Dapper** - High-performance micro-ORM for queries
- **JWT Bearer** - Authentication and authorization

### Frontend
- **Angular 20** - Modern web framework with standalone components
- **Tailwind CSS v4** - Utility-first CSS framework
- **TypeScript 5.9** - Type-safe development
- **TipTap** - Rich text editor
- **RxJS 7.8** - Reactive programming
- **Heroicons** - UI icon library

## Project Structure

```
dynamo_cms/
├── apps/
│   ├── backend/                    # .NET API Backend
│   │   ├── src/
│   │   │   └── Dynamo.CMS.API/    # Main API project
│   │   │       ├── Controllers/    # API endpoints
│   │   │       ├── Models/         # Data models
│   │   │       ├── Services/       # Business logic
│   │   │       ├── GraphQL/        # GraphQL schemas
│   │   │       ├── Data/           # EF Core DbContext
│   │   │       ├── Storage/        # File storage handlers
│   │   │       └── Migrations/     # Database migrations
│   │   ├── tests/                  # Unit & integration tests
│   │   ├── collections/            # Bruno API test collections
│   │   ├── Dockerfile
│   │   └── Dynamo.CMS.sln
│   └── frontend/                   # Angular Frontend
│       ├── src/
│       │   ├── app/
│       │   │   ├── components/     # UI components
│       │   │   ├── services/       # API services
│       │   │   ├── auth/           # Authentication guards
│       │   │   └── app.routes.ts   # Route definitions
│       │   ├── variables.css       # Design system tokens
│       │   └── styles.scss         # Global styles
│       ├── Dockerfile
│       └── package.json
├── docs/                           # Documentation
├── scripts/                        # Utility scripts
├── docker-compose.yml              # Docker orchestration
├── .editorconfig                   # Code style config
└── README.md
```

## Local Development Setup

### Prerequisites
- **.NET 9.0 SDK** - [Download](https://dotnet.microsoft.com/download/dotnet/9.0)
- **Node.js 20+** - [Download](https://nodejs.org/)
- **PostgreSQL 16** - [Download](https://www.postgresql.org/download/) (or use Docker)

### Backend Setup

```bash
# Navigate to backend directory
cd apps/backend

# Restore dependencies
dotnet restore

# Update database connection string in appsettings.json
# Edit: apps/backend/src/Dynamo.CMS.API/appsettings.json

# Apply database migrations
dotnet ef database update --project src/Dynamo.CMS.API

# Run the API
dotnet run --project src/Dynamo.CMS.API/Dynamo.CMS.API.csproj
```

The API will be available at `http://localhost:5000` (or as configured in `Properties/launchSettings.json`).

**API Endpoints:**
- Swagger UI: `http://localhost:5000/swagger`
- Scalar Docs: `http://localhost:5000/scalar/v1`
- GraphQL: `http://localhost:5000/graphql`
- Health: `http://localhost:5000/health`

### Frontend Setup

```bash
# Navigate to frontend directory
cd apps/frontend

# Install dependencies
npm install

# Start development server
npm start
```

The frontend will be available at `http://localhost:4200`.

### Database Configuration

Update the connection string in `apps/backend/src/Dynamo.CMS.API/appsettings.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=dynamodb;Username=your_user;Password=your_password"
  }
}
```

For Docker Compose setup, the database is automatically configured on port `15432`:
```
Host=localhost;Port=15432;Database=dynamodb;Username=dynamo;Password=dynamo
```

## Running Tests

### Backend Tests
```bash
cd apps/backend
dotnet test
```

Test projects:
- `Dynamo.Unit.Tests` - Unit tests
- `Dynamo.Integration.Tests` - Integration tests

### Frontend Tests
```bash
cd apps/frontend
npm test
```

## Configuration

### Environment Variables

**Backend:**
- `ASPNETCORE_ENVIRONMENT` - Environment (Development/Production)
- `ConnectionStrings__DefaultConnection` - Database connection string
- `Jwt__Key` - JWT signing key
- `Storage__Static__RootLocation` - File upload directory
- `Email__Provider` - Email provider (smtp/log)

**Frontend:**
- `API_URL` - Backend API base URL (configured in `environment.ts`)

### Email Configuration

Configure email settings in `appsettings.json`:

```json
{
  "Email": {
    "Provider": "smtp",
    "DefaultFrom": "noreply@yourdomain.com",
    "Smtp": {
      "Host": "smtp.example.com",
      "Port": 587,
      "EnableSsl": true,
      "Username": "your-username",
      "Password": "your-password"
    }
  }
}
```

Set `Provider` to `"log"` for development to log emails instead of sending them.

## API Collections

The project includes Bruno API collections for testing endpoints:

```bash
# Located in apps/backend/collections/
├── auth/              # Authentication endpoints
├── documents/         # Document management
├── general/           # General API operations
├── media-library/     # Media upload and management
├── orders/            # Order examples
└── products/          # Product examples
```

Import these into [Bruno](https://www.usebruno.com/) or your preferred API client.

## Design System

The frontend uses a custom design system called **"Warm Obsidian"**:

- **Typography**: Instrument Serif (headings) + Plus Jakarta Sans (body)
- **Color Palette**: Warm charcoal and cream with steel blue accents
- **Components**: Pre-built UI components with consistent styling
- **Animations**: Smooth transitions and stagger effects
- **Theme**: Dark/light mode support

Design tokens are defined in [apps/frontend/src/variables.css](apps/frontend/src/variables.css).

## Documentation

- **API Documentation**: Available via Swagger UI at `/swagger` or Scalar at `/scalar/v1`
- **GraphQL Schema**: Explore with GraphQL Playground at `/graphql` or Voyager at `/voyager`
- **Contributing**: See [CONTRIBUTING.md](CONTRIBUTING.md)

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes in the appropriate `apps/` directory
4. Run tests to ensure everything works
5. Follow the `.editorconfig` coding standards
6. Commit with clear messages
7. Push and create a pull request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## Docker Support

### Individual Services

**Backend:**
```bash
cd apps/backend
docker build -t dynamo-backend .
docker run -p 7000:80 dynamo-backend
```

**Frontend:**
```bash
cd apps/frontend
docker build -t dynamo-frontend .
docker run -p 4200:80 dynamo-frontend
```

### Full Stack
```bash
docker-compose up -d
```

This starts:
- PostgreSQL on port `15432`
- Backend API on port `7000`
- Frontend on port `4200`

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Copyright (c) 2026 Arman Ossi Loko

## Links

- **Issues**: Report bugs and request features
- **Discussions**: Community discussions and Q&A
- **Wiki**: Additional documentation and guides

