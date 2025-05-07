CREATE TABLE IF NOT EXISTS round_ready_states (
  room_id TEXT NOT NULL REFERENCES game_rooms(id),
  round_number INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  ready_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
); 