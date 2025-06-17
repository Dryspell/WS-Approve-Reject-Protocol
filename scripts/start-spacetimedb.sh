#!/bin/bash

# Get the absolute path to the project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STDB_ROOT="${PROJECT_ROOT}/stdb"

# Create SpacetimeDB root directory if it doesn't exist
mkdir -p "${STDB_ROOT}"

# Check if SpacetimeDB is installed in the correct location
if [ ! -f "${STDB_ROOT}/spacetime" ]; then
    echo "Installing SpacetimeDB..."
    curl -sSf https://install.spacetimedb.com | sh -s -- --root-dir "${STDB_ROOT}" --yes
fi

# Start SpacetimeDB with proper root directory
cd "${STDB_ROOT}"
exec "${STDB_ROOT}/spacetime" --root-dir="${STDB_ROOT}" start --listen-addr='127.0.0.1:3000' 