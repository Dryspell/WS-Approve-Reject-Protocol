import { DbConnection } from '../src/module_bindings';

const SPACETIMEDB_URL = 'http://127.0.0.1:3000';
const DATABASE_NAME = 'game';

async function forceStart(): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout')), 10000);
    
    const conn = DbConnection.builder()
      .withUri(SPACETIMEDB_URL)
      .withDatabaseName(DATABASE_NAME)
      .onConnect((conn, identity, _token) => {
        conn.subscriptionBuilder()
          .onApplied(() => {
            const rooms = Array.from(conn.db.game_room.iter());
            console.log('Rooms:', rooms.map(r => `${r.name} (id=${r.id}, status=${r.gameStatus})`).join(', '));
            
            const reviewArena = rooms.find(r => r.name === 'review-arena');
            if (reviewArena) {
              console.log(`Force-starting review-arena (id=${reviewArena.id})...`);
              conn.reducers.startGame({ roomId: reviewArena.id });
              setTimeout(() => {
                clearTimeout(timeout);
                conn.disconnect();
                resolve();
              }, 2000);
            } else {
              console.log('review-arena not found');
              clearTimeout(timeout);
              conn.disconnect();
              resolve();
            }
          })
          .subscribe(['SELECT * FROM game_room']);
      })
      .onConnectError((_ctx, err) => {
        clearTimeout(timeout);
        reject(err);
      })
      .build();
  });
}

forceStart().then(() => { console.log('Done'); process.exit(0); }).catch(e => { console.error(e); process.exit(1); });
