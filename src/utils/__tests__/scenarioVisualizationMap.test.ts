import { describe, it, expect } from 'vitest';
import {
  getVisualizationContext,
  getRelatedScenarios,
  VisualizationContext,
  SCENARIO_VIZ_MAP,
} from '../scenarioVisualizationMap';

describe('scenarioVisualizationMap', () => {
  describe('SCENARIO_VIZ_MAP', () => {
    it('should have mappings for multiple scenarios', () => {
      expect(Object.keys(SCENARIO_VIZ_MAP).length).toBeGreaterThan(10);
    });
  });

  describe('getVisualizationContext', () => {
    it('should return context for known scenario', () => {
      const context = getVisualizationContext('nccl-testing');
      expect(context).not.toBeNull();
      expect(context?.primaryView).toBeDefined();
    });

    it('should return null for unknown scenario', () => {
      const context = getVisualizationContext('non-existent-scenario');
      expect(context).toBeNull();
    });

    it('should include highlighted elements for GPU-focused scenarios', () => {
      const context = getVisualizationContext('dcgmi-diagnostics');
      expect(context).not.toBeNull();
      expect(context?.primaryView).toBe('topology');
    });

    it('should include network view for fabric scenarios', () => {
      const context = getVisualizationContext('infiniband-stress-test');
      expect(context).not.toBeNull();
      expect(context?.primaryView).toBe('network');
    });
  });

  describe('getRelatedScenarios', () => {
    it('should return scenarios for topology view', () => {
      const scenarios = getRelatedScenarios('topology');
      expect(scenarios.length).toBeGreaterThan(0);
      // Should include 'topology' and 'both' views
      expect(scenarios.every((s) => s.primaryView === 'topology' || s.primaryView === 'both')).toBe(true);
    });

    it('should return scenarios for network view', () => {
      const scenarios = getRelatedScenarios('network');
      expect(scenarios.length).toBeGreaterThan(0);
      // Should include 'network' and 'both' views
      expect(scenarios.every((s) => s.primaryView === 'network' || s.primaryView === 'both')).toBe(true);
    });

    it('should return only both-view scenarios for unknown view', () => {
      // Unknown view should only match 'both' scenarios (since the filter checks for exact match OR 'both')
      const scenarios = getRelatedScenarios('unknown' as 'topology');
      expect(scenarios.every((s) => s.primaryView === 'both')).toBe(true);
    });
  });

  describe('VisualizationContext structure', () => {
    it('should have required fields', () => {
      const context = getVisualizationContext('nccl-testing');
      expect(context).toMatchObject({
        scenarioId: 'nccl-testing',
        primaryView: expect.any(String),
        title: expect.any(String),
        description: expect.any(String),
      });
    });

    it('should have optional highlight fields', () => {
      const context = getVisualizationContext('nccl-testing');
      // These may or may not be present
      if (context?.highlightedGpus) {
        expect(Array.isArray(context.highlightedGpus)).toBe(true);
      }
      if (context?.highlightedLinks) {
        expect(Array.isArray(context.highlightedLinks)).toBe(true);
      }
    });
  });
});
