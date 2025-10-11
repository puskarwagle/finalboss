#!/bin/bash
# Load environment variables and start dev server

# Load .env file
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | grep -v '^\s*$' | xargs)
  echo "✅ Environment variables loaded from .env"
  echo "📍 GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID:0:20}..."
  echo "📍 API_BASE_URL: $API_BASE_URL"
else
  echo "❌ .env file not found!"
  exit 1
fi

# Start vite dev server
echo ""
echo "🚀 Starting Vite dev server on port 1420..."
~/.bun/bin/bun --bun vite dev

