# AI Case Study Generation Agent

A full-stack monorepo application that automates the creation of insightful case studies from unstructured project data using AI.

## Architecture

This project follows a monorepo architecture with the following structure:

```
/
├── apps/
│   ├── web/          # Next.js frontend application
│   └── api/          # FastAPI backend application
├── packages/
│   └── shared/       # Shared TypeScript types and utilities
└── docs/            # Project documentation, stories, and architecture
```

## Technology Stack

### Frontend (`apps/web`)
- **Next.js 15.x** - React framework with App Router
- **TypeScript 5.x** - Type safety and better DX
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui & Radix** - Accessible UI components
- **Framer Motion** - Smooth animations
- **React Markdown** - Markdown rendering with syntax highlighting

### Backend (`apps/api`)
- **Python 3.12** - Programming language
- **FastAPI 0.111** - Modern async web framework
- **SQLModel** - SQL database ORM with Pydantic integration
- **PostgreSQL + pgvector** - Database with vector search capabilities
- **Google APIs** - Gmail and Drive integration
- **LangGraph** - AI agent orchestration

### Development Tools
- **pnpm workspaces** - Monorepo package management
- **Concurrently** - Run multiple services simultaneously
- **TypeScript** - Shared type definitions across frontend/backend

## Getting Started

### Prerequisites
- Node.js 18+ 
- pnpm 8+
- Python 3.12+
- PostgreSQL with pgvector extension

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd ai-case-study-generation
   pnpm install
   ```

2. **Setup Python backend:**
   ```bash
   cd apps/api
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Configure environment variables:**
   ```bash
   # Copy environment templates
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env
   
   # Edit .env files with your configuration
   ```

### Development

**Start both frontend and backend concurrently:**
```bash
pnpm run dev
```

This will start:
- Frontend at `http://localhost:3000`
- Backend API at `http://localhost:8000`

**Individual commands:**
```bash
# Frontend only
pnpm run dev:web

# Backend only  
pnpm run dev:api

# Build shared types
pnpm run build:shared

# Build everything
pnpm run build
```

## Project Features

### Core Functionality
- **Google OAuth Integration** - Secure authentication with Google Workspace
- **Data Ingestion** - Automated fetching from Gmail and Google Drive APIs
- **AI Case Study Generation** - LLM-powered analysis and narrative synthesis
- **Real-time Streaming** - Progressive case study generation with live updates
- **Project Scoping** - Flexible filtering by date, participants, keywords, folders

### User Interface
- **Split-screen Layout** - Chat interface alongside live markdown canvas
- **Responsive Design** - Works across desktop and mobile devices
- **Accessibility** - WCAG 2.1 AA compliant components
- **Dark/Light Theme** - Automatic theme switching
- **Markdown Editor** - Rich text editing with live preview

## API Documentation

When running the backend, API documentation is available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Story Development

This project uses a story-driven development approach. Stories are located in `docs/stories/` and follow the format:
- `{epic}.{story}.{title}.md`

Current development status and stories can be found in the `docs/` directory.

## Contributing

1. Follow the established monorepo structure
2. Use shared types from `packages/shared` 
3. Maintain consistency between frontend and backend APIs
4. Add tests for new functionality
5. Update documentation as needed

## License

[Add your license information here]