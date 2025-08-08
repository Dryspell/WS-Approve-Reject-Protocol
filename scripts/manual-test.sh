#!/bin/bash

# Manual Game Testing Script
# Tests core game functionality step by step

set -e

echo "🎮 SpacetimeDB Game Manual Testing Script"
echo "=========================================="

# Check if SpacetimeDB is running
if ! curl -s http://localhost:3000/v1/ping >/dev/null; then
    echo "❌ SpacetimeDB is not running. Please start it first:"
    echo "   Docker: docker-compose up -d spacetimedb"
    echo "   Local:  ./scripts/start-spacetimedb.sh"
    exit 1
fi

echo "✅ SpacetimeDB is running"

# Test basic HTTP API
echo ""
echo "🔍 Testing HTTP API..."
echo "GET /v1/ping"
curl -s http://localhost:3000/v1/ping
echo ""

# Test database endpoint
echo "GET /v1/database"
curl -s http://localhost:3000/v1/database | jq . 2>/dev/null || echo "Raw response"
echo ""

echo ""
echo "🎯 Game Testing Checklist:"
echo "=========================="
echo ""
echo "1. 🏠 Room Management:"
echo "   [ ] Create a game room"
echo "   [ ] Join the room"
echo "   [ ] Start the game"
echo ""
echo "2. 👤 Unit Management:"
echo "   [ ] Spawn units on the map"
echo "   [ ] Select units (click/drag)"
echo "   [ ] Move units (right-click)"
echo "   [ ] Check unit stats and inventory"
echo ""
echo "3. 🗳️  Voting System:"
echo "   [ ] Set unit vote colors"
echo "   [ ] Set vote prices"
echo "   [ ] Trade votes between players"
echo "   [ ] Process round votes"
echo ""
echo "4. 🏗️  Resource System:"
echo "   [ ] Gather resources from nodes"
echo "   [ ] Transfer resources between units"
echo "   [ ] Build storage buildings"
echo "   [ ] Check resource depletion/regeneration"
echo ""
echo "5. 🔨 Crafting System:"
echo "   [ ] Queue crafting tasks"
echo "   [ ] Check crafting progress"
echo "   [ ] Complete crafting recipes"
echo "   [ ] Upgrade units"
echo ""
echo "6. 💬 Chat System:"
echo "   [ ] Send chat messages"
echo "   [ ] Create chat rooms"
echo "   [ ] Check message history"
echo ""
echo "📊 To test programmatically:"
echo "   npm test                    # Run all automated tests"
echo "   npm run dev                 # Start development server"
echo "   open http://localhost:3000  # Open game in browser"
echo ""
echo "🐛 If tests fail:"
echo "   docker-compose logs spacetimedb  # Check SpacetimeDB logs"
echo "   ./scripts/health-check.sh        # Run health check" 