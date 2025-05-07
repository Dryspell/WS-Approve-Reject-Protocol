-- Drop existing tables
DROP TABLE IF EXISTS chat_messages;
DROP TABLE IF EXISTS round_ready_states;
DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS game_rounds;
DROP TABLE IF EXISTS game_room_members;
DROP TABLE IF EXISTS game_rooms;
DROP TABLE IF EXISTS users;

-- Recreate tables with updated schema
CREATE TABLE users (
  id TEXT PRIMARY KEY NOT NULL,
  username TEXT NOT NULL
);

CREATE TABLE game_rooms (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  start_time INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE game_room_members (
  room_id TEXT NOT NULL REFERENCES game_rooms(id),
  user_id TEXT NOT NULL,
  joined_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE game_rounds (
  id TEXT PRIMARY KEY NOT NULL,
  room_id TEXT NOT NULL REFERENCES game_rooms(id),
  round_number INTEGER NOT NULL,
  start_time INTEGER NOT NULL,
  end_time INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE tickets (
  id TEXT PRIMARY KEY NOT NULL,
  room_id TEXT NOT NULL REFERENCES game_rooms(id),
  owner TEXT NOT NULL,
  color INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER
);

CREATE TABLE round_ready_states (
  room_id TEXT NOT NULL REFERENCES game_rooms(id),
  user_id TEXT NOT NULL,
  round_number INTEGER NOT NULL,
  ready_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY NOT NULL,
  room_id TEXT NOT NULL REFERENCES game_rooms(id),
  sender_id TEXT NOT NULL,
  message TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  round_number INTEGER
); 