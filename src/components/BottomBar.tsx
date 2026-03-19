import React from 'react';
import { Play, Activity, Settings } from 'lucide-react';

interface BottomBarProps {
  onRun: () => void;
  onOpenSettings: () => void;
}

const BottomBar: React.FC<BottomBarProps> = ({ onRun, onOpenSettings }) => {
  const btnStyle = {
    display: 'flex', alignItems: 'center', gap: '6px', 
    padding: '4px 12px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600,
    cursor: 'pointer', border: '1px solid var(--border-color)', background: 'transparent',
    color: 'var(--text-primary)'
  };

  return (
    <div className="glass-panel" style={{ 
      height: 'var(--bottom-bar-height)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 16px', borderTop: '1px solid var(--border-color)', borderBottom: 'none', borderLeft: 'none', borderRight: 'none', zIndex: 10
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button 
          onClick={onRun}
          style={{ 
            ...btnStyle,
            background: 'var(--accent-color)', 
            border: 'none',
          }}
        >
          <Play size={14} fill="currentColor" /> F8 (Run)
        </button>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={onOpenSettings}>
          <Settings size={14} />
          <span>Config</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Activity size={14} />
          <span>ADT Server</span>
        </div>
      </div>
    </div>
  );
};

export default BottomBar;
