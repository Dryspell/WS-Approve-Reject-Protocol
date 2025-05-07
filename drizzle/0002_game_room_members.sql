CREATE TABLE IF NOT EXISTS game_room_members (
  room_id TEXT NOT NULL REFERENCES game_rooms(id),
  user_id TEXT NOT NULL,
  joined_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
); 