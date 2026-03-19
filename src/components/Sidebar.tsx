import React, { useState } from 'react';
import { Files, FolderOpen, FileCode, ChevronDown, Trash2, FilePlus, FolderPlus, FolderInput } from 'lucide-react';
import type { FileNode } from '../types';

interface SidebarProps {
  fileSystem: FileNode[];
  setFileSystem: React.Dispatch<React.SetStateAction<FileNode[]>>;
  activeFileId: string;
  setActiveFileId: (id: string) => void;
  openFileIds: string[];
  setOpenFileIds: React.Dispatch<React.SetStateAction<string[]>>;
  onOpenWorkspace: () => void;
  onCreateFile: (parentId: string | null, fileName: string) => void;
  onCreateFolder: (parentId: string | null, folderName: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ fileSystem, setFileSystem, activeFileId, setActiveFileId, openFileIds, setOpenFileIds, onOpenWorkspace, onCreateFile, onCreateFolder }) => {
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);

  const handleAddNode = (e: React.MouseEvent, type: 'file' | 'folder', parentId: string | null) => {
    e.stopPropagation();
    const name = type === 'file' ? prompt('Enter file name (e.g., new_file.abap):') : prompt('Enter folder name:');
    if (!name) return;

    if (type === 'file') {
      onCreateFile(parentId, name);
    } else {
      onCreateFolder(parentId, name);
    }
  };

  const getRootFolderId = () => {
    const rootFolder = fileSystem.find(n => n.parentId === null && n.type === 'folder');
    return rootFolder ? rootFolder.id : null;
  };

  const handleDeleteNode = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this?')) return;
    
    // Recursive delete helper could be added here, but simple filter works for now if we assume user edits are shallow
    setFileSystem(prev => prev.filter(n => n.id !== id && n.parentId !== id));
    
    const newOpenIds = openFileIds.filter(fid => fid !== id);
    if (newOpenIds.length !== openFileIds.length) {
      setOpenFileIds(newOpenIds);
    }

    if (activeFileId === id) {
      setActiveFileId(newOpenIds.length > 0 ? newOpenIds[newOpenIds.length - 1] : '');
    }
  };

  // Render tree recursively
  const renderTree = (parentId: string | null = null, depth: number = 0) => {
    const nodes = fileSystem.filter(n => n.parentId === parentId);
    
    return nodes.map(node => (
      <div key={node.id} style={{ marginBottom: node.type === 'folder' ? '4px' : '0' }}>
        <div 
          className="tree-node"
          onClick={() => {
            if (node.type === 'file') {
              setActiveFileId(node.id);
            } else if (node.type === 'folder') {
              setExpandedFolders(prev => 
                prev.includes(node.id) ? prev.filter(id => id !== node.id) : [...prev, node.id]
              );
            }
          }}
          style={{ 
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
            padding: `6px 8px 6px ${depth * 14 + 8}px`, 
            cursor: 'pointer', 
            borderRadius: '4px',
            color: activeFileId === node.id ? 'var(--accent-hover)' : 'var(--text-secondary)',
            background: activeFileId === node.id ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {node.type === 'folder' ? (
              <>
                <ChevronDown 
                  size={14} 
                  style={{ 
                    transform: expandedFolders.includes(node.id) ? 'rotate(0deg)' : 'rotate(-90deg)',
                    transition: 'transform 0.2s'
                  }} 
                />
                <FolderOpen size={16} color="var(--accent-color)" />
              </>
            ) : (
              <FileCode size={14} />
            )}
            <span style={{ fontSize: '0.85rem' }}>{node.name}</span>
          </div>

          {/* Action Icons */}
          <div className="action-icons" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {node.type === 'folder' && node.parentId !== null && (
              <>
                <FilePlus size={14} onClick={(e) => handleAddNode(e, 'file', node.id)} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} />
                <FolderPlus size={14} onClick={(e) => handleAddNode(e, 'folder', node.id)} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} />
              </>
            )}
            {node.parentId !== null && (
              <Trash2 size={14} onClick={(e) => handleDeleteNode(e, node.id)} style={{ cursor: 'pointer', color: 'var(--error-color)' }} />
            )}
          </div>
        </div>
        
        {/* Render children if folder and tracking expandedFolders array securely */}
        {node.type === 'folder' && expandedFolders.includes(node.id) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
            {renderTree(node.id, depth + 1)}
          </div>
        )}
      </div>
    ));
  };

  return (
    <div className="glass-panel" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border-color)', borderTop: 'none', borderBottom: 'none' }}>
      <style>{`
        .tree-node .action-icons { opacity: 0; pointer-events: none; transition: opacity 0.1s ease; }
        .tree-node:hover { background: rgba(255, 255, 255, 0.05) !important; }
        .tree-node:hover .action-icons { opacity: 1; pointer-events: auto; }
      `}</style>
      
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Files size={16} />
          EXPLORER
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {fileSystem.length > 0 && (
            <>
              <FolderPlus size={14} style={{ cursor: 'pointer' }} onClick={(e) => handleAddNode(e, 'folder', getRootFolderId())} />
              <FilePlus size={14} style={{ cursor: 'pointer' }} onClick={(e) => handleAddNode(e, 'file', getRootFolderId())} />
            </>
          )}
        </div>
      </div>

      {/* Open Folder Button */}
      {fileSystem.length === 0 && (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)' }}>
          <button
            onClick={onOpenWorkspace}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '8px 12px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600,
              cursor: 'pointer', border: '1px dashed var(--border-color)', 
              background: 'rgba(59, 130, 246, 0.08)', color: 'var(--accent-color)',
              transition: 'background 0.2s, border-color 0.2s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.18)'; e.currentTarget.style.borderColor = 'var(--accent-color)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.08)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
          >
            <FolderInput size={16} /> Open Folder
          </button>
        </div>
      )}
      
      <div style={{ padding: '8px', flex: 1, overflowY: 'auto' }}>
        {fileSystem.length === 0 ? (
          <div style={{ padding: '16px 8px', textAlign: 'center', color: '#555', fontSize: '0.8rem', lineHeight: 1.6 }}>
            No workspace selected.
          </div>
        ) : (
          renderTree()
        )}
      </div>
    </div>
  );
};

export default Sidebar;
