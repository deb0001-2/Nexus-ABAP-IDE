import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Moon, Sun, Menu, Play, Settings, Activity, FolderInput, Code2, Zap } from 'lucide-react';
import Sidebar from './components/Sidebar';
import EditorArea from './components/EditorArea';
import LLMPanel from './components/LLMPanel';
import SettingsModal from './components/SettingsModal';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { executeABAPSimulation } from './services/llm';
import type { FileNode } from './types';
import './index.css';

function App() {
  const [fileSystem, setFileSystem] = useState<FileNode[]>([]);
  const [activeFileId, setActiveFileId] = useState<string>('');
  const [openFileIds, setOpenFileIds] = useState<string[]>([]);
  
  const [theme, setTheme] = useState<'nexus-dark' | 'light'>('nexus-dark');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isLLMPanelOpen, setIsLLMPanelOpen] = useState<boolean>(false);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [llmOutput, setLlmOutput] = useState<{ type: 'info' | 'error' | 'success'; message: string; data?: any } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [markers, setMarkers] = useState<any[]>([]);
  const [apiKey, setApiKey] = useState<string>(localStorage.getItem('gemini_api_key') || '');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [isLayoutReady, setIsLayoutReady] = useState(false);

  // File handle map for lazy content loading (stored in ref to avoid re-renders)
  const fileHandleMap = useRef<Map<string, FileSystemFileHandle>>(new Map());
  // Directory handle map for subfolder navigation during file creation
  const dirHandleMap = useRef<Map<string, FileSystemDirectoryHandle>>(new Map());

  // Auto-save debounce refs (avoid stale closures)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestContentRef = useRef<string>('');
  const latestActiveFileIdRef = useRef<string>('');
  const lastSavedContentRef = useRef<Map<string, string>>(new Map());
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving...'>('saved');

  // Sync API Key to Local Storage
  useEffect(() => {
    localStorage.setItem('gemini_api_key', apiKey);
  }, [apiKey]);

  // Protect the editor: Wait until layout is drawn
  useEffect(() => {
    const timer = setTimeout(() => setIsLayoutReady(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // --- Workspace Explorer ---
  const openWorkspace = useCallback(async () => {
    // Check browser support
    if (!('showDirectoryPicker' in window)) {
      alert('Your browser does not support the File System Access API. Please use a Chromium-based browser (Chrome, Edge).');
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dirHandle: FileSystemDirectoryHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });

      const newNodes: FileNode[] = [];
      const newFileHandles = new Map<string, FileSystemFileHandle>();
      const newDirHandles = new Map<string, FileSystemDirectoryHandle>();
      const rootFolderIds: string[] = [];

      // Recursive scanner
      const scanDirectory = async (handle: FileSystemDirectoryHandle, parentId: string | null) => {
        const folderId = Math.random().toString(36).substr(2, 9);
        newNodes.push({ id: folderId, name: handle.name, type: 'folder', parentId });
        newDirHandles.set(folderId, handle);
        if (parentId === null) rootFolderIds.push(folderId);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for await (const entry of (handle as any).values()) {
          if (entry.kind === 'file') {
            const fileId = Math.random().toString(36).substr(2, 9);
            newNodes.push({ id: fileId, name: entry.name, type: 'file', parentId: folderId });
            newFileHandles.set(fileId, entry);
          } else if (entry.kind === 'directory') {
            await scanDirectory(entry, folderId);
          }
        }
      };

      await scanDirectory(dirHandle, null);

      // Store all handles for later use
      fileHandleMap.current = newFileHandles;
      dirHandleMap.current = newDirHandles;

      // Replace file system with the scanned workspace
      setFileSystem(newNodes);
      setOpenFileIds([]);
      setActiveFileId('');

    } catch (err: unknown) {
      // User clicked Cancel — AbortError is expected, silently ignore
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('Workspace open error:', err);
      alert('Failed to open workspace. Please try again.');
    }
  }, []);

  // --- Physical File Creation ---
  const createFileOnDisk = useCallback(async (parentId: string | null, fileName: string) => {
    // Get the parent directory handle
    const parentDirHandle = parentId ? dirHandleMap.current.get(parentId) : null;
    
    if (!parentDirHandle && parentId) {
      // No workspace open or parent folder not found — fall back to in-memory only
      const newNode: FileNode = {
        id: Math.random().toString(36).substr(2, 9),
        name: fileName,
        type: 'file',
        parentId,
        content: '* New ABAP file\n'
      };
      setFileSystem(prev => [...prev, newNode]);
      handleFileOpen(newNode.id);
      return;
    }

    if (!parentDirHandle) {
      // No workspace — in-memory file
      const newNode: FileNode = {
        id: Math.random().toString(36).substr(2, 9),
        name: fileName,
        type: 'file',
        parentId: null,
        content: '* New ABAP file\n'
      };
      setFileSystem(prev => [...prev, newNode]);
      handleFileOpen(newNode.id);
      return;
    }

    try {
      // Create the physical file on disk
      const fileHandle = await parentDirHandle.getFileHandle(fileName, { create: true });
      
      // Write initial boilerplate content
      const initialContent = '* New ABAP file\n';
      const writable = await fileHandle.createWritable();
      await writable.write(initialContent);
      await writable.close();

      // SUCCESS: Now update React state
      const newFileId = Math.random().toString(36).substr(2, 9);
      const newNode: FileNode = {
        id: newFileId,
        name: fileName,
        type: 'file',
        parentId,
        content: initialContent
      };

      // Store the file handle for future reads
      fileHandleMap.current.set(newFileId, fileHandle);

      setFileSystem(prev => [...prev, newNode]);
      handleFileOpen(newFileId);

    } catch (err: unknown) {
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          alert('Permission denied. Please grant write access to the workspace folder.');
          return;
        }
      }
      console.error('File creation error:', err);
      alert(`Failed to create file "${fileName}". ${err instanceof Error ? err.message : 'Unknown error.'}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createFolderOnDisk = useCallback(async (parentId: string | null, folderName: string) => {
    const parentDirHandle = parentId ? dirHandleMap.current.get(parentId) : null;
    
    if (!parentDirHandle && parentId) {
      // No workspace open or parent folder not found — fall back to in-memory only
      const newNode: FileNode = {
        id: Math.random().toString(36).substr(2, 9),
        name: folderName,
        type: 'folder',
        parentId,
      };
      setFileSystem(prev => [...prev, newNode]);
      return;
    }

    if (!parentDirHandle) {
      // No workspace — in-memory folder
      const newNode: FileNode = {
        id: Math.random().toString(36).substr(2, 9),
        name: folderName,
        type: 'folder',
        parentId: null,
      };
      setFileSystem(prev => [...prev, newNode]);
      return;
    }

    try {
      // Create the physical folder on disk
      const dirHandle = await parentDirHandle.getDirectoryHandle(folderName, { create: true });
      
      // SUCCESS: Now update React state
      const newFolderId = Math.random().toString(36).substr(2, 9);
      const newNode: FileNode = {
        id: newFolderId,
        name: folderName,
        type: 'folder',
        parentId,
      };

      // Store the directory handle for future reads/writes
      dirHandleMap.current.set(newFolderId, dirHandle);

      setFileSystem(prev => [...prev, newNode]);
    } catch (err: unknown) {
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          alert('Permission denied. Please grant write access to the workspace folder.');
          return;
        }
      }
      console.error('Folder creation error:', err);
      alert(`Failed to create folder "${folderName}". ${err instanceof Error ? err.message : 'Unknown error.'}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lazy file content reader — single source of truth for opening tabs
  const handleFileOpen = useCallback(async (fileId: string) => {
    setActiveFileId(fileId);
    // Use functional updater to always check against the LATEST state
    setOpenFileIds(prev => prev.includes(fileId) ? prev : [...prev, fileId]);

    // Check if file content is already loaded
    const existingNode = fileSystem.find(n => n.id === fileId);
    if (existingNode?.content !== undefined) return;

    // Try to read from handle map
    const handle = fileHandleMap.current.get(fileId);
    if (!handle) return;

    try {
      const file = await handle.getFile();
      const text = await file.text();
      setFileSystem(prev => prev.map(node =>
        node.id === fileId ? { ...node, content: text } : node
      ));
    } catch (err) {
      console.error('Failed to read file:', err);
      setFileSystem(prev => prev.map(node =>
        node.id === fileId ? { ...node, content: `// Error: Could not read file contents` } : node
      ));
    }
  }, [fileSystem]);

  const activeNode = fileSystem.find(f => f.id === activeFileId);
  const code = activeNode?.content || '';

  // Keep refs in sync
  latestContentRef.current = code;
  latestActiveFileIdRef.current = activeFileId;

  // Save to disk function
  const saveToDisk = useCallback(async () => {
    const fileId = latestActiveFileIdRef.current;
    const content = latestContentRef.current;
    if (!fileId) return;

    // Skip if content hasn't changed since last save
    const lastSaved = lastSavedContentRef.current.get(fileId);
    if (lastSaved === content) {
      setSaveStatus('saved');
      return;
    }

    const handle = fileHandleMap.current.get(fileId);
    if (!handle) {
      // No file handle (in-memory file) — mark saved anyway
      setSaveStatus('saved');
      return;
    }

    try {
      setSaveStatus('saving...');
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      lastSavedContentRef.current.set(fileId, content);
      setSaveStatus('saved');
    } catch (err) {
      console.error('Auto-save failed:', err);
      setSaveStatus('unsaved');
    }
  }, []);

  const setCode = (newCode: string) => {
    setFileSystem(prev => prev.map(node => 
      node.id === activeFileId ? { ...node, content: newCode } : node
    ));

    // Mark unsaved and start debounce timer
    setSaveStatus('unsaved');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveToDisk();
    }, 1500);
  };

  const handleAction = useCallback(async (actionType: 'check' | 'run') => {
    if (!apiKey) {
      if (actionType === 'check') {
        setMarkers([{
          startLineNumber: 2,
          startColumn: 1,
          endLineNumber: 2,
          endColumn: 15,
          message: "Sample Syntax Error: Missing 'ENDCLASS' or invalid syntax.",
          severity: 8 // 8 = Error in Monaco
        }]);
        setIsLLMPanelOpen(true);
        setLlmOutput({ type: 'error', message: 'Local Linter Output: 1 Syntax Error found.' });
      } else {
        setIsSettingsOpen(true);
      }
      return;
    }

    setIsLLMPanelOpen(true);
    setLlmOutput({ type: 'info', message: actionType === 'check' ? 'ADT Backend: Checking Syntax...' : 'ADT Backend: Executing code...' });
    
    const result = await executeABAPSimulation(code, apiKey, actionType);
    
    setLlmOutput({
      type: result.type,
      message: result.message,
      data: result.data
    });
    
    setMarkers(result.markers || []);
  }, [apiKey, code]);

  // Keyboard bindings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'F2') {
        e.preventDefault();
        handleAction('check');
      } else if (e.ctrlKey && e.key === 'F3') {
        e.preventDefault();
        handleAction('check'); 
      } else if (e.key === 'F8') {
        e.preventDefault();
        handleAction('run');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleAction]);

  const closeTab = (e: React.MouseEvent, idToClose: string) => {
    e.stopPropagation();
    const newOpenIds = openFileIds.filter(id => id !== idToClose);
    setOpenFileIds(newOpenIds);
    if (activeFileId === idToClose) {
      setActiveFileId(newOpenIds.length > 0 ? newOpenIds[newOpenIds.length - 1] : '');
    }
  };

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--bg-primary)' }}>
      <header className="glass-panel" style={{ height: 'var(--header-height)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', borderBottom: '1px solid var(--border-color)', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
          >
            <Menu size={18} />
          </button>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 600, margin: 0, color: 'var(--accent-color)' }}>Nexus ABAP IDE</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => handleAction('run')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 14px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', border: 'none', background: 'var(--accent-color)', color: 'var(--text-primary)' }}
          >
            <Play size={14} fill="currentColor" /> Run
          </button>
          <button
            onClick={() => setIsSettingsOpen(true)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}
          >
            <Settings size={14} /> Config
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: '100%' }}>
        <PanelGroup direction="horizontal" autoSaveId="nexus-ide-layout">
          {isSidebarOpen && (
            <Panel id="sidebar" order={1} defaultSize={20} minSize={10} maxSize={50}>
              <Sidebar 
                fileSystem={fileSystem} 
                setFileSystem={setFileSystem} 
                activeFileId={activeFileId} 
                setActiveFileId={handleFileOpen}
                openFileIds={openFileIds}
                setOpenFileIds={setOpenFileIds}
                onOpenWorkspace={openWorkspace}
                onCreateFile={createFileOnDisk}
                onCreateFolder={createFolderOnDisk}
              />
            </Panel>
          )}
          
          {isSidebarOpen && <PanelResizeHandle className="resize-handle-horizontal" />}
          
          <Panel id="main-content" order={2}>
            <PanelGroup direction="vertical">
              <Panel id="editor-panel" order={1} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                
                {/* Editor Header: Tabs and Controls */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#1e1e1e', borderBottom: '1px solid var(--border-color)', height: '40px' }}>
                  
                  {/* Tabs */}
                  <div style={{ display: 'flex', height: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    {openFileIds.map(fId => {
                      const file = fileSystem.find(n => n.id === fId);
                      if (!file) return null;
                      const isActive = fId === activeFileId;
                      return (
                        <div 
                          key={fId}
                          onClick={() => setActiveFileId(fId)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '8px', padding: '0 16px', cursor: 'pointer',
                            background: isActive ? '#1e1e1e' : 'transparent',
                            color: isActive ? '#ffffff' : '#888',
                            borderRight: '1px solid #333',
                            borderTop: isActive ? '2px solid var(--accent-color)' : '2px solid transparent',
                            fontSize: '13px'
                          }}
                        >
                          {file.name}
                          <X 
                            size={14} 
                            onClick={(e) => closeTab(e, fId)} 
                            style={{ opacity: 0.6, cursor: 'pointer' }}
                            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Actions: Save Status + Theme Toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingRight: '16px' }}>
                    <span style={{ 
                      fontSize: '0.7rem', fontWeight: 500, padding: '2px 8px', borderRadius: '4px',
                      color: saveStatus === 'saved' ? '#4ade80' : saveStatus === 'saving...' ? '#facc15' : '#f87171',
                      background: saveStatus === 'saved' ? 'rgba(74,222,128,0.1)' : saveStatus === 'saving...' ? 'rgba(250,204,21,0.1)' : 'rgba(248,113,113,0.1)',
                    }}>
                      {saveStatus === 'saved' ? '✓ Saved' : saveStatus === 'saving...' ? '⏳ Saving...' : '● Unsaved'}
                    </span>
                    <button 
                      onClick={() => setTheme(t => t === 'light' ? 'nexus-dark' : 'light')}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#ddd' }}
                    >
                      {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
                    </button>
                  </div>
                </div>

                <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                  {isLayoutReady && activeNode ? (
                    <EditorArea code={code} setCode={setCode} markers={markers} theme={theme} />
                  ) : isLayoutReady && fileSystem.length === 0 ? (
                    <div style={{
                      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      background: '#1a1a2e', color: '#555', userSelect: 'none', gap: '20px'
                    }}>
                      <Code2 size={56} strokeWidth={1} style={{ color: 'var(--accent-color)', opacity: 0.35 }} />
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.3rem', fontWeight: 600, color: '#ccc', marginBottom: '8px' }}>Nexus ABAP IDE</div>
                        <div style={{ fontSize: '0.85rem', color: '#666' }}>Open a folder to get started</div>
                      </div>
                      <button
                        onClick={openWorkspace}
                        style={{
                          marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px',
                          padding: '10px 24px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600,
                          cursor: 'pointer', border: '1px solid rgba(59,130,246,0.3)',
                          background: 'rgba(59,130,246,0.1)', color: 'var(--accent-color)',
                          transition: 'background 0.2s, border-color 0.2s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(59,130,246,0.22)'; e.currentTarget.style.borderColor = 'var(--accent-color)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(59,130,246,0.1)'; e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)'; }}
                      >
                        <FolderInput size={16} /> Open Folder
                      </button>
                    </div>
                  ) : isLayoutReady && fileSystem.length > 0 ? (
                    <div style={{
                      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      background: 'var(--bg-primary)', color: '#888', userSelect: 'none', gap: '16px'
                    }}>
                      <Zap size={64} strokeWidth={1.5} color="white" fill="black" style={{ opacity: 0.8 }} />
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.4rem', fontWeight: 600, color: '#eaeaea', marginBottom: '8px' }}>Nexus IDE</div>
                        <div style={{ fontSize: '0.9rem', color: '#777' }}>Start learning ABAP from here</div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </Panel>
              
              {isLLMPanelOpen && <PanelResizeHandle className="resize-handle-vertical" />}
              {isLLMPanelOpen && (
                <Panel id="llm-panel" order={2} defaultSize={30} minSize={10} maxSize={80}>
                  <LLMPanel output={llmOutput} onClose={() => setIsLLMPanelOpen(false)} />
                </Panel>
              )}
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </div>

      <div className="glass-panel" style={{ height: 'var(--bottom-bar-height)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 16px', borderTop: '1px solid var(--border-color)', zIndex: 10, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Activity size={14} />
          <span>ADT Server</span>
        </div>
      </div>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        apiKey={apiKey} 
        setApiKey={setApiKey} 
      />
    </div>
  );
}

export default App;
