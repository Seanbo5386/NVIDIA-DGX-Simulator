import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createFlowParticle,
  updateParticlePosition,
  calculatePathPoints,
  generateTrafficIntensity,
  FlowParticle,
} from '../networkFlowAnimation';

describe('networkFlowAnimation', () => {
  describe('createFlowParticle', () => {
    it('should create a particle with correct properties', () => {
      const particle = createFlowParticle({
        sourceX: 0,
        sourceY: 0,
        targetX: 100,
        targetY: 100,
        speed: 2,
        linkId: 'link-1',
      });

      expect(particle.id).toBeDefined();
      expect(particle.x).toBe(0);
      expect(particle.y).toBe(0);
      expect(particle.progress).toBe(0);
      expect(particle.linkId).toBe('link-1');
    });
  });

  describe('updateParticlePosition', () => {
    it('should move particle along path', () => {
      const particle: FlowParticle = {
        id: 'p1',
        x: 0,
        y: 0,
        sourceX: 0,
        sourceY: 0,
        targetX: 100,
        targetY: 0,
        progress: 0,
        speed: 0.1,
        linkId: 'link-1',
        color: '#76b900',
      };

      const updated = updateParticlePosition(particle);
      expect(updated.progress).toBe(0.1);
      expect(updated.x).toBe(10);
    });

    it('should return null when particle reaches end', () => {
      const particle: FlowParticle = {
        id: 'p1',
        x: 90,
        y: 0,
        sourceX: 0,
        sourceY: 0,
        targetX: 100,
        targetY: 0,
        progress: 0.95,
        speed: 0.1,
        linkId: 'link-1',
        color: '#76b900',
      };

      const updated = updateParticlePosition(particle);
      expect(updated).toBeNull();
    });
  });

  describe('calculatePathPoints', () => {
    it('should return array of points along path', () => {
      const points = calculatePathPoints(0, 0, 100, 100, 5);
      expect(points).toHaveLength(5);
      expect(points[0]).toEqual({ x: 0, y: 0 });
      expect(points[4]).toEqual({ x: 100, y: 100 });
    });
  });

  describe('generateTrafficIntensity', () => {
    it('should return value between 0 and 1 based on utilization', () => {
      expect(generateTrafficIntensity(0)).toBe(0);
      expect(generateTrafficIntensity(100)).toBe(1);
      expect(generateTrafficIntensity(50)).toBe(0.5);
    });

    it('should clamp values to valid range', () => {
      expect(generateTrafficIntensity(-10)).toBe(0);
      expect(generateTrafficIntensity(150)).toBe(1);
    });
  });
});
