import { describe, it, expect } from 'vitest';
import {
  DOMAIN_INFO,
  KEY_COMMANDS,
  EXAM_TIPS,
  QUICK_REFERENCE,
  DOCUMENTATION_LINKS,
  getDomainInfo,
  getKeyCommands,
  getExamTips,
  getQuickReference,
  getDocumentationLinks,
  generateStudyGuide,
  generateQuickRefSheet,
  type DomainId,
} from '../certificationResources';

describe('Certification Resources - Domain Info', () => {
  it('should have all 5 domains defined', () => {
    expect(Object.keys(DOMAIN_INFO)).toHaveLength(5);
    expect(DOMAIN_INFO.domain1).toBeDefined();
    expect(DOMAIN_INFO.domain2).toBeDefined();
    expect(DOMAIN_INFO.domain3).toBeDefined();
    expect(DOMAIN_INFO.domain4).toBeDefined();
    expect(DOMAIN_INFO.domain5).toBeDefined();
  });

  it('should have correct exam weights summing to 100%', () => {
    const totalWeight = Object.values(DOMAIN_INFO).reduce((sum, d) => sum + d.weight, 0);
    expect(totalWeight).toBe(100);
  });

  it('should have valid domain structure', () => {
    Object.values(DOMAIN_INFO).forEach(domain => {
      expect(domain.id).toBeDefined();
      expect(domain.name).toBeDefined();
      expect(domain.weight).toBeGreaterThan(0);
      expect(domain.description).toBeDefined();
      expect(domain.objectives.length).toBeGreaterThan(0);
    });
  });

  it('should have correct weights for each domain', () => {
    expect(DOMAIN_INFO.domain1.weight).toBe(31);
    expect(DOMAIN_INFO.domain2.weight).toBe(5);
    expect(DOMAIN_INFO.domain3.weight).toBe(19);
    expect(DOMAIN_INFO.domain4.weight).toBe(33);
    expect(DOMAIN_INFO.domain5.weight).toBe(12);
  });
});

describe('Certification Resources - Key Commands', () => {
  it('should have commands for all domains', () => {
    expect(Object.keys(KEY_COMMANDS)).toHaveLength(5);
  });

  it('should have valid command structure', () => {
    Object.values(KEY_COMMANDS).forEach(commands => {
      expect(commands.length).toBeGreaterThan(0);
      commands.forEach(cmd => {
        expect(cmd.command).toBeDefined();
        expect(cmd.description).toBeDefined();
        expect(cmd.example).toBeDefined();
      });
    });
  });

  it('should have essential commands for domain1', () => {
    const d1Commands = KEY_COMMANDS.domain1.map(c => c.command);
    expect(d1Commands).toContain('nvidia-smi');
    expect(d1Commands).toContain('ipmitool');
    expect(d1Commands).toContain('dcgmi discovery');
  });

  it('should have MIG commands for domain2', () => {
    const d2Commands = KEY_COMMANDS.domain2.map(c => c.command);
    expect(d2Commands).toContain('nvidia-smi mig');
  });

  it('should have Slurm commands for domain3', () => {
    const d3Commands = KEY_COMMANDS.domain3.map(c => c.command);
    expect(d3Commands).toContain('sinfo');
    expect(d3Commands).toContain('sbatch');
  });

  it('should have diagnostic commands for domain4', () => {
    const d4Commands = KEY_COMMANDS.domain4.map(c => c.command);
    expect(d4Commands).toContain('dcgmi diag');
    expect(d4Commands).toContain('dcgmi health');
  });

  it('should have troubleshooting commands for domain5', () => {
    const d5Commands = KEY_COMMANDS.domain5.map(c => c.command);
    expect(d5Commands).toContain('dmesg');
    expect(d5Commands).toContain('journalctl');
  });
});

describe('Certification Resources - Exam Tips', () => {
  it('should have multiple exam tips', () => {
    expect(EXAM_TIPS.length).toBeGreaterThan(10);
  });

  it('should have valid tip structure', () => {
    EXAM_TIPS.forEach(tip => {
      expect(tip.id).toBeDefined();
      expect(['command', 'concept', 'procedure', 'gotcha']).toContain(tip.category);
      expect(tip.title).toBeDefined();
      expect(tip.description).toBeDefined();
    });
  });

  it('should have tips for all domains', () => {
    const domains = new Set(EXAM_TIPS.map(t => t.domain));
    expect(domains.has('domain1')).toBe(true);
    expect(domains.has('domain2')).toBe(true);
    expect(domains.has('domain3')).toBe(true);
    expect(domains.has('domain4')).toBe(true);
    expect(domains.has('domain5')).toBe(true);
    expect(domains.has('general')).toBe(true);
  });

  it('should have gotcha category tips', () => {
    const gotchas = EXAM_TIPS.filter(t => t.category === 'gotcha');
    expect(gotchas.length).toBeGreaterThan(0);
  });
});

describe('Certification Resources - Quick Reference', () => {
  it('should have multiple sections', () => {
    expect(QUICK_REFERENCE.length).toBeGreaterThan(3);
  });

  it('should have valid section structure', () => {
    QUICK_REFERENCE.forEach(section => {
      expect(section.title).toBeDefined();
      expect(section.items.length).toBeGreaterThan(0);
      section.items.forEach(item => {
        expect(item.label).toBeDefined();
        expect(item.value).toBeDefined();
      });
    });
  });

  it('should include GPU Information section', () => {
    const gpuSection = QUICK_REFERENCE.find(s => s.title === 'GPU Information');
    expect(gpuSection).toBeDefined();
    expect(gpuSection?.items.some(i => i.value.includes('nvidia-smi'))).toBe(true);
  });

  it('should include Slurm Commands section', () => {
    const slurmSection = QUICK_REFERENCE.find(s => s.title === 'Slurm Commands');
    expect(slurmSection).toBeDefined();
    expect(slurmSection?.items.some(i => i.value.includes('sinfo'))).toBe(true);
  });

  it('should include Troubleshooting section', () => {
    const troubleSection = QUICK_REFERENCE.find(s => s.title === 'Troubleshooting');
    expect(troubleSection).toBeDefined();
  });
});

