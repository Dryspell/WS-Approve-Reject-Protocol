/// <reference types="vitest" />
import { describe, it, beforeAll, afterAll, expect } from "vitest";
import { setupTestDatabase, cleanupTestDatabase, testData } from "./setup";
import { createSpacetimeDBClient } from "../src/lib/spacetimedb";

describe("Unit Tests", () => {
  let spacetime: ReturnType<typeof createSpacetimeDBClient>;

  beforeAll(async () => {
    spacetime = createSpacetimeDBClient({
      host: "localhost:3000",
      database: "test"
    });
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe("Room Management", () => {
    it("should create test room", async () => {
      const room = await spacetime.query("SELECT * FROM Room WHERE id = ?", [testData.room.id]);
      expect(room).toBeDefined();
      expect(room[0].name).toBe(testData.room.name);
    });

    it("should not allow duplicate room IDs", async () => {
      await expect(spacetime.call("create_room", [
        testData.room.id,
        "Duplicate Room",
      ])).rejects.toThrow();
    });
  });

  describe("Unit Management", () => {
    it("should create test units", async () => {
      const units = await spacetime.query("SELECT * FROM Unit WHERE room_id = ?", [testData.room.id]);
      expect(units).toHaveLength(testData.units.length);
      
      for (const testUnit of testData.units) {
        const unit = units.find((u: any) => u.id === testUnit.id);
        expect(unit).toBeDefined();
        expect(unit.owner_id).toBe(testUnit.owner_id);
        expect(unit.vote_color).toBe(testUnit.vote_color);
      }
    });

    it("should update unit vote color", async () => {
      const unitId = testData.units[0].id;
      const newColor = "blue";
      
      await spacetime.call("set_unit_vote_color", [unitId, newColor]);
      
      const unit = await spacetime.query("SELECT * FROM Unit WHERE id = ?", [unitId]);
      expect(unit[0].vote_color).toBe(newColor);
    });

    it("should not allow invalid vote colors", async () => {
      const unitId = testData.units[0].id;
      await expect(spacetime.call("set_unit_vote_color", [unitId, "invalid"])).rejects.toThrow();
    });

    it("should trade unit vote", async () => {
      const unitId = testData.units[1].id;
      const newOwner = "test-player-3";
      const price = 150;
      
      await spacetime.call("trade_unit_vote", [unitId, newOwner, price]);
      
      const unit = await spacetime.query("SELECT * FROM Unit WHERE id = ?", [unitId]);
      expect(unit[0].vote_owner).toBe(newOwner);
      expect(unit[0].vote_price).toBeNull();
    });

    it("should not allow trading unlisted votes", async () => {
      const unitId = testData.units[0].id;
      await expect(spacetime.call("trade_unit_vote", [unitId, "test-player-3", 100])).rejects.toThrow();
    });

    it("should set and clear vote price", async () => {
      const unitId = testData.units[0].id;
      const price = 200;

      // Set price
      await spacetime.call("set_unit_vote_price", [unitId, price]);
      let unit = await spacetime.query("SELECT * FROM Unit WHERE id = ?", [unitId]);
      expect(unit[0].vote_price).toBe(price);

      // Clear price
      await spacetime.call("set_unit_vote_price", [unitId, null]);
      unit = await spacetime.query("SELECT * FROM Unit WHERE id = ?", [unitId]);
      expect(unit[0].vote_price).toBeNull();
    });
  });

  describe("Resource Management", () => {
    it("should create test resources", async () => {
      const resources = await spacetime.query("SELECT * FROM Resource WHERE room_id = ?", [testData.room.id]);
      expect(resources).toHaveLength(testData.resources.length);
      
      for (const testResource of testData.resources) {
        const resource = resources.find((r: any) => r.id === testResource.id);
        expect(resource).toBeDefined();
        expect(resource.type).toBe(testResource.type);
        expect(resource.amount).toBe(testResource.amount);
        expect(resource.max_amount).toBe(testResource.max_amount);
        expect(resource.regeneration_rate).toBe(testResource.regeneration_rate);
      }
    });

    it("should update resource amount", async () => {
      const resourceId = testData.resources[0].id;
      const newAmount = 75;
      
      await spacetime.call("update_resource_amount", [resourceId, newAmount]);
      
      const resource = await spacetime.query("SELECT * FROM Resource WHERE id = ?", [resourceId]);
      expect(resource[0].amount).toBe(newAmount);
    });

    it("should not allow resource amount to exceed max amount", async () => {
      const resourceId = testData.resources[0].id;
      const maxAmount = testData.resources[0].max_amount;
      
      await expect(spacetime.call("update_resource_amount", [resourceId, maxAmount + 1])).rejects.toThrow();
    });

    it("should not allow negative resource amount", async () => {
      const resourceId = testData.resources[0].id;
      await expect(spacetime.call("update_resource_amount", [resourceId, -1])).rejects.toThrow();
    });

    it("should regenerate resources over time", async () => {
      const resourceId = testData.resources[0].id;
      const initialAmount = testData.resources[0].amount;
      const regenerationRate = testData.resources[0].regeneration_rate;
      
      // Simulate time passing (1 hour)
      const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
      await spacetime.call("update_resource_last_regeneration", [resourceId, oneHourAgo]);
      
      // Trigger regeneration
      await spacetime.call("regenerate_resources", [testData.room.id]);
      
      const resource = await spacetime.query("SELECT * FROM Resource WHERE id = ?", [resourceId]);
      expect(resource[0].amount).toBe(initialAmount + regenerationRate);
    });
  });

  describe("Unit Inventory Management", () => {
    it("should create test unit inventories", async () => {
      const inventories = await spacetime.query("SELECT * FROM UnitInventory WHERE unit_id IN (?)", 
        [testData.unitInventories.map(inv => inv.unit_id)]);
      expect(inventories).toHaveLength(testData.unitInventories.length);
      
      for (const testInventory of testData.unitInventories) {
        const inventory = inventories.find((i: any) => 
          i.unit_id === testInventory.unit_id && 
          i.resource_type === testInventory.resource_type
        );
        expect(inventory).toBeDefined();
        expect(inventory.amount).toBe(testInventory.amount);
      }
    });

    it("should update unit inventory amount", async () => {
      const unitId = testData.unitInventories[0].unit_id;
      const resourceType = testData.unitInventories[0].resource_type;
      const newAmount = 15;
      
      await spacetime.call("set_unit_inventory", [unitId, resourceType, newAmount]);
      
      const inventory = await spacetime.query(
        "SELECT * FROM UnitInventory WHERE unit_id = ? AND resource_type = ?",
        [unitId, resourceType]
      );
      expect(inventory[0].amount).toBe(newAmount);
    });

    it("should not allow negative inventory amount", async () => {
      const unitId = testData.unitInventories[0].unit_id;
      const resourceType = testData.unitInventories[0].resource_type;
      
      await expect(spacetime.call("set_unit_inventory", [unitId, resourceType, -1])).rejects.toThrow();
    });

    it("should transfer resources between units", async () => {
      const sourceUnitId = testData.unitInventories[0].unit_id;
      const targetUnitId = testData.unitInventories[1].unit_id;
      const resourceType = testData.unitInventories[0].resource_type;
      const transferAmount = 5;
      
      await spacetime.call("transfer_resources", [
        sourceUnitId,
        targetUnitId,
        resourceType,
        transferAmount
      ]);
      
      const sourceInventory = await spacetime.query(
        "SELECT * FROM UnitInventory WHERE unit_id = ? AND resource_type = ?",
        [sourceUnitId, resourceType]
      );
      const targetInventory = await spacetime.query(
        "SELECT * FROM UnitInventory WHERE unit_id = ? AND resource_type = ?",
        [targetUnitId, resourceType]
      );
      
      expect(sourceInventory[0].amount).toBe(testData.unitInventories[0].amount - transferAmount);
      expect(targetInventory[0].amount).toBe(testData.unitInventories[1].amount + transferAmount);
    });

    it("should not allow transferring more resources than available", async () => {
      const sourceUnitId = testData.unitInventories[0].unit_id;
      const targetUnitId = testData.unitInventories[1].unit_id;
      const resourceType = testData.unitInventories[0].resource_type;
      const transferAmount = testData.unitInventories[0].amount + 1;
      
      await expect(spacetime.call("transfer_resources", [
        sourceUnitId,
        targetUnitId,
        resourceType,
        transferAmount
      ])).rejects.toThrow();
    });
  });

  describe("Game Events", () => {
    it("should create game events", async () => {
      const events = await spacetime.query("SELECT * FROM GameEvent WHERE room_id = ?", [testData.room.id]);
      expect(events).toHaveLength(testData.events.length);
      
      for (const testEvent of testData.events) {
        const event = events.find((e: any) => e.event_type === testEvent.event_type);
        expect(event).toBeDefined();
        expect(event.source_id).toBe(testEvent.source_id);
        expect(event.target_id).toBe(testEvent.target_id);
        expect(event.value).toBe(testEvent.value);
      }
    });

    it("should create new game events", async () => {
      const newEvent = {
        room_id: testData.room.id,
        event_type: "vote_color_change",
        source_id: "test-player-1",
        target_id: "test-player-2",
        value: 0,
      };

      await spacetime.call("create_game_event", [
        newEvent.room_id,
        newEvent.event_type,
        newEvent.source_id,
        newEvent.target_id,
        newEvent.value,
      ]);

      const events = await spacetime.query("SELECT * FROM GameEvent WHERE event_type = ?", [newEvent.event_type]);
      expect(events).toHaveLength(1);
      expect(events[0].source_id).toBe(newEvent.source_id);
    });
  });

  describe("Resource Collection", () => {
    it("should collect resources from a node", async () => {
      const unitId = testData.units[0].id;
      const resourceId = testData.resources[0].id;
      const initialAmount = testData.resources[0].amount;
      const collectionRate = testData.resources[0].collection_rate;
      
      await spacetime.call("collect_resource", [unitId, resourceId]);
      
      // Check resource amount decreased
      const resource = await spacetime.query("SELECT * FROM Resource WHERE id = ?", [resourceId]);
      expect(resource[0].amount).toBe(initialAmount - collectionRate);
      
      // Check unit inventory increased
      const inventory = await spacetime.query(
        "SELECT * FROM UnitInventory WHERE unit_id = ? AND resource_type = ?",
        [unitId, testData.resources[0].type]
      );
      expect(inventory[0].amount).toBe(testData.unitInventories[0].amount + collectionRate);
    });

    it("should not allow collection when cooldown is active", async () => {
      const unitId = testData.units[0].id;
      const resourceId = testData.resources[0].id;
      
      // First collection
      await spacetime.call("collect_resource", [unitId, resourceId]);
      
      // Try to collect again immediately
      await expect(spacetime.call("collect_resource", [unitId, resourceId])).rejects.toThrow();
    });

    it("should allow collection after cooldown period", async () => {
      const unitId = testData.units[0].id;
      const resourceId = testData.resources[0].id;
      const cooldown = testData.resources[0].collection_cooldown;
      
      // First collection
      await spacetime.call("collect_resource", [unitId, resourceId]);
      
      // Simulate time passing
      const lastCollection = new Date(Date.now() - (cooldown + 1) * 1000).toISOString();
      await spacetime.call("update_last_collection", [unitId, resourceId, lastCollection]);
      
      // Should be able to collect again
      await expect(spacetime.call("collect_resource", [unitId, resourceId])).resolves.not.toThrow();
    });

    it("should not allow collection when resource is depleted", async () => {
      const unitId = testData.units[0].id;
      const resourceId = testData.resources[0].id;
      
      // Deplete the resource
      await spacetime.call("update_resource_amount", [resourceId, 0]);
      
      // Try to collect
      await expect(spacetime.call("collect_resource", [unitId, resourceId])).rejects.toThrow();
    });

    it("should not allow collection when unit is too far from resource", async () => {
      const unitId = testData.units[0].id;
      const resourceId = testData.resources[2].id; // Resource far from unit
      
      await expect(spacetime.call("collect_resource", [unitId, resourceId])).rejects.toThrow();
    });
  });

  describe("Resource Consumption", () => {
    it("should consume resources over time", async () => {
      const unitId = testData.consumptionRates[0].unit_id;
      const resourceType = testData.consumptionRates[0].resource_type;
      const consumptionRate = testData.consumptionRates[0].rate;
      const initialAmount = testData.unitInventories[2].amount; // Food inventory
      
      // Simulate 5 minutes passing
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      await spacetime.call("update_last_consumption", [unitId, resourceType, fiveMinutesAgo]);
      
      // Trigger consumption
      await spacetime.call("process_resource_consumption", [testData.room.id]);
      
      // Check inventory decreased
      const inventory = await spacetime.query(
        "SELECT * FROM UnitInventory WHERE unit_id = ? AND resource_type = ?",
        [unitId, resourceType]
      );
      expect(inventory[0].amount).toBe(initialAmount - (consumptionRate * 5));
    });

    it("should not allow negative resource amounts after consumption", async () => {
      const unitId = testData.consumptionRates[0].unit_id;
      const resourceType = testData.consumptionRates[0].resource_type;
      const consumptionRate = testData.consumptionRates[0].rate;
      
      // Set inventory to less than would be consumed
      await spacetime.call("set_unit_inventory", [unitId, resourceType, consumptionRate - 1]);
      
      // Simulate 2 minutes passing
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      await spacetime.call("update_last_consumption", [unitId, resourceType, twoMinutesAgo]);
      
      // Trigger consumption
      await spacetime.call("process_resource_consumption", [testData.room.id]);
      
      // Check inventory is 0, not negative
      const inventory = await spacetime.query(
        "SELECT * FROM UnitInventory WHERE unit_id = ? AND resource_type = ?",
        [unitId, resourceType]
      );
      expect(inventory[0].amount).toBe(0);
    });

    it("should handle multiple units consuming resources", async () => {
      const unit1Id = testData.consumptionRates[0].unit_id;
      const unit2Id = testData.consumptionRates[1].unit_id;
      const resourceType = testData.consumptionRates[0].resource_type;
      
      // Set initial amounts
      await spacetime.call("set_unit_inventory", [unit1Id, resourceType, 50]);
      await spacetime.call("set_unit_inventory", [unit2Id, resourceType, 50]);
      
      // Simulate 3 minutes passing
      const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString();
      await spacetime.call("update_last_consumption", [unit1Id, resourceType, threeMinutesAgo]);
      await spacetime.call("update_last_consumption", [unit2Id, resourceType, threeMinutesAgo]);
      
      // Trigger consumption
      await spacetime.call("process_resource_consumption", [testData.room.id]);
      
      // Check both inventories decreased correctly
      const inventory1 = await spacetime.query(
        "SELECT * FROM UnitInventory WHERE unit_id = ? AND resource_type = ?",
        [unit1Id, resourceType]
      );
      const inventory2 = await spacetime.query(
        "SELECT * FROM UnitInventory WHERE unit_id = ? AND resource_type = ?",
        [unit2Id, resourceType]
      );
      
      expect(inventory1[0].amount).toBe(50 - (testData.consumptionRates[0].rate * 3));
      expect(inventory2[0].amount).toBe(50 - (testData.consumptionRates[1].rate * 3));
    });

    it("should create consumption events", async () => {
      const unitId = testData.consumptionRates[0].unit_id;
      const resourceType = testData.consumptionRates[0].resource_type;
      
      // Simulate 1 minute passing
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
      await spacetime.call("update_last_consumption", [unitId, resourceType, oneMinuteAgo]);
      
      // Trigger consumption
      await spacetime.call("process_resource_consumption", [testData.room.id]);
      
      // Check event was created
      const events = await spacetime.query(
        "SELECT * FROM GameEvent WHERE event_type = 'resource_consumption' AND source_id = ?",
        [unitId.toString()]
      );
      expect(events).toHaveLength(1);
      expect(events[0].value).toBe(testData.consumptionRates[0].rate);
    });
  });
}); 