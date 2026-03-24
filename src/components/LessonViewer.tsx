import { getLessonById } from '../data/lessons';
import { BookOpen } from 'lucide-react';

interface LessonViewerProps {
  lessonId: string;
}

export default function LessonViewer({ lessonId }: LessonViewerProps) {
  const lesson = getLessonById(lessonId);

  if (!lesson) {
    return (
      <div style={{ padding: '40px', color: 'var(--text-primary)', display: 'flex', justifyContent: 'center' }}>
        Lesson not found.
      </div>
    );
  }

  return (
    <div style={{ padding: '40px', color: 'var(--text-primary)', height: '100%', overflowY: 'auto', background: 'var(--bg-primary)' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--accent-color)', marginBottom: '24px', fontSize: '1.8rem' }}>
          <BookOpen size={28} />
          {lesson.title}
        </h2>
        
        {lesson.id === 'l0-1' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '40px' }}>
            {/* Section 0 */}
            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '28px', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              <h3 style={{ color: '#ffffff', marginBottom: '16px', fontSize: '1.5rem', fontWeight: 600 }}>What is SAP?</h3>
              <p style={{ lineHeight: '1.8', fontSize: '1.1rem', color: '#e2e8f0' }}>
                SAP stands for <strong style={{ color: '#ffffff' }}>Systems, Applications, and Products in Data Processing</strong>. It is a powerful software suite (called an <strong style={{ color: '#ffffff' }}>ERP</strong>) that allows large companies to manage all their business activities—like <strong style={{ color: '#ffffff' }}>sales, finance, and human resources</strong>—in one single, centralized system.
              </p>
            </div>

            {/* Section 1 */}
            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '28px', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              <h3 style={{ color: '#ffffff', marginBottom: '16px', fontSize: '1.5rem', fontWeight: 600 }}>What is ABAP?</h3>
              <p style={{ lineHeight: '1.8', fontSize: '1.1rem', color: '#e2e8f0', marginBottom: '16px' }}>
                ABAP stands for Advanced Business Application Programming. It is a programming language created by a massive German software company called SAP.
              </p>
              <p style={{ lineHeight: '1.8', fontSize: '1.1rem', color: '#e2e8f0', marginBottom: '16px' }}>
                To understand it in simple terms, think of a brand-new smartphone. When you buy it, it comes with standard apps like a camera, a calculator, and a calendar. But what if you want a very specific app, like a custom fitness tracker? You would need a programmer to build that app using a specific coding language.
              </p>
              <p style={{ lineHeight: '1.8', fontSize: '1.1rem', color: '#e2e8f0' }}>
                Similarly, SAP sells massive software systems that help large companies manage their entire business (finance, human resources, inventory, etc.). This software comes with standard, pre-built features. ABAP is the coding language used to build custom features, reports, or tweaks inside that SAP system when the standard features aren't exactly what the company needs.
              </p>
            </div>

            {/* Section 2 */}
            <div style={{ background: 'rgba(59,130,246,0.05)', padding: '28px', borderRadius: '12px', border: '1px solid rgba(59,130,246,0.2)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              <h3 style={{ color: '#ffffff', marginBottom: '16px', fontSize: '1.5rem', fontWeight: 600 }}>What is the Purpose of ABAP?</h3>
              <p style={{ lineHeight: '1.8', fontSize: '1.1rem', color: '#e2e8f0', marginBottom: '16px' }}>
                The main purpose of ABAP is customization and enhancement. Every business operates a little differently. A shoe manufacturer in India might calculate their taxes or track their materials differently than a car manufacturer in Germany. Because SAP's standard software cannot perfectly match every single company's unique rules, ABAP exists to bridge that gap.
              </p>
              <p style={{ lineHeight: '1.8', fontSize: '1.1rem', color: '#e2e8f0', marginBottom: '12px', fontWeight: 500 }}>
                Programmers use ABAP to:
              </p>
              <ul style={{ lineHeight: '1.8', fontSize: '1.1rem', color: '#e2e8f0', paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <li><strong style={{ color: '#ffffff' }}>Create custom reports:</strong> Gathering specific data from the system (e.g., "Show me all the laptops sold in West Bengal last month").</li>
                <li><strong style={{ color: '#ffffff' }}>Build new interfaces:</strong> Making SAP talk to other software (like a bank's payment system or a web-based code editor).</li>
                <li><strong style={{ color: '#ffffff' }}>Design printed forms:</strong> Creating custom layouts for invoices, receipts, or shipping labels.</li>
                <li><strong style={{ color: '#ffffff' }}>Add custom logic:</strong> Changing how the system behaves (e.g., stopping a user from saving an order if a specific field is left blank).</li>
              </ul>
            </div>

            {/* Section 3 */}
            <div style={{ background: 'rgba(168,85,247,0.05)', padding: '28px', borderRadius: '12px', border: '1px solid rgba(168,85,247,0.2)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              <h3 style={{ color: '#ffffff', marginBottom: '16px', fontSize: '1.5rem', fontWeight: 600 }}>A Simple Real-World Example</h3>
              <p style={{ lineHeight: '1.8', fontSize: '1.1rem', color: '#e2e8f0', marginBottom: '20px' }}>
                Imagine a large retail company that uses SAP to manage its warehouses.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #94a3b8' }}>
                  <strong style={{ color: '#ffffff', display: 'block', marginBottom: '6px', fontSize: '1.15rem' }}>The Standard System</strong>
                  <span style={{ color: '#e2e8f0', fontSize: '1.05rem', lineHeight: '1.6' }}>SAP keeps track of how many boxes of a product are on the shelf.</span>
                </div>

                <div style={{ background: 'rgba(239,68,68,0.1)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
                  <strong style={{ color: '#ffffff', display: 'block', marginBottom: '6px', fontSize: '1.15rem' }}>The Problem</strong>
                  <span style={{ color: '#e2e8f0', fontSize: '1.05rem', lineHeight: '1.6' }}>The warehouse manager wants a special email alert sent to their phone whenever the stock of a highly popular item drops below 50 units. The standard SAP system doesn't have this specific email alert built-in.</span>
                </div>

                <div style={{ background: 'rgba(34,197,94,0.1)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #22c55e' }}>
                  <strong style={{ color: '#ffffff', display: 'block', marginBottom: '6px', fontSize: '1.15rem' }}>The ABAP Solution</strong>
                  <span style={{ color: '#e2e8f0', fontSize: '1.05rem', lineHeight: '1.6' }}>A programmer writes a small piece of ABAP code. This code constantly checks the inventory numbers in the database. If the number drops to 49, the ABAP code automatically triggers the system to send an email to the manager.</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '24px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '40px' }}>
            <p style={{ lineHeight: '1.8', fontSize: '1.1rem', color: '#e2e8f0', whiteSpace: 'pre-wrap' }}>
              {lesson.content}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
