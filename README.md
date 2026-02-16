# Dynamo CMS

A modern, headless Content Management System built with .NET Core and Angular.

## Overview

Dynamo CMS is a flexible, API-first content management system that allows you to create dynamic content collections with custom schemas. It provides a RESTful API for managing content, user authentication, media library, and more.

## Repository Structure

This is a monorepo containing both the backend API and frontend application:

```
.
├── apps/
│   ├── backend/          # .NET Core API backend
│   │   ├── src/          # Source code
│   │   ├── tests/        # Test projects
│   │   ├── collections/  # Bruno API collections
│   │   ├── scripts/      # Utility scripts
│   │   └── Dynamo.CMS.sln
│   └── frontend/         # Angular frontend application
│       ├── src/          # Source code
│       └── package.json
├── .editorconfig         # Shared editor configuration
├── .gitignore            # Shared git ignore rules
├── README.md             # This file
└── ROADMAP.md            # Project roadmap and future features
```

## Quick Start

### Prerequisites

- **Backend**: .NET 8.0 SDK, PostgreSQL
- **Frontend**: Node.js 18+, npm

### Backend Setup

```bash
cd apps/backend
dotnet restore
dotnet build
dotnet run --project src/Dynamo.CMS.API/Dynamo.CMS.API.csproj
```

The API will be available at `http://localhost:5000` (or the port configured in `launchSettings.json`).

### Frontend Setup

```bash
cd apps/frontend
npm install
npm start
```

The frontend will be available at `http://localhost:4200`.

### Database Setup

Make sure PostgreSQL is running and update the connection string in `apps/backend/src/Dynamo.CMS.API/appsettings.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=dynamodb;Username=your_user;Password=your_password"
  }
}
```

Then run migrations:

```bash
cd apps/backend
dotnet ef database update --project src/Dynamo.CMS.API
```

## Features

- **Dynamic Collections**: Create custom content types with flexible schemas
- **RESTful API**: Full CRUD operations for all collections
- **Authentication & Authorization**: JWT-based authentication with role-based access control
- **Media Library**: Upload and manage files with metadata
- **Dynamic Swagger Documentation**: Auto-generated OpenAPI docs for each collection
- **User Management**: Complete user and role management system

## Documentation

- [Roadmap](ROADMAP.md) - Planned features and enhancements
- [Backend Documentation](apps/backend/ROADMAP.md) - Backend-specific details (if any)
- [Frontend Documentation](apps/frontend/README.md) - Frontend-specific setup

## Development

Each application can be developed independently. Shared configuration files (`.editorconfig`, `.gitignore`) at the root apply to the entire monorepo.

### Running Tests

**Backend Tests:**
```bash
cd apps/backend
dotnet test
```

**Frontend Tests:**
```bash
cd apps/frontend
npm test
```

## API Collections

The `apps/backend/collections/` directory contains Bruno API collections for testing and development. Import these into Bruno or your preferred API client to interact with the API.

## Contributing

This is a monorepo with both backend and frontend codebases. When contributing:

1. Make changes in the appropriate `apps/` subdirectory
2. Ensure tests pass for the affected application
3. Follow the coding standards defined in `.editorconfig`

## Git History

Both the backend and frontend repositories' git histories have been preserved in this monorepo using git subtree. You can trace the full history of both codebases.

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
