/**
 * Reset Test Database Script
 * 
 * This script connects to SpacetimeDB and calls the reset_test_data reducer
 * to clear game rooms, ready states, and other test data.
 * 
 * Usage: npx tsx scripts/reset-test-db.ts
 */

import { DbConnection } from '../client/src/module_bindings';

const SPACETIMEDB_URL = process.env.SPACETIMEDB_URL || 'ws://127.0.0.1:3000';
const DATABASE_NAME = process.env.SPACETIMEDB_DB || 'game';

async function resetTestData(): Promise<void> {
  console.log('🧹 Connecting to SpacetimeDB to reset test data...');
  console.log(`   URL: ${SPACETIMEDB_URL}`);
  console.log(`   Database: ${DATABASE_NAME}`);
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Connection timeout after 10 seconds'));
    }, 10000);
    
    DbConnection.builder()
      .withUri(SPACETIMEDB_URL)
      .withModuleName(DATABASE_NAME)
      .onConnect((conn, identity, token) => {
        console.log('✅ Connected to SpacetimeDB');
        console.log(`   Identity: ${identity.toHexString().slice(0, 16)}...`);
        
        // Call the reset reducer
        console.log('🗑️  Calling reset_test_data reducer...');
        
        conn.reducers.resetTestData('RESET_TEST_DATA');
        
        // Wait a moment for the reducer to complete
        setTimeout(() => {
          clearTimeout(timeout);
          console.log('✅ Test data reset complete!');
          conn.disconnect();
          resolve();
        }, 2000);
      })
      .onConnectError((ctx, err) => {
        clearTimeout(timeout);
        console.error('❌ Connection error:', err);
        reject(new Error(`Failed to connect: ${err}`));
      })
      .build();
  });
}

// Run the reset
resetTestData()
  .then(() => {
    console.log('');
    console.log('🎭 Ready for E2E tests!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('');
    console.error('❌ Failed to reset test data:', err.message);
    console.error('   Make sure SpacetimeDB is running (spacetime start)');
    process.exit(1);
  });
