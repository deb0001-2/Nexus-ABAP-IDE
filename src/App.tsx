import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Moon, Sun, Menu, Play, Settings, Activity, FolderInput, Code2, Zap, Camera, Download, Files, BookOpen } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import Sidebar from './components/Sidebar';
import EditorArea from './components/EditorArea';
import LLMPanel from './components/LLMPanel';
import SettingsModal from './components/SettingsModal';
import StudySection from './components/StudySection';
import LessonViewer from './components/LessonViewer';
import { getLessonById } from './data/lessons';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { executeABAPSimulation } from './services/llm';
import type { FileNode } from './types';
import './index.css';

function App() {
  const [fileSystem, setFileSystem] = useState<FileNode[]>([]);
  const [activeFileId, setActiveFileId] = useState<string>('');
  const [openFileIds, setOpenFileIds] = useState<string[]>([]);
  const [theme, setTheme] = useState<'nexus-dark' | 'light'>('nexus-dark');
  const [isLLMPanelOpen, setIsLLMPanelOpen] = useState<boolean>(false);
  const [userLevel] = useState<number>(0);
  const [activeSidebar, setActiveSidebar] = useState<'files' | 'study' | 'none'>('files');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [llmOutput, setLlmOutput] = useState<{ type: 'info' | 'error' | 'success'; message: string; data?: any } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [markers, setMarkers] = useState<any[]>([]);
  const [apiKey, setApiKey] = useState<string>(localStorage.getItem('gemini_api_key') || '');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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

  const editorCaptureRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // Sync API Key to Local Storage
  useEffect(() => {
    localStorage.setItem('gemini_api_key', apiKey);
  }, [apiKey]);

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

  const handleCapture = async () => {
    if (!editorCaptureRef.current) return;
    setIsCapturing(true);
    
    // Give state time to update and render the watermark
    setTimeout(async () => {
      try {
        const canvas = await html2canvas(editorCaptureRef.current!, {
          backgroundColor: theme === 'light' ? '#ffffff' : '#1e1e1e',
          scale: 2,
          logging: false,
          useCORS: true
        });
        
        const link = document.createElement('a');
        link.download = 'nexus-code-snippet.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
      } catch (err) {
        console.error('Capture failed:', err);
        alert('Failed to capture code snippet.');
      } finally {
        setIsCapturing(false);
      }
    }, 150);
  };

  const handleDownloadCode = () => {
    if (!activeNode || code === undefined) return;
    
    // Initialize a new PDF document
    const doc = new jsPDF();
    
    // Set a monospace font for code readability
    doc.setFont("courier", "normal");
    doc.setFontSize(10);
    
    // Add a simple header for the file name
    const fileName = activeNode.name || 'nexus-code';
    doc.text(`File: ${fileName}`, 10, 10);
    doc.line(10, 12, 200, 12); // Draw a line under the header
    
    // Split the raw code into an array of individual lines
    const lines = code.split('\n');
    
    let y = 20; // Starting Y position for the code
    const lineHeight = 5; // Height of each line
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Loop through each line and write it to the PDF, handling pagination
    lines.forEach((line) => {
      // If the text reaches the bottom margin, create a new page
      if (y > pageHeight - 15) {
        doc.addPage();
        y = 15; // Reset Y position for the new page
      }
      
      // Prevent long lines from running off the right edge (optional word wrap)
      // For basic formatting, we'll just truncate or let it run off. 
      // jsPDF has splitTextToSize if we want strict wrapping.
      const splitLines = doc.splitTextToSize(line, 190); 
      
      splitLines.forEach((splitLine: string) => {
        if (y > pageHeight - 15) {
          doc.addPage();
          y = 15;
        }
        doc.text(splitLine, 10, y);
        y += lineHeight;
      });
    });
    
    // Trigger the PDF download
    const pdfName = fileName.replace(/\.[^/.]+$/, "") + '.pdf';
    doc.save(pdfName);
  };

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--bg-primary)' }}>
      <header className="glass-panel" style={{ width: '100%', height: 'var(--header-height)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', borderBottom: '1px solid var(--border-color)', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 600, margin: 0, color: 'var(--accent-color)' }}>Nexus ABAP IDE</h1>
          <span style={{ 
            color: '#ffffff', 
            fontSize: '1.05rem', 
            fontWeight: 'bold'
          }}>
            Level: {userLevel}
          </span>
        </div>
       <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <>
              <button
                onClick={handleDownloadCode}
                disabled={!activeNode}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 14px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, cursor: !activeNode ? 'not-allowed' : 'pointer', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', transition: 'background 0.2s', opacity: !activeNode ? 0.5 : 1 }}
              >
                <Download size={14} /> Download 💾
              </button>
              <button
                onClick={handleCapture}
                disabled={isCapturing}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 14px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, cursor: isCapturing ? 'wait' : 'pointer', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', transition: 'background 0.2s' }}
              >
                <Camera size={14} /> {isCapturing ? 'Capturing...' : 'Share 📸'}
              </button>
              <button
                onClick={() => handleAction('run')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 14px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', border: 'none', background: 'var(--accent-color)', color: 'var(--text-primary)' }}
              >
                <Play size={14} fill="currentColor" /> Run
              </button>
            </>
          <button
            onClick={() => setIsSettingsOpen(true)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}
          >
            <Settings size={14} /> Config
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', flexDirection: 'row', flex: 1, overflow: 'hidden' }}>
        {/* Activity Bar (Thin Left Sidebar) */}
        <div style={{ width: '48px', background: 'var(--bg-secondary)', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0', gap: '16px', zIndex: 20 }}>
          <button 
            onClick={() => setIsSidebarOpen(prev => !prev)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: isSidebarOpen ? 'var(--text-primary)' : 'var(--text-secondary)', transition: 'color 0.2s' }}
            title="Toggle Sidebar"
          >
            <Menu size={22} />
          </button>
          
          <button 
            onClick={() => setActiveSidebar(prev => prev === 'files' ? 'none' : 'files')}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: activeSidebar === 'files' ? 'var(--text-primary)' : 'var(--text-secondary)', position: 'relative', display: 'flex', justifyContent: 'center', width: '100%' }}
            title="Explorer"
          >
            <Files size={22} />
            {activeSidebar === 'files' && <div style={{ position: 'absolute', left: '0px', top: '-4px', bottom: '-4px', width: '2px', background: 'var(--accent-color)' }} />}
          </button>
          
          <button 
            onClick={() => setActiveSidebar(prev => prev === 'study' ? 'none' : 'study')}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: activeSidebar === 'study' ? 'var(--text-primary)' : 'var(--text-secondary)', position: 'relative', display: 'flex', justifyContent: 'center', width: '100%' }}
            title="Study"
          >
            <BookOpen size={22} />
            {activeSidebar === 'study' && <div style={{ position: 'absolute', left: '0px', top: '-4px', bottom: '-4px', width: '2px', background: 'var(--accent-color)' }} />}
          </button>
        </div>

        <style>{`
          .sidebar-panel-container {
            transition: flex 0.3s ease-in-out, width 0.3s ease-in-out !important;
          }
          .sidebar-hidden {
            flex: 0 0 0px !important;
            min-width: 0px !important;
            width: 0px !important;
            overflow: hidden !important;
          }
        `}</style>
        
        <PanelGroup direction="horizontal" autoSaveId="nexus-ide-layout">
          {activeSidebar !== 'none' && (
            <Panel 
              id="sidebar" 
              order={1} 
              defaultSize={20} 
              minSize={15} 
              maxSize={40}
              className={`sidebar-panel-container ${!isSidebarOpen ? 'sidebar-hidden' : ''}`}
            >
              <div style={{ width: '100%', height: '100%', minWidth: '200px', display: 'flex', flexDirection: 'column' }}>
                {activeSidebar === 'files' && (
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
                )}
                {activeSidebar === 'study' && (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-secondary)', borderRight: '1px solid var(--border-color)' }}>
                    <StudySection userLevel={userLevel} onSelectLesson={(id) => handleFileOpen(id)} />
                  </div>
                )}
              </div>
            </Panel>
          )}
          
          {activeSidebar !== 'none' && (
            <PanelResizeHandle 
              className="resize-handle-horizontal" 
              style={{
                width: isSidebarOpen ? undefined : '0px',
                opacity: isSidebarOpen ? 1 : 0,
                pointerEvents: isSidebarOpen ? 'auto' : 'none',
                transition: 'opacity 0.3s ease-in-out, width 0.3s ease-in-out'
              }} 
            />
          )}
          
          <Panel id="main-content" order={2}>
            <PanelGroup direction="vertical">
              <Panel id="editor-panel" order={1} style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-primary)' }}>
                {/* Editor is strictly always rendered */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#1e1e1e', borderBottom: '1px solid var(--border-color)', height: '40px' }}>                  {/* Tabs */}
                  <div style={{ display: 'flex', height: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    {openFileIds.map(tabId => {
                      const file = fileSystem.find(f => f.id === tabId);
                      const lesson = getLessonById(tabId);
                      if (!file && !lesson) return null;
                      
                      const isActive = activeFileId === tabId;
                      const title = file ? file.name : (lesson ? lesson.title : '');
                      
                      return (
                        <div 
                          key={tabId}
                          onClick={() => handleFileOpen(tabId)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '0 16px',
                            height: '100%',
                            background: isActive ? 'var(--bg-primary)' : 'rgba(0,0,0,0.2)',
                            borderRight: '1px solid var(--border-color)',
                            borderTop: isActive ? '2px solid var(--accent-color)' : '2px solid transparent',
                            cursor: 'pointer',
                            color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                            minWidth: '120px',
                            position: 'relative',
                            userSelect: 'none'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', flex: 1, overflow: 'hidden' }}>
                            <span style={{ 
                              display: 'inline-block', 
                              width: '8px', 
                              height: '8px', 
                              borderRadius: '50%', 
                              background: (saveStatus === 'unsaved' && activeFileId === tabId) ? 'var(--accent-color)' : 'transparent',
                              marginRight: '6px'
                            }} />
                            {lesson && <BookOpen size={14} color="var(--accent-color)" style={{ marginRight: '6px' }} />}
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.85rem' }}>
                              {title}
                            </span>
                          </div>
                          
                          <button 
                            onClick={(e) => closeTab(e, tabId)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer',
                              padding: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '4px',
                              transition: 'background 0.2s',
                              marginLeft: '8px'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <X size={14} />
                          </button>
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

                <div ref={editorCaptureRef} style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative', background: theme === 'light' ? '#ffffff' : '#1e1e1e' }}>
                  {activeFileId ? (
                    (() => {
                      const activeLesson = getLessonById(activeFileId);
                      if (activeLesson) {
                        return <LessonViewer lessonId={activeFileId} />;
                      }
                      
                      const activeFileItem = fileSystem.find(f => f.id === activeFileId);
                      if (activeFileItem) {
                        return <EditorArea code={activeFileItem.content || ''} setCode={setCode} markers={markers} theme={theme} />;
                      }
                      
                      return (
                        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                          <Code2 size={64} style={{ opacity: 0.1, marginBottom: '24px' }} />
                          <p>File or Lesson not found</p>
                        </div>
                      );
                    })()
                  ) : fileSystem.length === 0 ? (
                    <div style={{
                      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      background: 'var(--bg-primary)', color: '#555', userSelect: 'none', gap: '20px'
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
                  ) : (
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
                  )}
                  
                  {isCapturing && (
                    <div style={{ position: 'absolute', bottom: '20px', right: '20px', fontSize: '14px', color: theme === 'light' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.4)', fontFamily: 'sans-serif', pointerEvents: 'none', zIndex: 100, fontWeight: 500, userSelect: 'none' }}>
                      Made with Nexus IDE
                    </div>
                   )}
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
