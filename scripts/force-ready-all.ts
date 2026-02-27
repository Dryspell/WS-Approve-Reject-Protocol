import { DbConnection } from '../src/module_bindings';

async function forceReadyAll(): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout')), 15000);
    
    const conn = DbConnection.builder()
      .withUri('http://127.0.0.1:3000')
      .withDatabaseName('game')
      .onConnect((conn, identity, _token) => {
        conn.subscriptionBuilder()
          .onApplied(() => {
            const rooms = Array.from(conn.db.game_room.iter());
            const users = Array.from(conn.db.user.iter());
            const readyStates = Array.from(conn.db.ready_state?.iter() || []);
            
            console.log('Rooms:', rooms.map(r => `${r.name}(id=${r.id},members=${r.memberIds?.length})`).join(', '));
            console.log('Users:', users.map(u => `${u.name}(balance=$${u.walletBalance?.toFixed(2)})`).join(', '));
            
            for (const room of rooms) {
              if (room.gameStatus === 'lobby') {
                console.log(`Starting room ${room.name} (id=${room.id})...`);
                try {
                  conn.reducers.startGame({ roomId: room.id });
                } catch(e) {
                  console.log(`  Error: ${e}`);
                }
              }
            }
            
            setTimeout(() => {
              clearTimeout(timeout);
              conn.disconnect();
              resolve();
            }, 3000);
          })
          .subscribe(['SELECT * FROM game_room', 'SELECT * FROM user']);
      })
      .onConnectError((_ctx, err) => {
        clearTimeout(timeout);
        reject(err);
      })
      .build();
  });
}

forceReadyAll()
  .then(() => { console.log('Done'); process.exit(0); })
  .catch(e => { console.error('Error:', e.message); process.exit(1); });
