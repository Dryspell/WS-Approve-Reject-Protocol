import { createSpacetimeDBClient } from "../src/lib/spacetimedb";
import type { Unit, GameEvent } from "../src/module_bindings";

// Test data constants
const TEST_ROOM = {
  id: "test-room-1",
  name: "Test Room",
  created_at: new Date().toISOString(),
};

const TEST_UNITS = [
  {
    id: 1,
    room_id: TEST_ROOM.id,
    owner_id: "test-player-1",
    position: { x: 100, y: 100 },
    vote_color: "red",
    vote_price: null,
    vote_owner: "test-player-1",
    is_storage: false,
  },
  {
    id: 2,
    room_id: TEST_ROOM.id,
    owner_id: "test-player-2",
    position: { x: 200, y: 200 },
    vote_color: "blue",
    vote_price: 100,
    vote_owner: "test-player-2",
    is_storage: true,
  },
  {
    id: 3,
    room_id: TEST_ROOM.id,
    owner_id: "test-player-3",
    position: { x: 300, y: 300 },
    vote_color: null,
    vote_price: 200,
    vote_owner: "test-player-3",
    is_storage: false,
  }
];

const TEST_RESOURCES = [
  {
    id: 1,
    room_id: TEST_ROOM.id,
    type: "wood",
    position: { x: 150, y: 150 },
    amount: 100,
    max_amount: 100,
    regeneration_rate: 1,
    last_regeneration: new Date().toISOString(),
    collection_rate: 5, // Amount collected per action
    collection_cooldown: 60, // Seconds between collections
  },
  {
    id: 2,
    room_id: TEST_ROOM.id,
    type: "stone",
    position: { x: 250, y: 250 },
    amount: 50,
    max_amount: 50,
    regeneration_rate: 0.5,
    last_regeneration: new Date().toISOString(),
    collection_rate: 3,
    collection_cooldown: 90,
  },
  {
    id: 3,
    room_id: TEST_ROOM.id,
    type: "food",
    position: { x: 350, y: 350 },
    amount: 200,
    max_amount: 200,
    regeneration_rate: 2,
    last_regeneration: new Date().toISOString(),
    collection_rate: 10,
    collection_cooldown: 30,
  }
];

const TEST_UNIT_INVENTORIES = [
  {
    unit_id: 1,
    resource_type: "wood",
    amount: 10,
  },
  {
    unit_id: 2,
    resource_type: "stone",
    amount: 5,
  },
  {
    unit_id: 3,
    resource_type: "food",
    amount: 20,
  }
];

const TEST_CONSUMPTION_RATES = [
  {
    unit_id: 1,
    resource_type: "food",
    rate: 1, // Units consumed per minute
    last_consumption: new Date().toISOString(),
  },
  {
    unit_id: 2,
    resource_type: "food",
    rate: 2,
    last_consumption: new Date().toISOString(),
  }
];

const TEST_EVENTS = [
  {
    id: 1,
    room_id: TEST_ROOM.id,
    event_type: "vote_trade",
    source_id: "test-player-1",
    target_id: "test-player-2",
    value: 100,
    created_at: new Date().toISOString(),
  }
];

export async function setupTestDatabase() {
  const spacetime = createSpacetimeDBClient({
    host: "localhost:3000",
    database: "test"
  });
  
  // Create test room
  await spacetime.call("create_room", [
    TEST_ROOM.id,
    TEST_ROOM.name,
  ]);

  // Create test units
  for (const unit of TEST_UNITS) {
    await spacetime.call("create_unit", [
      unit.id,
      unit.room_id,
      unit.owner_id,
      unit.position.x,
      unit.position.y,
      unit.is_storage,
    ]);

    if (unit.vote_color) {
      await spacetime.call("set_unit_vote_color", [
        unit.id,
        unit.vote_color,
      ]);
    }

    if (unit.vote_price !== null) {
      await spacetime.call("set_unit_vote_price", [
        unit.id,
        unit.vote_price,
      ]);
    }
  }

  // Create test resources
  for (const resource of TEST_RESOURCES) {
    await spacetime.call("create_resource", [
      resource.id,
      resource.room_id,
      resource.type,
      resource.position.x,
      resource.position.y,
      resource.amount,
      resource.max_amount,
      resource.regeneration_rate,
      resource.collection_rate,
      resource.collection_cooldown,
    ]);
  }

  // Create test unit inventories
  for (const inventory of TEST_UNIT_INVENTORIES) {
    await spacetime.call("set_unit_inventory", [
      inventory.unit_id,
      inventory.resource_type,
      inventory.amount,
    ]);
  }

  // Set up consumption rates
  for (const consumption of TEST_CONSUMPTION_RATES) {
    await spacetime.call("set_unit_consumption_rate", [
      consumption.unit_id,
      consumption.resource_type,
      consumption.rate,
    ]);
  }

  // Create test events
  for (const event of TEST_EVENTS) {
    await spacetime.call("create_game_event", [
      event.room_id,
      event.event_type,
      event.source_id,
      event.target_id,
      event.value,
    ]);
  }
}

export async function cleanupTestDatabase() {
  const spacetime = createSpacetimeDBClient({
    host: "localhost:3000",
    database: "test"
  });
  
  // Delete test unit inventories
  for (const inventory of TEST_UNIT_INVENTORIES) {
    await spacetime.call("clear_unit_inventory", [inventory.unit_id]);
  }

  // Delete test resources
  for (const resource of TEST_RESOURCES) {
    await spacetime.call("delete_resource", [resource.id]);
  }

  // Delete test units
  for (const unit of TEST_UNITS) {
    await spacetime.call("delete_unit", [unit.id]);
  }

  // Delete test room
  await spacetime.call("delete_room", [TEST_ROOM.id]);
}

// Export test data for use in tests
export const testData = {
  room: TEST_ROOM,
  units: TEST_UNITS,
  resources: TEST_RESOURCES,
  unitInventories: TEST_UNIT_INVENTORIES,
  consumptionRates: TEST_CONSUMPTION_RATES,
  events: TEST_EVENTS,
}; 