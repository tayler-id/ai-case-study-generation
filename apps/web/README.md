# AI Case Study Generation Agent

A powerful Next.js application that transforms unstructured project data into comprehensive, insightful case studies using AI-powered analysis.

## 🚀 Features

### Core Functionality
- **Google Workspace Integration** - Connect to Gmail and Google Drive via OAuth 2.0
- **AI-Powered Analysis** - Automatically analyze emails, documents, and project artifacts
- **Real-time Case Study Generation** - Watch as AI writes comprehensive case studies live
- **Interactive Canvas** - Edit and refine generated content with markdown support
- **Project Scoping** - Define precise data boundaries with advanced filtering
- **Dashboard Management** - View, search, and manage all your case studies

### User Experience
- **Responsive Design** - Works seamlessly on desktop and mobile devices
- **Dark/Light Mode** - Automatic theme switching based on system preferences
- **Real-time Collaboration** - Live updates and collaborative editing
- **Export Capabilities** - Download case studies as markdown files
- **Rating System** - Evaluate and improve AI-generated content

## 🛠 Technology Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Modern component library
- **Radix UI** - Accessible primitive components
- **Framer Motion** - Smooth animations and transitions
- **React Markdown** - Markdown rendering with GitHub Flavored Markdown

### Backend (Planned)
- **FastAPI** - High-performance Python web framework
- **LangGraph** - AI agent orchestration
- **PostgreSQL** - Primary database with pgvector extension
- **Google APIs** - Gmail and Drive integration
- **OpenAI/Anthropic** - Large language model integration

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or pnpm
- Google Cloud Platform account (for OAuth)

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd case-studies
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env.local
   ```
   
   Configure the following variables:
   ```env
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_nextauth_secret
   ```

4. **Start the development server**
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🏗 Architecture

### Frontend Architecture
```
app/
├── globals.css          # Global styles and CSS variables
├── layout.tsx          # Root layout with providers
└── page.tsx            # Main application entry point

components/
├── ui/                 # Reusable UI components (shadcn/ui)
├── Authentication.tsx  # Google OAuth login flow
├── Sidebar.tsx        # Navigation and user management
├── Dashboard.tsx      # Case study management interface
├── ProjectScopingModal.tsx  # Data filtering interface
├── ChatPanel.tsx      # AI interaction interface
├── Canvas.tsx         # Markdown editor and viewer
└── MainContent.tsx    # Split-screen layout manager
```

### State Management
- **React useState/useEffect** - Local component state
- **localStorage** - Client-side persistence
- **Context API** - Global state management (planned)

### Data Flow
1. **Authentication** - Google OAuth 2.0 flow
2. **Project Scoping** - User defines data boundaries
3. **Data Ingestion** - Connect to Gmail/Drive APIs
4. **AI Analysis** - Process and analyze project data
5. **Case Study Generation** - Real-time markdown streaming
6. **User Interaction** - Edit, rate, and save studies

## 🎨 Design System

### Color Palette
- **Primary**: Blue (#3B82F6) - Actions and highlights
- **Secondary**: Slate (#64748B) - Supporting elements
- **Background**: White/Dark - Adaptive theming
- **Accent**: Green (#10B981) - Success states
- **Warning**: Yellow (#F59E0B) - Caution states
- **Error**: Red (#EF4444) - Error states

### Typography
- **Headings**: Inter font family, various weights
- **Body**: Inter font family, regular weight
- **Code**: JetBrains Mono, monospace

### Components
All components follow the shadcn/ui design system with:
- Consistent spacing (4px grid)
- Rounded corners (0.5rem default)
- Subtle shadows and borders
- Smooth transitions (200ms)

## 🔧 Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Code Style
- **ESLint** - Code linting with Next.js config
- **TypeScript** - Strict type checking
- **Prettier** - Code formatting (recommended)

### Component Structure
```typescript
// Example component structure
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

interface ComponentProps {
  // Props interface
}

export function Component({ prop }: ComponentProps) {
  // Component logic
  return (
    // JSX
  )
}
```

## 🚦 Current Status

### ✅ Completed Features
- [x] Authentication system with Google OAuth simulation
- [x] Responsive dashboard with case study management
- [x] Project scoping modal with advanced filtering
- [x] Real-time chat interface with agent status
- [x] Markdown canvas with editing capabilities
- [x] Case study generation with realistic content
- [x] Rating and feedback system
- [x] Export functionality
- [x] Local storage persistence

### 🚧 In Progress
- [ ] Google OAuth integration (real implementation)
- [ ] Backend API development
- [ ] AI agent integration
- [ ] Real-time data streaming
- [ ] Advanced markdown features

### 📋 Planned Features
- [ ] Team collaboration features
- [ ] Advanced analytics dashboard
- [ ] Template system for case studies
- [ ] Integration with project management tools
- [ ] Mobile app development
- [ ] Enterprise SSO support

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Guidelines
- Follow TypeScript best practices
- Use semantic commit messages
- Add tests for new features
- Update documentation as needed
- Ensure accessibility compliance (WCAG 2.1 AA)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **shadcn/ui** - For the excellent component library
- **Radix UI** - For accessible primitive components
- **Tailwind CSS** - For the utility-first CSS framework
- **Next.js Team** - For the amazing React framework
- **Vercel** - For hosting and deployment platform

## 📞 Support

For support, email support@casestudyai.com or join our Slack channel.

---

**Built with ❤️ by the Case Study AI Team**