
const Y = require('yjs');

function testYjsConcurrentInserts() {
  console.log('=== Yjs concurrent insert test ===');

  const A = new Y.Doc();
  const B = new Y.Doc();

  // simulate concurrent edits
  A.getText('t').insert(0, 'AAA-');   // client A
  B.getText('t').insert(0, 'BBB-');   // client B

  const updateA = Y.encodeStateAsUpdate(A);
  const updateB = Y.encodeStateAsUpdate(B);

  // apply in A then B
  const doc1 = new Y.Doc();
  Y.applyUpdate(doc1, updateA);
  Y.applyUpdate(doc1, updateB);

  // apply in B then A
  const doc2 = new Y.Doc();
  Y.applyUpdate(doc2, updateB);
  Y.applyUpdate(doc2, updateA);

  console.log('doc1:', doc1.getText('t').toString());
  console.log('doc2:', doc2.getText('t').toString());
  console.log('equal:', doc1.getText('t').toString() === doc2.getText('t').toString());
}

function testYjsOfflineMerge() {
  console.log('\n=== Yjs offline merge test ===');

  // simulate a central server as update exchanger (no real network)
  const server = new Y.Doc();

  const client1 = new Y.Doc();
  const client2 = new Y.Doc();

  // initial state sync
  const init = Y.encodeStateAsUpdate(server);
  Y.applyUpdate(client1, init);
  Y.applyUpdate(client2, init);

  // client1 online edits
  client1.getText('t').insert(0, 'Hello-');

  // client2 goes "offline" and makes edits locally
  const offline = Y.encodeStateAsUpdate(client2); // snapshot before offline edit
  client2.getText('t').insert(0, 'World-'); // local edit while offline

  // now simulate reconnection: client2 sends its offline update to server, and client1's update arrives too
  const u1 = Y.encodeStateAsUpdate(client1);
  const u2 = Y.encodeStateAsUpdate(client2);

  // apply in server in arbitrary order
  Y.applyUpdate(server, u2);
  Y.applyUpdate(server, u1);

  // propagate server state back to fresh replicas
  const finalUpdate = Y.encodeStateAsUpdate(server);

  const r1 = new Y.Doc();
  const r2 = new Y.Doc();
  Y.applyUpdate(r1, finalUpdate);
  Y.applyUpdate(r2, finalUpdate);

  console.log('final r1:', r1.getText('t').toString());
  console.log('final r2:', r2.getText('t').toString());
  console.log('equal:', r1.getText('t').toString() === r2.getText('t').toString());
}

testYjsConcurrentInserts();
testYjsOfflineMerge();
