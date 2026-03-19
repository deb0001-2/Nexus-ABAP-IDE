import React, { useRef, useEffect } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';

interface Marker {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
  message: string;
  severity: number;
}

interface EditorAreaProps {
  code: string;
  setCode: (code: string) => void;
  markers?: Marker[];
  theme?: 'nexus-dark' | 'light';
}

const EditorArea: React.FC<EditorAreaProps> = ({ code, setCode, markers = [], theme = 'nexus-dark' }) => {
  const monaco = useMonaco();
  const editorRef = useRef<any>(null);

  useEffect(() => {
    if (monaco) {
      monaco.languages.register({ id: 'abap' });
    }
  }, [monaco]);

  useEffect(() => {
    if (monaco && editorRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        monaco.editor.setModelMarkers(model, 'abap-llm-linter', markers);
      }
    }
  }, [markers, monaco]);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setCode(value);
    }
  };

  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
      <Editor
        height="100%"
        defaultLanguage="abap"
        theme={theme === 'light' ? 'vs' : 'vs-dark'}
        value={code}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
          fontLigatures: true,
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          formatOnPaste: true,
          padding: { top: 16 },
          stickyScroll: { enabled: false }
        }}
      />
    </div>
  );
};

export default EditorArea;
