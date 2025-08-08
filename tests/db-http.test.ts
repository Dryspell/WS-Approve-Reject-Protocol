import { describe, it, beforeAll, afterAll, expect, vi } from 'vitest';
import { execSync } from 'child_process';
import axios from 'axios';
import { join } from 'path';

// Determine if Docker is available and the daemon is running
const isDockerAvailable = () => {
  try {
    execSync('docker info', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

const suite = isDockerAvailable() ? describe : describe.skip;

suite('SpacetimeDB HTTP API Tests', () => {
  let identity: string;
  let token: string;
  let containerName: string;

  const BASE_URL = 'http://localhost:3000';
  const DB_NAME = 'testdb';

  // Helper function to wait for server to be ready
  const waitForServer = async (maxAttempts = 30) => {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        await axios.get(`${BASE_URL}/v1/ping`);
        return;
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    throw new Error('Server failed to start');
  };

  // Helper function to get container name
  const getContainerName = () => {
    const output = execSync('docker ps --format "{{.Names}}" | grep spacetimedb', { encoding: 'utf-8' });
    return output.trim();
  };

  beforeAll(async () => {
    // Build the WebAssembly module
    console.log('Building WebAssembly module...');
    execSync('cd server && cargo build --target wasm32-unknown-unknown --release', { stdio: 'inherit' });

    // Start SpacetimeDB using docker-compose
    console.log('Starting SpacetimeDB container...');
    execSync('docker-compose up -d --build spacetimedb', { stdio: 'inherit' });

    // Wait for server to be ready and get container name
    await waitForServer();
    containerName = getContainerName();
    console.log('Container name:', containerName);

    // Get identity token
    console.log('Getting identity token...');
    const identityResponse = await axios.post(`${BASE_URL}/v1/identity`);
    identity = identityResponse.data.identity;
    token = identityResponse.data.token;

    // Use spacetime CLI to publish the module
    console.log('Publishing database module...');
    try {
      const wasmPath = join(process.cwd(), 'server/target/wasm32-unknown-unknown/release/game_server.wasm');
      // Copy WASM file into container and publish
      console.log('Copying WASM file to container...');
      execSync(`docker cp "${wasmPath}" ${containerName}:/tmp/game_server.wasm`, { stdio: 'inherit' });
      console.log('Publishing module in container...');
      execSync(`docker exec ${containerName} /stdb/spacetime publish ${DB_NAME} --bin-path /tmp/game_server.wasm`, {
        stdio: 'inherit',
        env: {
          ...process.env,
          SPACETIME_TOKEN: token,
          SPACETIME_HOST: 'localhost:3000'
        }
      });
      console.log('Database module published successfully');
    } catch (error: any) {
      console.error('Failed to publish database:', error);
      // Print container logs for debugging
      try {
        console.error('Container logs:');
        execSync(`docker logs ${containerName}`, { stdio: 'inherit' });
      } catch (logError) {
        console.error('Failed to get container logs:', logError);
      }
      throw error;
    }
  }, 60000); // 60 second timeout for setup

  it('should verify server is running', async () => {
    const response = await axios.get(`${BASE_URL}/v1/ping`);
    expect(response.status).toBe(200);
  });

  it('should have valid identity and token', () => {
    expect(identity).toBeDefined();
    expect(token).toBeDefined();
  });

  it('should list databases for identity', async () => {
    const response = await axios.get(
      `${BASE_URL}/v1/identity/${identity}/databases`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('addresses');
    expect(Array.isArray(response.data.addresses)).toBe(true);
  });

  it('should get database schema', async () => {
    const response = await axios.get(
      `${BASE_URL}/v1/database/${DB_NAME}/schema`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('tables');
  });

  it('should execute SQL query', async () => {
    const response = await axios.post(
      `${BASE_URL}/v1/database/${DB_NAME}/sql`,
      "SELECT name FROM sqlite_master WHERE type='table';",
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'text/plain',
        },
      }
    );
    expect(response.status).toBe(200);
    expect(Array.isArray(response.data)).toBe(true);
  });

  it('should get database logs', async () => {
    const response = await axios.get(
      `${BASE_URL}/v1/database/${DB_NAME}/logs?num_lines=10`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );
    expect(response.status).toBe(200);
    expect(typeof response.data).toBe('string');
  });

  afterAll(() => {
    // Stop and remove the container
    execSync('docker-compose down', { stdio: 'inherit' });
  });
}); 