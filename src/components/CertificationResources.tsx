import React, { useState } from 'react';
import {
  DOMAIN_INFO,
  KEY_COMMANDS,
  QUICK_REFERENCE,
  DOCUMENTATION_LINKS,
  getExamTips,
  generateStudyGuide,
  generateQuickRefSheet,
  type DomainId,
  type ExamTip,
} from '../utils/certificationResources';

interface CertificationResourcesProps {
  onClose?: () => void;
}

type ViewMode = 'overview' | 'domain' | 'tips' | 'quickref' | 'docs';

const DOMAIN_ORDER: DomainId[] = ['domain1', 'domain2', 'domain3', 'domain4', 'domain5'];

const CATEGORY_COLORS: Record<string, string> = {
  command: '#4CAF50',
  concept: '#2196F3',
  procedure: '#FF9800',
  gotcha: '#F44336',
};

export const CertificationResources: React.FC<CertificationResourcesProps> = ({
  onClose,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [selectedDomain, setSelectedDomain] = useState<DomainId | null>(null);

  const handleDomainSelect = (domain: DomainId) => {
    setSelectedDomain(domain);
    setViewMode('domain');
  };

  const handleCopyStudyGuide = () => {
    if (selectedDomain) {
      const guide = generateStudyGuide(selectedDomain);
      navigator.clipboard.writeText(guide);
      alert('Study guide copied to clipboard!');
    }
  };

  const handleCopyQuickRef = () => {
    const sheet = generateQuickRefSheet();
    navigator.clipboard.writeText(sheet);
    alert('Quick reference sheet copied to clipboard!');
  };

  // Navigation tabs
  const renderTabs = () => (
    <div style={styles.tabs}>
      <button
        onClick={() => setViewMode('overview')}
        style={{
          ...styles.tab,
          ...(viewMode === 'overview' ? styles.tabActive : {}),
        }}
      >
        Overview
      </button>
      <button
        onClick={() => setViewMode('tips')}
        style={{
          ...styles.tab,
          ...(viewMode === 'tips' ? styles.tabActive : {}),
        }}
      >
        Exam Tips
      </button>
      <button
        onClick={() => setViewMode('quickref')}
        style={{
          ...styles.tab,
          ...(viewMode === 'quickref' ? styles.tabActive : {}),
        }}
      >
        Quick Reference
      </button>
      <button
        onClick={() => setViewMode('docs')}
        style={{
          ...styles.tab,
          ...(viewMode === 'docs' ? styles.tabActive : {}),
        }}
      >
        Documentation
      </button>
    </div>
  );

  // Overview with domain cards
  const renderOverview = () => (
    <div style={styles.content}>
      <h3 style={styles.sectionTitle}>Exam Domains</h3>
      <p style={styles.subtitle}>
        Click on a domain to view study materials, key commands, and tips.
      </p>
      <div style={styles.domainGrid}>
        {DOMAIN_ORDER.map(domainId => {
          const domain = DOMAIN_INFO[domainId];
          return (
            <div
              key={domainId}
              style={styles.domainCard}
              onClick={() => handleDomainSelect(domainId)}
            >
              <div style={styles.domainHeader}>
                <span style={styles.domainWeight}>{domain.weight}%</span>
                <span style={styles.domainNumber}>
                  {domainId.replace('domain', 'Domain ')}
                </span>
              </div>
              <h4 style={styles.domainName}>{domain.name}</h4>
              <p style={styles.domainDescription}>{domain.description}</p>
              <div style={styles.domainStats}>
                <span>{domain.objectives.length} objectives</span>
                <span>{KEY_COMMANDS[domainId].length} key commands</span>
              </div>
            </div>
          );
        })}
      </div>

      <div style={styles.weightChart}>
        <h4>Exam Weight Distribution</h4>
        <div style={styles.weightBar}>
          {DOMAIN_ORDER.map(domainId => {
            const domain = DOMAIN_INFO[domainId];
            return (
              <div
                key={domainId}
                style={{
                  ...styles.weightSegment,
                  width: `${domain.weight}%`,
                  backgroundColor: getWeightColor(domain.weight),
                }}
                title={`${domain.name}: ${domain.weight}%`}
              >
                {domain.weight >= 10 && <span>{domain.weight}%</span>}
              </div>
            );
          })}
        </div>
        <div style={styles.weightLegend}>
          {DOMAIN_ORDER.map((domainId, index) => (
            <span key={domainId} style={styles.legendItem}>
              <span
                style={{
                  ...styles.legendColor,
                  backgroundColor: getWeightColor(DOMAIN_INFO[domainId].weight),
                }}
              />
              D{index + 1}
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  // Domain detail view
  const renderDomainDetail = () => {
    if (!selectedDomain) return null;
    const domain = DOMAIN_INFO[selectedDomain];
    const commands = KEY_COMMANDS[selectedDomain];
    const tips = getExamTips(selectedDomain).filter(t => t.domain === selectedDomain);

    return (
      <div style={styles.content}>
        <button
          onClick={() => setViewMode('overview')}
          style={styles.backButton}
        >
          &larr; Back to Overview
        </button>

        <div style={styles.domainDetailHeader}>
          <h3 style={styles.domainDetailTitle}>{domain.name}</h3>
          <span style={styles.weightBadge}>{domain.weight}% of exam</span>
        </div>

        <p style={styles.domainDescription}>{domain.description}</p>

        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>Exam Objectives</h4>
          <ul style={styles.objectiveList}>
            {domain.objectives.map((obj, index) => (
              <li key={index} style={styles.objectiveItem}>
                {obj}
              </li>
            ))}
          </ul>
        </div>

        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>Key Commands</h4>
          {commands.map((cmd, index) => (
            <div key={index} style={styles.commandCard}>
              <div style={styles.commandHeader}>
                <code style={styles.commandName}>{cmd.command}</code>
              </div>
              <p style={styles.commandDescription}>{cmd.description}</p>
              <div style={styles.commandExample}>
                <span style={styles.exampleLabel}>Example:</span>
                <code style={styles.exampleCode}>{cmd.example}</code>
              </div>
              {cmd.commonFlags && cmd.commonFlags.length > 0 && (
                <div style={styles.flags}>
                  <span style={styles.flagsLabel}>Common flags:</span>
                  {cmd.commonFlags.map((flag, i) => (
                    <code key={i} style={styles.flag}>
                      {flag}
                    </code>
                  ))}
                </div>
              )}
              {cmd.examTip && (
                <div style={styles.examTipBox}>
                  <strong>Exam Tip:</strong> {cmd.examTip}
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>Domain-Specific Tips</h4>
          {tips.map(tip => (
            <TipCard key={tip.id} tip={tip} />
          ))}
        </div>

        <button onClick={handleCopyStudyGuide} style={styles.copyButton}>
          Copy Study Guide to Clipboard
        </button>
      </div>
    );
  };

  // Exam tips view
  const renderTips = () => {
    const allTips = getExamTips();
    const generalTips = allTips.filter(t => t.domain === 'general');
    const categoryGroups: Record<string, ExamTip[]> = {
      concept: allTips.filter(t => t.category === 'concept'),
      command: allTips.filter(t => t.category === 'command'),
      procedure: allTips.filter(t => t.category === 'procedure'),
      gotcha: allTips.filter(t => t.category === 'gotcha'),
    };

    return (
      <div style={styles.content}>
        <h3 style={styles.sectionTitle}>Exam Tips & Pitfalls</h3>

        <div style={styles.tipCategory}>
          <h4 style={{ ...styles.categoryTitle, color: '#888' }}>
            General Tips
          </h4>
          {generalTips.map(tip => (
            <TipCard key={tip.id} tip={tip} />
          ))}
        </div>

        {Object.entries(categoryGroups).map(([category, tips]) => (
          <div key={category} style={styles.tipCategory}>
            <h4
              style={{
                ...styles.categoryTitle,
                color: CATEGORY_COLORS[category],
              }}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)} Tips
            </h4>
            {tips
              .filter(t => t.domain !== 'general')
              .map(tip => (
                <TipCard key={tip.id} tip={tip} />
              ))}
          </div>
        ))}
      </div>
    );
  };

  // Quick reference view
  const renderQuickRef = () => (
    <div style={styles.content}>
      <div style={styles.quickRefHeader}>
        <h3 style={styles.sectionTitle}>Quick Reference Sheet</h3>
        <button onClick={handleCopyQuickRef} style={styles.copyButtonSmall}>
          Copy to Clipboard
        </button>
      </div>

      <div style={styles.quickRefGrid}>
        {QUICK_REFERENCE.map((section, index) => (
          <div key={index} style={styles.quickRefSection}>
            <h4 style={styles.quickRefTitle}>{section.title}</h4>
            <table style={styles.quickRefTable}>
              <tbody>
                {section.items.map((item, i) => (
                  <tr key={i}>
                    <td style={styles.quickRefLabel}>{item.label}</td>
                    <td style={styles.quickRefValue}>
                      <code>{item.value}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );

  // Documentation links view
  const renderDocs = () => (
    <div style={styles.content}>
      <h3 style={styles.sectionTitle}>Official Documentation</h3>
      <p style={styles.subtitle}>
        Essential NVIDIA documentation for exam preparation.
      </p>

      <div style={styles.docsList}>
        {DOCUMENTATION_LINKS.map((link, index) => (
          <a
            key={index}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.docLink}
          >
            <div style={styles.docContent}>
              <h4 style={styles.docTitle}>{link.title}</h4>
              <p style={styles.docDescription}>{link.description}</p>
              {link.domain && (
                <span style={styles.docDomain}>
                  {DOMAIN_INFO[link.domain].name}
                </span>
              )}
            </div>
            <span style={styles.docArrow}>&rarr;</span>
          </a>
        ))}
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Certification Prep Resources</h2>
        {onClose && (
          <button onClick={onClose} style={styles.closeButton}>
            &times;
          </button>
        )}
      </div>

      {renderTabs()}

      {viewMode === 'overview' && renderOverview()}
      {viewMode === 'domain' && renderDomainDetail()}
      {viewMode === 'tips' && renderTips()}
      {viewMode === 'quickref' && renderQuickRef()}
      {viewMode === 'docs' && renderDocs()}
    </div>
  );
};

// Tip card component
const TipCard: React.FC<{ tip: ExamTip }> = ({ tip }) => (
  <div style={styles.tipCard}>
    <div style={styles.tipHeader}>
      <span
        style={{
          ...styles.tipCategory,
          backgroundColor: CATEGORY_COLORS[tip.category] || '#888',
        }}
      >
        {tip.category}
      </span>
      {tip.domain !== 'general' && (
        <span style={styles.tipDomain}>
          {DOMAIN_INFO[tip.domain as DomainId]?.name || tip.domain}
        </span>
      )}
    </div>
    <h5 style={styles.tipTitle}>{tip.title}</h5>
    <p style={styles.tipDescription}>{tip.description}</p>
    {tip.details && <p style={styles.tipDetails}>{tip.details}</p>}
  </div>
);

// Helper function
function getWeightColor(weight: number): string {
  if (weight >= 30) return '#76b900';
  if (weight >= 15) return '#2196F3';
  if (weight >= 10) return '#FF9800';
  return '#9E9E9E';
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#1e1e1e',
    color: '#e0e0e0',
    padding: '20px',
    borderRadius: '8px',
    maxWidth: '1000px',
    margin: '0 auto',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    borderBottom: '1px solid #444',
    paddingBottom: '15px',
  },
  title: {
    margin: 0,
    color: '#76b900',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#888',
    fontSize: '24px',
    cursor: 'pointer',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
    borderBottom: '1px solid #444',
    paddingBottom: '10px',
  },
  tab: {
    padding: '10px 20px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#888',
    cursor: 'pointer',
    borderRadius: '4px 4px 0 0',
    transition: 'color 0.2s',
  },
  tabActive: {
    color: '#76b900',
    borderBottom: '2px solid #76b900',
  },
  content: {
    minHeight: '400px',
  },
  sectionTitle: {
    color: '#76b900',
    marginBottom: '10px',
  },
  subtitle: {
    color: '#888',
    marginBottom: '20px',
  },
  section: {
    marginBottom: '30px',
  },
  backButton: {
    background: 'none',
    border: '1px solid #555',
    color: '#e0e0e0',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    marginBottom: '20px',
  },

  // Domain grid
  domainGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '15px',
    marginBottom: '30px',
  },
  domainCard: {
    backgroundColor: '#2a2a2a',
    border: '1px solid #444',
    borderRadius: '8px',
    padding: '15px',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
  },
  domainHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  domainWeight: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#76b900',
  },
  domainNumber: {
    color: '#888',
    fontSize: '12px',
  },
  domainName: {
    margin: '0 0 10px 0',
    color: '#fff',
    fontSize: '16px',
  },
  domainDescription: {
    color: '#aaa',
    fontSize: '14px',
    marginBottom: '10px',
  },
  domainStats: {
    display: 'flex',
    gap: '15px',
    fontSize: '12px',
    color: '#888',
  },

  // Weight chart
  weightChart: {
    backgroundColor: '#2a2a2a',
    padding: '15px',
    borderRadius: '8px',
  },
  weightBar: {
    display: 'flex',
    height: '30px',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '10px',
  },
  weightSegment: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  weightLegend: {
    display: 'flex',
    gap: '15px',
    justifyContent: 'center',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '12px',
    color: '#888',
  },
  legendColor: {
    width: '12px',
    height: '12px',
    borderRadius: '2px',
  },

  // Domain detail
  domainDetailHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
  },
  domainDetailTitle: {
    margin: 0,
    color: '#fff',
  },
  weightBadge: {
    backgroundColor: '#76b900',
    color: '#fff',
    padding: '4px 12px',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  objectiveList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  objectiveItem: {
    padding: '10px 15px',
    backgroundColor: '#333',
    marginBottom: '5px',
    borderRadius: '4px',
    paddingLeft: '30px',
    position: 'relative' as const,
  },

  // Command cards
  commandCard: {
    backgroundColor: '#2a2a2a',
    border: '1px solid #444',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '15px',
  },
  commandHeader: {
    marginBottom: '10px',
  },
  commandName: {
    backgroundColor: '#333',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '16px',
    color: '#76b900',
  },
  commandDescription: {
    color: '#aaa',
    marginBottom: '10px',
  },
  commandExample: {
    marginBottom: '10px',
  },
  exampleLabel: {
    color: '#888',
    marginRight: '10px',
  },
  exampleCode: {
    backgroundColor: '#1a1a1a',
    padding: '4px 8px',
    borderRadius: '4px',
    fontFamily: 'monospace',
  },
  flags: {
    marginBottom: '10px',
  },
  flagsLabel: {
    color: '#888',
    marginRight: '10px',
  },
  flag: {
    backgroundColor: '#333',
    padding: '2px 6px',
    borderRadius: '3px',
    marginRight: '5px',
    fontSize: '13px',
  },
  examTipBox: {
    backgroundColor: '#3a3a00',
    border: '1px solid #666600',
    padding: '10px',
    borderRadius: '4px',
    color: '#ffcc00',
    fontSize: '14px',
  },

  // Tips
  tipCategory: {
    marginBottom: '20px',
  },
  categoryTitle: {
    marginBottom: '15px',
    fontSize: '18px',
  },
  tipCard: {
    backgroundColor: '#2a2a2a',
    border: '1px solid #444',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '10px',
  },
  tipHeader: {
    display: 'flex',
    gap: '10px',
    marginBottom: '10px',
  },
  // Note: tipCategory is reused for the badge
  tipDomain: {
    backgroundColor: '#444',
    color: '#aaa',
    padding: '2px 8px',
    borderRadius: '3px',
    fontSize: '12px',
  },
  tipTitle: {
    margin: '0 0 10px 0',
    color: '#fff',
  },
  tipDescription: {
    color: '#aaa',
    margin: '0 0 10px 0',
  },
  tipDetails: {
    color: '#888',
    margin: 0,
    fontStyle: 'italic',
  },

  // Quick reference
  quickRefHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  quickRefGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '15px',
  },
  quickRefSection: {
    backgroundColor: '#2a2a2a',
    border: '1px solid #444',
    borderRadius: '8px',
    padding: '15px',
  },
  quickRefTitle: {
    margin: '0 0 10px 0',
    color: '#76b900',
    borderBottom: '1px solid #444',
    paddingBottom: '8px',
  },
  quickRefTable: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },
  quickRefLabel: {
    color: '#888',
    padding: '5px 10px 5px 0',
    fontSize: '13px',
    verticalAlign: 'top' as const,
    whiteSpace: 'nowrap' as const,
  },
  quickRefValue: {
    padding: '5px 0',
    fontSize: '13px',
  },

  // Documentation
  docsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  docLink: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2a2a2a',
    border: '1px solid #444',
    borderRadius: '8px',
    padding: '15px',
    textDecoration: 'none',
    color: 'inherit',
    transition: 'border-color 0.2s',
  },
  docContent: {
    flex: 1,
  },
  docTitle: {
    margin: '0 0 5px 0',
    color: '#76b900',
  },
  docDescription: {
    margin: '0 0 5px 0',
    color: '#aaa',
    fontSize: '14px',
  },
  docDomain: {
    fontSize: '12px',
    color: '#888',
    backgroundColor: '#333',
    padding: '2px 8px',
    borderRadius: '3px',
  },
  docArrow: {
    color: '#76b900',
    fontSize: '20px',
  },

  // Buttons
  copyButton: {
    width: '100%',
    padding: '15px',
    backgroundColor: '#76b900',
    border: 'none',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '20px',
  },
  copyButtonSmall: {
    padding: '8px 16px',
    backgroundColor: '#555',
    border: 'none',
    borderRadius: '4px',
    color: '#e0e0e0',
    cursor: 'pointer',
  },
};

// Override tipCategory for badge styling
styles.tipCategory = {
  padding: '2px 8px',
  borderRadius: '3px',
  fontSize: '11px',
  fontWeight: 'bold',
  textTransform: 'uppercase',
  color: '#fff',
};

export default CertificationResources;
