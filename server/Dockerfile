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
RUN bash -c 'curl -sSf https://install.spacetimedb.com | sh -s -- --root-dir /stdb --yes' && \
    ls -la /stdb && \
    which spacetime || echo "spacetime not found in PATH" && \
    echo "Checking /stdb/spacetime:" && \
    ls -la /stdb/spacetime || echo "spacetime binary not found"

# Create startup script
RUN echo '#!/bin/bash\ncd /stdb\nexec /stdb/spacetime --root-dir=/stdb start --listen-addr=0.0.0.0:3000' > /stdb/start.sh && \
    chmod +x /stdb/start.sh

# Switch back to root for final setup
USER root

# Expose the default port
EXPOSE 3000

# Switch to spacetimedb user for running the service
USER spacetimedb
WORKDIR /stdb

# Use the startup script
ENTRYPOINT ["/stdb/start.sh"] 