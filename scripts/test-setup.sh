#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "Testing SpacetimeDB setup..."

# Test 1: Check if Docker is running
echo -n "Checking Docker... "
if docker info > /dev/null 2>&1; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}Failed${NC}"
    echo -e "${YELLOW}Docker is not running. Please:${NC}"
    echo "1. Open Docker Desktop"
    echo "2. Wait for Docker to start (look for the whale icon in your system tray)"
    echo "3. Run this script again"
    exit 1
fi

# Test 2: Check if docker-compose is available
echo -n "Checking docker-compose... "
if docker-compose version > /dev/null 2>&1; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}Failed${NC}"
    echo -e "${YELLOW}docker-compose is not installed. Please:${NC}"
    echo "1. Make sure Docker Desktop is installed"
    echo "2. Docker Compose should be included with Docker Desktop"
    echo "3. Try restarting Docker Desktop"
    exit 1
fi

# Test 3: Clean up any existing containers
echo -n "Cleaning up existing containers... "
docker-compose down -v > /dev/null 2>&1
echo -e "${GREEN}OK${NC}"

# Test 4: Start SpacetimeDB
echo -n "Starting SpacetimeDB... "
if docker-compose up -d spacetimedb; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}Failed${NC}"
    echo -e "${YELLOW}Failed to start SpacetimeDB. Please:${NC}"
    echo "1. Check if Docker Desktop is running"
    echo "2. Check the logs with: docker-compose logs spacetimedb"
    echo "3. Try running: docker-compose down && docker-compose up -d spacetimedb"
    exit 1
fi

# Test 5: Wait for SpacetimeDB to be ready
echo -n "Waiting for SpacetimeDB to be ready... "
for i in {1..30}; do
    if curl -s http://localhost:3000/health > /dev/null; then
        echo -e "${GREEN}OK${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}Failed${NC}"
        echo -e "${YELLOW}SpacetimeDB is not responding. Please:${NC}"
        echo "1. Check if the container is running: docker ps"
        echo "2. Check the logs: docker-compose logs spacetimedb"
        echo "3. Try restarting: docker-compose restart spacetimedb"
        exit 1
    fi
    sleep 1
done

# Test 6: Check backup script
echo -n "Testing backup script... "
if ./scripts/backup-spacetimedb.sh; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}Failed${NC}"
    echo -e "${YELLOW}Backup script failed. Please:${NC}"
    echo "1. Check script permissions"
    echo "2. Make sure you have write access to the backup directory"
    exit 1
fi

# Test 7: Check health check script
echo -n "Testing health check script... "
if ./scripts/health-check.sh; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}Failed${NC}"
    echo -e "${YELLOW}Health check script failed. Please:${NC}"
    echo "1. Check script permissions"
    echo "2. Make sure the health endpoint is accessible"
    exit 1
fi

echo -e "\n${GREEN}All tests passed!${NC}"
echo "SpacetimeDB is running and ready for development."
echo "You can now run 'pnpm run dev' to start the development server." 