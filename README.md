# Dynamo CMS - Monorepo

This is a monorepo containing both the backend and frontend applications for Dynamo CMS.

## Structure

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
├── .editorconfig        # Shared editor configuration
├── .gitignore           # Shared git ignore rules
└── README.md            # This file
```

## Applications

### Backend (`apps/backend/`)

The backend is a .NET Core API application. See `apps/backend/ROADMAP.md` for more details.

**Getting Started:**
```bash
cd apps/backend
dotnet restore
dotnet build
dotnet run --project src/Dynamo.CMS.API/Dynamo.CMS.API.csproj
```

### Frontend (`apps/frontend/`)

The frontend is an Angular application. See `apps/frontend/README.md` for more details.

**Getting Started:**
```bash
cd apps/frontend
npm install
npm start
```

## Development

Each application can be developed independently. The shared configuration files (`.editorconfig`, `.gitignore`) at the root apply to the entire monorepo.

## Git History

Both the backend and frontend repositories' git histories have been preserved in this monorepo using git subtree.
