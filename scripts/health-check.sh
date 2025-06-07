#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
HEALTH_CHECK_URL="http://localhost:3000/health"
MAX_RETRIES=3
RETRY_INTERVAL=5
ALERT_EMAIL="admin@localhost"

# Function to send alert
send_alert() {
    echo "SpacetimeDB health check failed: $1" | mail -s "SpacetimeDB Alert" $ALERT_EMAIL
}

# Check if container is running
if ! docker ps | grep -q spacetimedb; then
    echo -e "${RED}SpacetimeDB container is not running${NC}"
    exit 1
fi

# Check health endpoint
if curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${GREEN}SpacetimeDB is healthy${NC}"
    exit 0
else
    echo -e "${RED}SpacetimeDB health check failed${NC}"
    echo "Container logs:"
    docker-compose logs spacetimedb
    exit 1
fi

# Check database health
for i in $(seq 1 $MAX_RETRIES); do
    if curl -s -f "$HEALTH_CHECK_URL" > /dev/null; then
        echo "Health check passed"
        exit 0
    fi
    
    if [ $i -lt $MAX_RETRIES ]; then
        echo "Health check failed, retrying in $RETRY_INTERVAL seconds..."
        sleep $RETRY_INTERVAL
    fi
done

# If we get here, all retries failed
send_alert "Health check failed after $MAX_RETRIES retries"
systemctl restart spacetimedb
exit 1 