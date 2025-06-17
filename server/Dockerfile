FROM ubuntu:24.04

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create the SpacetimeDB directory and user
RUN mkdir -p /stdb && \
    useradd --system spacetimedb && \
    chown -R spacetimedb:spacetimedb /stdb

# Install SpacetimeDB as the spacetimedb user
USER spacetimedb
RUN bash -c 'curl -sSf https://install.spacetimedb.com | sh -s -- --root-dir /stdb --yes'

# Create startup script
RUN echo '#!/bin/bash\ncd /stdb\nexec /stdb/bin/1.1.2/spacetimedb-standalone start --data-dir=/stdb/data --listen-addr=0.0.0.0:3000' > /stdb/start.sh && \
    chmod +x /stdb/start.sh

# Set the entrypoint
ENTRYPOINT ["/stdb/start.sh"] 