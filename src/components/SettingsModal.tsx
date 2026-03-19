import React, { useState } from 'react';
import { X } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  setApiKey: (key: string) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, apiKey, setApiKey }) => {
  const [tempKey, setTempKey] = useState(apiKey);

  if (!isOpen) return null;

  const handleSave = () => {
    setApiKey(tempKey);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div className="glass-panel" style={{ width: '400px', padding: '24px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.2rem', margin: 0 }}>IDE Preferences</h2>
          <X size={18} cursor="pointer" onClick={onClose} />
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Gemini API Key (Required for compiler & runtime):</label>
          <input 
            type="password" 
            value={tempKey} 
            onChange={(e) => setTempKey(e.target.value)}
            style={{ 
              padding: '8px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', 
              color: 'var(--text-primary)', borderRadius: '4px', outline: 'none' 
            }}
            placeholder="AIzaSy..."
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
          <button onClick={onClose} style={{ padding: '6px 12px', borderRadius: '4px', fontSize: '0.9rem' }}>Cancel</button>
          <button onClick={handleSave} style={{ background: 'var(--accent-color)', padding: '6px 16px', borderRadius: '4px', fontSize: '0.9rem', fontWeight: 500 }}>Save</button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
