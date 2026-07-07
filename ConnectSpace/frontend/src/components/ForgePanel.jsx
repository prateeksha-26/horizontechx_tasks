import { useEffect, useMemo, useState, useRef } from 'react';
import { Compartment, EditorState, StateEffect, StateField } from '@codemirror/state';
import {
  EditorView,
  keymap,
  highlightActiveLine,
  Decoration,
  WidgetType,
} from '@codemirror/view';
import { defaultKeymap } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { oneDark } from '@codemirror/theme-one-dark';
import './ForgePanel.css';

const defaultCode = `function helloWorld() {
  console.log("Welcome to Forge!");
}
`;

const setCursorDecos = StateEffect.define();
const cursorField = StateField.define({
  create: () => Decoration.none,
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const effect of tr.effects) {
      if (effect.is(setCursorDecos)) {
        deco = effect.value;
      }
    }
    return deco;
  },
  provide: (field) => EditorView.decorations.from(field),
});

class CursorBadge extends WidgetType {
  constructor(name, color) {
    super();
    this.name = name;
    this.color = color;
  }

  toDOM() {
    const badge = document.createElement('div');
    badge.className = 'forge-cursor-badge';
    badge.textContent = this.name;
    badge.style.borderColor = this.color;
    badge.style.backgroundColor = `${this.color}22`;
    badge.style.color = this.color;
    return badge;
  }

  ignoreEvent() {
    return true;
  }
}

function getLanguageExtension(language) {
  switch (language) {
    case 'python':
      return python();
    case 'javascript':
    default:
      return javascript();
  }
}

export default function ForgePanel({ socket, participants, user, roomId }) {
  const [editorView, setEditorView] = useState(null);
  const [code, setCode] = useState(defaultCode);
  const [language, setLanguage] = useState('javascript');
  const [cursors, setCursors] = useState({});
  const applyingRemote = useRef(false);
  const editorRootRef = useRef(null);
  const languageCompartment = useMemo(() => new Compartment(), []);

  const badgeMap = useMemo(() => {
    const palette = ['#e8a460', '#5fd4c4', '#a98ef0', '#f4b860'];
    return participants.reduce((map, participant, index) => {
      map[participant.socketId] = palette[index % palette.length];
      return map;
    }, {});
  }, [participants]);

  useEffect(() => {
    if (!socket || !roomId) return;

    const onForgeState = ({ code: remoteCode, language: remoteLanguage }) => {
      if (remoteCode != null) {
        setCode(remoteCode);
        if (editorView) {
          applyingRemote.current = true;
          const changes = { from: 0, to: editorView.state.doc.length, insert: remoteCode };
          editorView.dispatch({ changes });
          applyingRemote.current = false;
        }
      }
      if (remoteLanguage) {
        setLanguage(remoteLanguage);
      }
    };

    const onCodeChange = ({ code: remoteCode, senderSocketId }) => {
      if (senderSocketId === socket.id || remoteCode == null) return;
      setCode(remoteCode);
      if (editorView) {
        applyingRemote.current = true;
        const changes = { from: 0, to: editorView.state.doc.length, insert: remoteCode };
        editorView.dispatch({ changes });
        applyingRemote.current = false;
      }
    };

    const onLanguageChange = ({ language: remoteLanguage, senderSocketId }) => {
      if (senderSocketId === socket.id || !remoteLanguage) return;
      setLanguage(remoteLanguage);
    };

    const onCursorMove = ({ cursor, senderSocketId, name }) => {
      if (!cursor || senderSocketId === socket.id) return;
      setCursors((prev) => ({
        ...prev,
        [senderSocketId]: { ...cursor, name },
      }));
    };

    socket.on('forge-state', onForgeState);
    socket.on('forge-code-change', onCodeChange);
    socket.on('forge-language-change', onLanguageChange);
    socket.on('forge-cursor-move', onCursorMove);

    return () => {
      socket.off('forge-state', onForgeState);
      socket.off('forge-code-change', onCodeChange);
      socket.off('forge-language-change', onLanguageChange);
      socket.off('forge-cursor-move', onCursorMove);
    };
  }, [socket, editorView, roomId]);

  useEffect(() => {
    if (!editorView) return;
    const decorations = Object.entries(cursors)
      .filter(([socketId]) => socketId !== socket?.id)
      .map(([socketId, cursor]) => {
        const color = badgeMap[socketId] || '#e8a460';
        return Decoration.widget({
          widget: new CursorBadge(cursor.name, color),
          side: 1,
        }).range(cursor.from);
      });
    const decoSet = Decoration.set(decorations, true);
    editorView.dispatch({ effects: setCursorDecos.of(decoSet) });
  }, [cursors, editorView, badgeMap, socket]);

  useEffect(() => {
    if (!socket || !editorRootRef.current) return;
    const startDoc = code || defaultCode;
    const view = new EditorView({
      state: EditorState.create({
        doc: startDoc,
        extensions: [
          languageCompartment.of(getLanguageExtension(language)),
          keymap.of(defaultKeymap),
          highlightActiveLine(),
          oneDark,
          cursorField,
          EditorView.updateListener.of((update) => {
            if (applyingRemote.current) return;
            if (update.docChanged) {
              const newCode = update.state.doc.toString();
              setCode(newCode);
              socket.emit('forge-code-change', { code: newCode });
            }
            if (update.selectionSet) {
              const selection = update.state.selection.main;
              socket.emit('forge-cursor-move', {
                cursor: { from: selection.from, to: selection.to },
              });
            }
          }),
        ],
      }),
      parent: editorRootRef.current,
    });

    setEditorView(view);

    return () => {
      view.destroy();
      setEditorView(null);
    };
  }, [socket, language, languageCompartment]);

  useEffect(() => {
    if (!editorView) return;
    editorView.dispatch({
      effects: languageCompartment.reconfigure(getLanguageExtension(language)),
    });
  }, [language, editorView, languageCompartment]);

  function handleLanguageChange(event) {
    const nextLanguage = event.target.value;
    setLanguage(nextLanguage);
    socket.emit('forge-language-change', { language: nextLanguage });
  }

  return (
    <div className="forge-panel">
      <div className="forge-header">
        <div>
          <h2>Forge</h2>
          <p>Collaborative code editor</p>
        </div>
        <div className="forge-language-selector">
          <label htmlFor="forge-language">Language</label>
          <select id="forge-language" value={language} onChange={handleLanguageChange}>
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
          </select>
        </div>
      </div>
      <div ref={editorRootRef} className="forge-editor-root" />
      <div className="forge-footnote">
        <span className="forge-tag">Amber</span> syncs code in real time and reloads for rejoiners.
      </div>
    </div>
  );
}
