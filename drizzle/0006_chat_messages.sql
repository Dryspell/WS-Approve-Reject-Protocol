CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY NOT NULL,
  room_id TEXT NOT NULL REFERENCES game_rooms(id),
  sender_id TEXT NOT NULL,
  message TEXT NOT NULL,
  timestamp INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  round_number INTEGER
); 