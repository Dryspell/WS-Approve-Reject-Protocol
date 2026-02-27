import { DbConnection } from '../src/module_bindings';

async function startAll(): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout')), 15000);
    
    const conn = DbConnection.builder()
      .withUri('http://127.0.0.1:3000')
      .withDatabaseName('game')
      .onConnect((conn, identity, _token) => {
        conn.subscriptionBuilder()
          .onApplied(() => {
            const rooms = Array.from(conn.db.game_room.iter()) as any[];
            const users = Array.from(conn.db.user.iter()) as any[];
            const readyStates = Array.from(conn.db.ready_state.iter()) as any[];
            const myUser = users.find(u => u.identity.toHexString() === identity.toHexString());
            
            console.log(`Connected as: ${identity.toHexString().slice(0,16)}... Balance: $${myUser?.walletBalance?.toFixed(2) ?? '?'}`);
            console.log('Ready states:', readyStates.map(rs => `room=${rs.roomId},readyCount=${rs.readyUserIds?.length ?? 0}`).join(', '));
            
            const lobbyRooms = rooms.filter(r => r.gameStatus === 'lobby');
            
            for (const room of lobbyRooms) {
              const readyStateRow = readyStates.find(rs => rs.roomId === room.id.toString());
              const readyCount = readyStateRow?.readyUserIds?.length ?? 0;
              const memberCount = room.memberIds?.length ?? 0;
              console.log(`  ${room.name}(id=${room.id}): ${readyCount}/${memberCount} ready`);
              
              if (memberCount > 0 && readyCount >= memberCount) {
                console.log(`  → Starting ${room.name}...`);
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
          .subscribe(['SELECT * FROM game_room', 'SELECT * FROM ready_state', 'SELECT * FROM user']);
      })
      .onConnectError((_ctx: any, err: any) => {
        clearTimeout(timeout);
        reject(err);
      })
      .build();
  });
}

startAll()
  .then(() => { console.log('Done'); process.exit(0); })
  .catch(e => { console.error('Error:', e.message); process.exit(1); });
