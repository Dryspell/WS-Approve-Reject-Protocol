import { test } from "node:test";
import assert from "node:assert";
import {
  representatives,
  serializeToNestedTuples,
  serializeWithType,
  wrapSerializedObject,
} from "~/routes/alternate-serialization";

const user = {
  type: "user" as const,
  name: "Alice",
  age: 25,
  address: {
    street: "456 Elm St",
    city: "Metropolis",
    zip: 54321,
  },
};

const product = {
  type: "product" as const,
  title: "Smartphone",
  price: 699,
  categories: ["electronics", "gadgets"],
};

test("serializeWithType - should serialize a user object correctly", () => {
  const serializedUser = serializeWithType(user);
  assert.deepStrictEqual(serializedUser, [
    "user",
    "Alice",
    25,
    ["456 Elm St", "Metropolis", 54321],
  ]);
});

test("serializeWithType - should serialize a product object correctly", () => {
  const serializedProduct = serializeWithType(product);
  assert.deepStrictEqual(serializedProduct, [
    "product",
    "Smartphone",
    699,
    ["electronics", "gadgets"],
  ]);
});

// test("serializeWithType - should throw an error for invalid type", () => {
//   const invalidObject = { type: "invalid", name: "Test" };
//   assert.throws(() => serializeWithType(invalidObject), {
//     message: "No representative found for type: invalid",
//   });
// });

test("wrapSerializedObject - should deserialize a serialized user object correctly", () => {
  const serializedUser = serializeWithType(user);
  const deserializedUser = wrapSerializedObject(serializedUser);

  assert.strictEqual(deserializedUser.type, "user");
  assert.strictEqual(deserializedUser.name, "Alice");
  assert.strictEqual(deserializedUser.age, 25);
  assert.strictEqual(deserializedUser.address.street, "456 Elm St");
  assert.strictEqual(deserializedUser.address.city, "Metropolis");
  assert.strictEqual(deserializedUser.address.zip, 54321);
});

test("wrapSerializedObject - should deserialize a serialized product object correctly", () => {
  const serializedProduct = serializeWithType(product);
  const deserializedProduct = wrapSerializedObject(serializedProduct);

  assert.strictEqual(deserializedProduct.type, "product");
  assert.strictEqual(deserializedProduct.title, "Smartphone");
  assert.strictEqual(deserializedProduct.price, 699);

  // Convert both to JSON strings for deep equality check
  assert.strictEqual(
    JSON.stringify(deserializedProduct.categories),
    JSON.stringify(["electronics", "gadgets"]),
  );
});

test("wrapSerializedObject - should support JSON.stringify on the deserialized object", () => {
  const serializedUser = serializeWithType(user);
  const deserializedUser = wrapSerializedObject(serializedUser);

  const jsonString = JSON.stringify(deserializedUser, null, 2);
  assert.strictEqual(
    jsonString,
    JSON.stringify(
      {
        type: "user",
        name: "Alice",
        age: 25,
        address: {
          street: "456 Elm St",
          city: "Metropolis",
          zip: 54321,
        },
      },
      null,
      2,
    ),
  );
});

test("serializeToNestedTuples - should handle arrays in serialization", () => {
  const representative = representatives.product;
  const target = {
    title: "Tablet",
    price: 499,
    categories: ["gadgets", "electronics"],
  };
  const result = serializeToNestedTuples(representative, target);

  assert.deepStrictEqual(result, ["Tablet", 499, ["gadgets", "electronics"]]);
});

test("serializeToNestedTuples - should throw an error for mismatched structure", () => {
  const representative = representatives.user;
  const invalidTarget = {
    name: "Bob",
    age: "not a number", // Invalid type
    address: {
      street: "123 Main St",
      city: "Somewhere",
    }, // Missing zip
  };

  assert.throws(() => serializeToNestedTuples(representative, invalidTarget));
});
