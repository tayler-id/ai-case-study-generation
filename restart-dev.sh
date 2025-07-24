#!/bin/bash

# Development Server Restart Script
# Kills processes on ports 3000 and 8001, then restarts both frontend and backend

echo "🔄 Restarting development servers..."

# Kill processes on port 3000 (frontend)
echo "📦 Killing processes on port 3000 (frontend)..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || echo "   No process found on port 3000"

# Kill processes on port 8001 (backend)
echo "🔧 Killing processes on port 8001 (backend)..."
lsof -ti:8001 | xargs kill -9 2>/dev/null || echo "   No process found on port 8001"

# Wait a moment for ports to be released
sleep 2

echo "🚀 Starting backend server..."
cd apps/api
python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload > backend.log 2>&1 &
BACKEND_PID=$!

echo "   Backend started with PID: $BACKEND_PID"

# Wait for backend to start
sleep 3

echo "🌐 Starting frontend server..."
cd ../web
npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!

echo "   Frontend started with PID: $FRONTEND_PID"

echo ""
echo "✅ Development servers started successfully!"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8001"
echo ""
echo "📝 Logs:"
echo "   Backend: apps/api/backend.log"
echo "   Frontend: apps/web/frontend.log"
echo ""
echo "🛑 To stop servers:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo "   or use: ./stop-dev.sh"