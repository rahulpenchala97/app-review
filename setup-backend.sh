#!/bin/bash

# App Review System - Backend Development Script

set -e

BACKEND_DIR="backend"
VENV_DIR="venv"

echo "🚀 App Review System - Backend Setup"
echo "====================================="

# Check if we're in the right directory
if [ ! -d "$BACKEND_DIR" ]; then
    echo "❌ Error: backend/ directory not found. Please run this script from the project root."
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "$VENV_DIR" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv $VENV_DIR
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source $VENV_DIR/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install -r $BACKEND_DIR/requirements.txt

# Change to backend directory
cd $BACKEND_DIR

# Check if .env exists, if not copy from example
if [ ! -f ".env" ]; then
    echo "⚙️  Setting up environment configuration..."
    cp .env.local .env
    echo "✅ Created .env file from .env.local"
fi

# Run migrations
echo "🗄️  Running database migrations..."
python manage.py migrate

# Setup initial data
echo "📊 Setting up initial data..."
python manage.py setup_data

echo ""
echo "✅ Backend setup complete!"
echo ""
echo "🌐 To start the development server:"
echo "   cd backend && source ../venv/bin/activate && python manage.py runserver"
echo ""
echo "🧪 To test the API:"
echo "   cd backend && python test_api.py"
echo ""
echo "🔗 API will be available at: http://localhost:8000/"
echo "👨‍💼 Admin interface: http://localhost:8000/admin/ (admin/admin123)"
