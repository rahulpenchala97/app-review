#!/bin/bash

# App Review System - Frontend Development Script

set -e

FRONTEND_DIR="frontend"

echo "🚀 App Review System - Frontend Setup"
echo "======================================"

# Check if we're in the right directory
if [ ! -d "$FRONTEND_DIR" ]; then
    echo "❌ Error: frontend/ directory not found. Please run this script from the project root."
    exit 1
fi

# Change to frontend directory
cd $FRONTEND_DIR

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo ""
echo "✅ Frontend setup complete!"
echo ""
echo "🌐 To start the development server:"
echo "   cd frontend && npm start"
echo ""
echo "🔗 Frontend will be available at: http://localhost:3000/"
echo "📚 Make sure the backend is running at: http://localhost:8000/"
