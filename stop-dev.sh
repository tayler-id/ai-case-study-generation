#!/bin/bash

# Development Server Stop Script
# Kills processes on ports 3000 and 8001

echo "🛑 Stopping development servers..."

# Kill processes on port 3000 (frontend)
echo "📦 Stopping frontend (port 3000)..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || echo "   No process found on port 3000"

# Kill processes on port 8001 (backend)
echo "🔧 Stopping backend (port 8001)..."
lsof -ti:8001 | xargs kill -9 2>/dev/null || echo "   No process found on port 8001"

echo "✅ Development servers stopped successfully!"