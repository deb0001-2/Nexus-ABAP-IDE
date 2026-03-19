import React from 'react';
import { X, Sparkles, TerminalSquare, AlertCircle, CheckCircle2 } from 'lucide-react';

interface LLMOutput {
  type: 'info' | 'error' | 'success';
  message: string;
  data?: any;
}

interface LLMPanelProps {
  output: LLMOutput | null;
  onClose: () => void;
}

const LLMPanel: React.FC<LLMPanelProps> = ({ output, onClose }) => {
  return (
    <div className="glass-panel animate-fade-in" style={{ 
      height: '100%', 
      borderTop: 'none',
      borderLeft: 'none', borderRight: 'none', borderBottom: 'none',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '8px 16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        background: 'rgba(0, 0, 0, 0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          <Sparkles size={14} color="var(--accent-color)" />
          LLM EXECUTION ENGINE
        </div>
        <button onClick={onClose} style={{ color: 'var(--text-secondary)', padding: '4px' }}>
          <X size={16} />
        </button>
      </div>
      
      {/* Content */}
      <div style={{ padding: '16px', flex: 1, overflowY: 'auto', fontFamily: "'Fira Code', monospace", fontSize: '0.9rem' }}>
        {!output ? (
          <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Awaiting execution...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* Output Type Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', 
              color: output.type === 'error' ? 'var(--error-color)' : 
                     output.type === 'success' ? 'var(--success-color)' : 'var(--accent-hover)' 
            }}>
              {output.type === 'error' ? <AlertCircle size={16} /> : 
               output.type === 'success' ? <CheckCircle2 size={16} /> : <TerminalSquare size={16} />}
              <span style={{ fontWeight: 600 }}>{output.message}</span>
            </div>
            
            {/* Details */}
            {output.data && (
              <div style={{ 
                background: 'rgba(0, 0, 0, 0.3)', 
                padding: '12px', 
                borderRadius: '6px', 
                borderLeft: `2px solid ${output.type === 'error' ? 'var(--error-color)' : 'var(--success-color)'}`,
                color: 'var(--text-primary)',
                whiteSpace: 'pre-wrap'
              }}>
                {typeof output.data === 'string' ? output.data : JSON.stringify(output.data, null, 2)}
              </div>
            )}
            
          </div>
        )}
      </div>
    </div>
  );
};

export default LLMPanel;
