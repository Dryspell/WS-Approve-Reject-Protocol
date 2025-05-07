CREATE TABLE IF NOT EXISTS chat_permissions (
  room_id TEXT NOT NULL REFERENCES game_rooms(id),
  user_id TEXT NOT NULL,
  permission TEXT NOT NULL,
  granted_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
); 