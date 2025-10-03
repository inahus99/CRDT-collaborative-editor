
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const Y = require('yjs');
const { setupWSConnection, docs } = require('y-websocket/bin/utils');

const PORT = process.env.PORT || 1234;
const SNAPSHOT_DIR = path.join(__dirname, 'snapshots');
const PERSIST_INTERVAL_MS = 10000; 

//  snapshot directory 
if (!fs.existsSync(SNAPSHOT_DIR)) {
  fs.mkdirSync(SNAPSHOT_DIR);
}

const app = express();
app.get('/', (req, res) => {
  res.send('Yjs websocket relay (file-based snapshots) running.');
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

//  track of  docs 
const loadedDocs = new Set();

wss.on('connection', (conn, req) => {
  setupWSConnection(conn, req, { gc: true });

  const docName = req.url.slice(1).split('?')[0];
  if (!docName) return;

  // Load snapshot 
  if (!loadedDocs.has(docName)) {
    const filePath = path.join(SNAPSHOT_DIR, `${docName}.json`);
    if (fs.existsSync(filePath)) {
      try {
        const encoded = Uint8Array.from(
          JSON.parse(fs.readFileSync(filePath, 'utf8'))
        );
        const ydoc = docs.get(docName);
        if (ydoc) {
          Y.applyUpdate(ydoc, encoded);
          console.log(`Loaded snapshot for doc "${docName}"`);
        }
      } catch (e) {
        console.error('Error loading snapshot for', docName, e);
      }
    } else {
      console.log(`No snapshot found for doc "${docName}"`);
    }
    loadedDocs.add(docName);
  }
});

// Periodic persistence
setInterval(() => {
  for (const [docName, ydoc] of docs) {
    try {
      const update = Y.encodeStateAsUpdate(ydoc);
      const filePath = path.join(SNAPSHOT_DIR, `${docName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(Array.from(update)));
      console.log(`Snapshot saved for ${docName}`);
    } catch (e) {
      console.error('Error saving snapshot for', docName, e);
    }
  }
}, PERSIST_INTERVAL_MS);

server.listen(PORT, () => {
  console.log(`Yjs server running at ws://localhost:${PORT}`);
});

/**
 * Yjs websocket relay server with file-based persistence
 * - Uses y-websocket's setupWSConnection to sync docs.
 * - Periodically saves each Y.Doc to a local JSON file (snapshots).
 * - On startup / first client connect, loads snapshot if exists.
 */