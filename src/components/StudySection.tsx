import { useState } from 'react';
import { BookOpen, ChevronRight, ChevronDown } from 'lucide-react';
import { LEVEL_FOLDERS } from '../data/lessons';

interface StudySectionProps {
  userLevel: number;
  onSelectLesson: (id: string) => void;
}

export default function StudySection({ userLevel, onSelectLesson }: StudySectionProps) {
  const [expandedFolders, setExpandedFolders] = useState<number[]>([userLevel]);

  const toggleFolder = (level: number) => {
    if (expandedFolders.includes(level)) {
      setExpandedFolders(expandedFolders.filter(l => l !== level));
    } else {
      setExpandedFolders([...expandedFolders, level]);
    }
  };

  const visibleFolders = LEVEL_FOLDERS.filter(f => f.level <= userLevel);

  return (
    <div style={{ padding: '16px', color: 'var(--text-primary)', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-color)', marginBottom: '20px', fontSize: '1.2rem', flexShrink: 0 }}>
        <BookOpen size={20} /> 
        Study Materials
      </h2>
      
      {/* Accordion Menu */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0, marginBottom: '20px' }}>
        {visibleFolders.map((folder) => {
          const isExpanded = expandedFolders.includes(folder.level);
          return (
            <div key={folder.level} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
              <button 
                onClick={() => toggleFolder(folder.level)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: isExpanded ? 'rgba(255,255,255,0.05)' : 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem' }}
              >
                {folder.title}
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              
              {isExpanded && (
                <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.2)', padding: '6px' }}>
                  {folder.lessons.map(lesson => (
                    <button
                      key={lesson.id}
                      onClick={() => onSelectLesson(lesson.id)}
                      style={{
                        padding: '8px 12px',
                        textAlign: 'left',
                        background: 'transparent',
                        color: 'var(--text-secondary)',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                    >
                      {lesson.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  );
}
