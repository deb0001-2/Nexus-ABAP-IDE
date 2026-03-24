import { useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

interface QuickExamProps {
  userLevel: number;
  onPass: () => void;
}

export default function QuickExam({ userLevel, onPass }: QuickExamProps) {
  const [selected, setSelected] = useState('');
  const [result, setResult] = useState<'idle' | 'correct' | 'incorrect'>('idle');

  const handleSubmit = () => {
    if (selected === 'b') {
      setResult('correct');
      if (userLevel === 0) {
        onPass(); // Trigger level up!
      }
    } else {
      setResult('incorrect');
    }
  };

  return (
    <div style={{ padding: '16px', color: 'var(--text-primary)', background: 'rgba(0,0,0,0.1)' }}>
      <h2 style={{ marginBottom: '16px', color: 'var(--accent-color)', fontSize: '1.1rem' }}>Knowledge Check</h2>
      
      <div style={{ padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
        <p style={{ fontSize: '0.95rem', marginBottom: '16px', fontWeight: 500 }}>
          Who created the ABAP language?
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px', fontSize: '0.9rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input type="radio" name="q1" value="a" checked={selected === 'a'} onChange={(e) => setSelected(e.target.value)} /> 
            Microsoft
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input type="radio" name="q1" value="b" checked={selected === 'b'} onChange={(e) => setSelected(e.target.value)} /> 
            SAP
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input type="radio" name="q1" value="c" checked={selected === 'c'} onChange={(e) => setSelected(e.target.value)} /> 
            Oracle
          </label>
        </div>

        <button 
          onClick={handleSubmit}
          disabled={!selected}
          style={{ 
            padding: '8px 16px', 
            background: 'var(--accent-color)', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: selected ? 'pointer' : 'not-allowed',
            fontWeight: 600,
            fontSize: '0.85rem',
            opacity: selected ? 1 : 0.6,
            width: '100%'
          }}
        >
          Submit Answer
        </button>

        {result === 'correct' && (
          <div style={{ background: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.3)', padding: '12px', borderRadius: '6px', color: '#4ade80', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
              <CheckCircle2 size={16} /> Correct!
            </div>
            {userLevel === 0 && (
              <div>🎉 <strong>Level Up!</strong></div>
            )}
          </div>
        )}
        
        {result === 'incorrect' && (
          <div style={{ color: '#f87171', marginTop: '16px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500, fontSize: '0.85rem' }}>
            <XCircle size={16} /> Incorrect. Try again.
          </div>
        )}
      </div>
    </div>
  );
}
