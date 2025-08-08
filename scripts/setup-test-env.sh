#!/bin/bash

# SpacetimeDB Test Environment Setup Script
# This script sets up everything needed to run tests

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "🚀 Setting up SpacetimeDB Test Environment..."

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to wait for SpacetimeDB to be ready
wait_for_spacetimedb() {
    echo "⏳ Waiting for SpacetimeDB to be ready..."
    for i in {1..30}; do
        if curl -s http://localhost:3000/v1/ping >/dev/null 2>&1; then
            echo -e "${GREEN}✅ SpacetimeDB is ready!${NC}"
            return 0
        fi
        echo "   Attempt $i/30..."
        sleep 2
    done
    echo -e "${RED}❌ SpacetimeDB failed to start${NC}"
    return 1
}

echo "🔍 Checking dependencies..."

# Check if Node.js and pnpm are installed
if ! command_exists node; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

if ! command_exists pnpm; then
    echo -e "${RED}❌ pnpm is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js and pnpm are installed${NC}"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
fi

echo "🔧 Building server module..."
cd server
if ! cargo build --target wasm32-unknown-unknown --release; then
    echo -e "${RED}❌ Failed to build server module${NC}"
    exit 1
fi
cd ..

echo "🐳 Starting SpacetimeDB..."

# Try Docker first
if command_exists docker && docker info >/dev/null 2>&1; then
    echo "Using Docker..."
    
    # Clean up any existing containers
    docker-compose down 2>/dev/null || true
    
    # Start SpacetimeDB with Docker
    if docker-compose up -d spacetimedb; then
        if wait_for_spacetimedb; then
            echo -e "${GREEN}✅ SpacetimeDB started with Docker${NC}"
            SPACETIMEDB_METHOD="docker"
        else
            echo -e "${YELLOW}⚠️  Docker start failed, trying local installation...${NC}"
            docker-compose down 2>/dev/null || true
        fi
    else
        echo -e "${YELLOW}⚠️  Docker compose failed, trying local installation...${NC}"
    fi
fi

# If Docker didn't work, try local installation
if [ -z "$SPACETIMEDB_METHOD" ]; then
    echo "Using local SpacetimeDB installation..."
    
    # Stop any existing SpacetimeDB processes
    pkill -f "spacetime" 2>/dev/null || true
    sleep 2
    
    # Start SpacetimeDB locally
    if ./scripts/start-spacetimedb.sh &
        SPACETIMEDB_PID=$!
        sleep 5
        
        if wait_for_spacetimedb; then
            echo -e "${GREEN}✅ SpacetimeDB started locally (PID: $SPACETIMEDB_PID)${NC}"
            SPACETIMEDB_METHOD="local"
            
            # Save PID for cleanup
            echo $SPACETIMEDB_PID > .spacetimedb.pid
        else
            echo -e "${RED}❌ Failed to start SpacetimeDB locally${NC}"
            kill $SPACETIMEDB_PID 2>/dev/null || true
            exit 1
        fi
    then
        echo "Local SpacetimeDB startup failed"
        exit 1
    fi
fi

echo "🧪 Running tests..."
if npm test; then
    echo -e "${GREEN}🎉 All tests passed! Environment is ready.${NC}"
    
    echo ""
    echo "📋 Summary:"
    echo "  SpacetimeDB: $SPACETIMEDB_METHOD"
    echo "  Endpoint: http://localhost:3000"
    echo "  Test Status: ✅ PASSING"
    echo ""
    echo "🔧 To run tests again: npm test"
    echo "🛑 To stop SpacetimeDB:"
    if [ "$SPACETIMEDB_METHOD" = "docker" ]; then
        echo "   docker-compose down"
    else
        echo "   kill \$(cat .spacetimedb.pid) && rm .spacetimedb.pid"
    fi
else
    echo -e "${RED}❌ Tests failed. Check the output above for details.${NC}"
    exit 1
fi 