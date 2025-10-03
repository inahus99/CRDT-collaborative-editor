
import React, { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import Quill from 'quill';
import { QuillBinding } from 'y-quill'; 
import QuillCursors from 'quill-cursors';
import { IndexeddbPersistence } from 'y-indexeddb';

Quill.register('modules/cursors', QuillCursors);

export default function CollabEditor({ docName = 'default-room' }) {
  const editorRef = useRef(null);
  const [status, setStatus] = useState('connecting');
  const [users, setUsers] = useState([]);
  const providerRef = useRef(null);
  const awarenessRef = useRef(null);
  const ydocRef = useRef(null);
  const cursorsModuleRef = useRef(null);

  useEffect(() => {
    // identity
    const localUser = {
      name: `User-${Math.floor(Math.random() * 1000)}`,
      color: getRandomColor()
    };

    // create Y.Doc
    const doc = new Y.Doc();
    ydocRef.current = doc;

    // local persistence
    const persistence = new IndexeddbPersistence(docName, doc);
    persistence.on('synced', () => {
      console.log('IndexedDB synced for', docName);
    });

    // provider
    const provider = new WebsocketProvider('ws://localhost:1234', docName, doc);
    providerRef.current = provider;
    awarenessRef.current = provider.awareness;

    //  local awareness user
    provider.awareness.setLocalStateField('user', localUser);

    provider.on('status', ev => {
      setStatus(ev.status);
    });

    // setup Quill editor
    const quillContainer = editorRef.current;
    const quill = new Quill(quillContainer, {
      theme: 'snow',
      modules: {
        toolbar: [
          ['bold', 'italic', 'underline'],
          [{ header: [1, 2, 3, false] }],
          ['link', 'image'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['clean'],
        ],
        cursors: true 
      }
    });

    //  cursors module instance
    const cursors = quill.getModule('cursors');
    cursorsModuleRef.current = cursors;

    // bind Y.Text <-> Quill
    const ytext = doc.getText('quill');
    const binding = new QuillBinding(ytext, quill, provider.awareness);

    // update awareness selection when local selection changes
    quill.on('selection-change', (range, oldRange, source) => {
      if (!range) {
        // if no selection , clear local selection
        provider.awareness.setLocalStateField('selection', null);
      } else {
        provider.awareness.setLocalStateField('selection', {
          index: range.index,
          length: range.length
        });
      }
    });

    // When awareness changes, update remote cursors and user list
    const onAwarenessChange = () => {
      const states = Array.from(provider.awareness.getStates().entries());
      const userList = [];
      // states: [clientId, state]
      for (const [clientId, state] of states) {
        if (state && state.user) {
          userList.push({ name: state.user.name, color: state.user.color });
        }

        // handle cursors: state.selection contains {index, length}
        if (state && state.user) {
          const user = state.user;
          const sel = state.selection;
          const id = clientId.toString();

          if (sel && typeof sel.index === 'number') {
            // create or move cursor
            try {
              cursors.createCursor(id, user.name, user.color);
              cursors.moveCursor(id, { index: sel.index, length: sel.length || 0 });
            } catch (e) {
              try {
                cursors.moveCursor(id, { index: sel.index, length: sel.length || 0 });
              } catch (_e) {}
            }
          } else {
            // remove cursor if no selection
            try { cursors.removeCursor(id); } catch (e) {}
          }
        }
      }

      setUsers(userList);
    };

    provider.awareness.on('change', onAwarenessChange);

    // cleanup on unmount
    return () => {
      try {
        provider.awareness.off('change', onAwarenessChange);
        binding.destroy();
        provider.disconnect();
        doc.destroy();
      } catch (e) {
        // ignore
      }
    };
  }, [docName]);

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <strong>Room:</strong> {docName} — <strong>Status:</strong> {status} &nbsp;|&nbsp;
        <strong>Users:</strong> {users.map(u => (
          <span key={u.name} style={{ marginRight: 8 }}>
            <span style={{
              display: 'inline-block', width: 10, height: 10, background: u.color, marginRight: 6, borderRadius: 3
            }} />
            {u.name}
          </span>
        ))}
      </div>

      <div
  ref={editorRef}
  style={{
    minHeight: 320,
    borderRadius: 6,
    overflow: 'auto',
    padding: 0,
    background: 'transparent'
  }}
/>
    </div>
  );
}

function getRandomColor() {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue} 70% 60%)`;
}
