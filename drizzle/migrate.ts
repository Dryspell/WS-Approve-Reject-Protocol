import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';

const sqlite = new Database('sqlite.db');
const db = drizzle(sqlite);

// This will automatically run needed migrations on the database
migrate(db, { migrationsFolder: './drizzle' });

console.log('Migrations completed successfully'); 