describe('Certification Resources - Documentation Links', () => {
  it('should have multiple documentation links', () => {
    expect(DOCUMENTATION_LINKS.length).toBeGreaterThan(5);
  });

  it('should have valid link structure', () => {
    DOCUMENTATION_LINKS.forEach(link => {
      expect(link.title).toBeDefined();
      expect(link.url).toBeDefined();
      expect(link.url).toMatch(/^https?:\/\//);
      expect(link.description).toBeDefined();
    });
  });

  it('should include essential documentation', () => {
    const titles = DOCUMENTATION_LINKS.map(l => l.title);
    expect(titles.some(t => t.includes('SMI'))).toBe(true);
    expect(titles.some(t => t.includes('DCGM'))).toBe(true);
    expect(titles.some(t => t.includes('MIG'))).toBe(true);
  });
});

describe('Certification Resources - Utility Functions', () => {
  describe('getDomainInfo', () => {
    it('should return correct domain info', () => {
      const info = getDomainInfo('domain1');
      expect(info.id).toBe('domain1');
      expect(info.name).toBe('DGX System Platform Bring-Up');
      expect(info.weight).toBe(31);
    });

    it('should return info for all domains', () => {
      const domains: DomainId[] = ['domain1', 'domain2', 'domain3', 'domain4', 'domain5'];
      domains.forEach(d => {
        const info = getDomainInfo(d);
        expect(info).toBeDefined();
        expect(info.id).toBe(d);
      });
    });
  });

  describe('getKeyCommands', () => {
    it('should return commands for specified domain', () => {
      const commands = getKeyCommands('domain1');
      expect(commands.length).toBeGreaterThan(0);
      expect(commands.some(c => c.command === 'nvidia-smi')).toBe(true);
    });
  });

  describe('getExamTips', () => {
    it('should return all tips when no domain specified', () => {
      const tips = getExamTips();
      expect(tips).toEqual(EXAM_TIPS);
    });

    it('should filter tips by domain', () => {
      const tips = getExamTips('domain1');
      tips.forEach(tip => {
        expect(tip.domain === 'domain1' || tip.domain === 'general').toBe(true);
      });
    });

    it('should include general tips for any domain', () => {
      const tips = getExamTips('domain5');
      const generalTips = tips.filter(t => t.domain === 'general');
      expect(generalTips.length).toBeGreaterThan(0);
    });
  });

  describe('getQuickReference', () => {
    it('should return all quick reference sections', () => {
      const ref = getQuickReference();
      expect(ref).toEqual(QUICK_REFERENCE);
    });
  });

  describe('getDocumentationLinks', () => {
    it('should return all links when no domain specified', () => {
      const links = getDocumentationLinks();
      expect(links).toEqual(DOCUMENTATION_LINKS);
    });

    it('should filter links by domain', () => {
      const links = getDocumentationLinks('domain1');
      links.forEach(link => {
        expect(!link.domain || link.domain === 'domain1').toBe(true);
      });
    });
  });
});

describe('Certification Resources - Study Guide Generation', () => {
  it('should generate study guide for domain', () => {
    const guide = generateStudyGuide('domain1');

    expect(guide).toContain('DGX System Platform Bring-Up');
    expect(guide).toContain('31%');
    expect(guide).toContain('OBJECTIVES');
    expect(guide).toContain('KEY COMMANDS');
    expect(guide).toContain('nvidia-smi');
    expect(guide).toContain('EXAM TIPS');
  });

  it('should include all sections', () => {
    const guide = generateStudyGuide('domain4');

    expect(guide).toContain('DESCRIPTION');
    expect(guide).toContain('OBJECTIVES');
    expect(guide).toContain('KEY COMMANDS');
    expect(guide).toContain('EXAM TIPS');
  });

  it('should generate guides for all domains', () => {
    const domains: DomainId[] = ['domain1', 'domain2', 'domain3', 'domain4', 'domain5'];
    domains.forEach(d => {
      const guide = generateStudyGuide(d);
      expect(guide.length).toBeGreaterThan(100);
      expect(guide).toContain(DOMAIN_INFO[d].name);
    });
  });
});

describe('Certification Resources - Quick Reference Sheet Generation', () => {
  it('should generate quick reference sheet', () => {
    const sheet = generateQuickRefSheet();

    expect(sheet).toContain('NCP-AII QUICK REFERENCE SHEET');
    expect(sheet).toContain('GPU Information');
    expect(sheet).toContain('nvidia-smi');
    expect(sheet).toContain('Slurm Commands');
    expect(sheet).toContain('sinfo');
  });

  it('should include all sections', () => {
    const sheet = generateQuickRefSheet();

    QUICK_REFERENCE.forEach(section => {
      expect(sheet).toContain(section.title);
    });
  });

  it('should be properly formatted', () => {
    const sheet = generateQuickRefSheet();

    // Should have section separators
    expect(sheet).toContain('=');
    // Should have proper spacing
    expect(sheet.includes('  ')).toBe(true);
  });
});
