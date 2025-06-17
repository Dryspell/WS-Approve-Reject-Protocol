#!/bin/bash

# Get identity token
echo "Getting identity token..."
IDENTITY_RESPONSE=$(curl -s -X POST "http://localhost:3000/v1/identity")
IDENTITY=$(echo $IDENTITY_RESPONSE | jq -r '.identity')
TOKEN=$(echo $IDENTITY_RESPONSE | jq -r '.token')

echo "Identity: $IDENTITY"
echo "Token: $TOKEN"

# List databases for this identity
echo -e "\nListing databases..."
curl -s "http://localhost:3000/v1/identity/$IDENTITY/databases" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Function to execute SQL
execute_sql() {
    local sql=$1
    echo -e "\nExecuting SQL: $sql"
    curl -s -X POST "http://localhost:3000/v1/database/$IDENTITY/sql" \
        -H "Authorization: Bearer $TOKEN" \
        -d "$sql" | jq '.'
}

# Function to get schema
get_schema() {
    echo -e "\nGetting schema..."
    curl -s "http://localhost:3000/v1/database/$IDENTITY/schema" \
        -H "Authorization: Bearer $TOKEN" | jq '.'
}

# Function to get logs
get_logs() {
    local lines=${1:-100}
    echo -e "\nGetting last $lines log lines..."
    curl -s "http://localhost:3000/v1/database/$IDENTITY/logs?num_lines=$lines" \
        -H "Authorization: Bearer $TOKEN"
}

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "Error: jq is required but not installed. Please install jq first."
    exit 1
fi

# Menu
while true; do
    echo -e "\nSpacetimeDB Inspector Menu:"
    echo "1) Execute SQL query"
    echo "2) Show schema"
    echo "3) Show logs"
    echo "4) Exit"
    read -p "Choose an option: " choice

    case $choice in
        1)
            read -p "Enter SQL query: " sql
            execute_sql "$sql"
            ;;
        2)
            get_schema
            ;;
        3)
            read -p "How many log lines (default 100): " lines
            get_logs ${lines:-100}
            ;;
        4)
            exit 0
            ;;
        *)
            echo "Invalid option"
            ;;
    esac
done 