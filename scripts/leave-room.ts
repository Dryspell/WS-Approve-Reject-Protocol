import { DbConnection } from '../src/module_bindings';

// Use the BROWSER's stored identity token if available
// The browser stores its token in localStorage under 'spacetimedb-token'
// Since we can't access that directly, we'll use a fresh connection
// The fresh connection will have its own identity, but we need the browser's identity

async function leaveRoom(): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout')), 15000);
    
    // Try to read the stored token for the browser's identity
    const token = process.env.SPACETIME_TOKEN;
    
    const builder = DbConnection.builder()
      .withUri('http://127.0.0.1:3000')
      .withDatabaseName('game');
    
    if (token) builder.withCredentials({ token, identity: null as any });
    
    const conn = builder
      .onConnect((conn, identity, _token) => {
        console.log('Connected as:', identity.toHexString().slice(0, 16), '...');
        conn.subscriptionBuilder()
          .onApplied(() => {
            const rooms = Array.from(conn.db.game_room.iter());
            console.log('Rooms:', rooms.map(r => `${r.name}(id=${r.id},members=${r.memberIds?.length})`).join(', '));
            
            // Find the room this identity is in
            const myRoom = rooms.find(r => 
              r.memberIds?.some((id: any) => id.toHexString() === identity.toHexString())
            );
            
            if (myRoom) {
              console.log(`Leaving room ${myRoom.name} (id=${myRoom.id})...`);
              conn.reducers.leaveRoom({ roomId: myRoom.id });
            } else {
              console.log('Not in any room');
            }
            
            setTimeout(() => {
              clearTimeout(timeout);
              conn.disconnect();
              resolve();
            }, 2000);
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

leaveRoom()
  .then(() => { console.log('Done'); process.exit(0); })
  .catch(e => { console.error('Error:', e.message); process.exit(1); });
