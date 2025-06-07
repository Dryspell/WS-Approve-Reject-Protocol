#!/bin/bash

# Configuration
BACKUP_DIR="./backups"
RETENTION_DAYS=7
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/spacetimedb_$TIMESTAMP.tar.gz"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Create backup from Docker volume
docker run --rm \
    -v spacetimedb_data:/stdb \
    -v "$(pwd)/$BACKUP_DIR:/backup" \
    ubuntu:24.04 \
    tar -czf "/backup/spacetimedb_$TIMESTAMP.tar.gz" -C /stdb .

# Remove old backups
find "$BACKUP_DIR" -name "spacetimedb_*.tar.gz" -mtime +$RETENTION_DAYS -delete

# Log backup completion
echo "Backup completed: $BACKUP_FILE" >> "$BACKUP_DIR/backup.log" 