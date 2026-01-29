/**
 * Network Animation Hook
 *
 * Manages animated particle flow for network topology visualizations.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FlowParticle,
  createFlowParticle,
  updateParticlePosition,
  generateTrafficIntensity,
  calculateSpawnRate,
  generateParticleOffset,
} from '@/utils/networkFlowAnimation';

export interface AnimationLink {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  active: boolean;
  utilization: number;
  bidirectional?: boolean;
}

export interface UseNetworkAnimationOptions {
  enabled: boolean;
  links: AnimationLink[];
  frameRate?: number;
  maxParticles?: number;
}

export interface UseNetworkAnimationReturn {
  particles: FlowParticle[];
  isPaused: boolean;
  pause: () => void;
  resume: () => void;
  reset: () => void;
}

export function useNetworkAnimation({
  enabled,
  links,
  frameRate = 60,
  maxParticles = 100,
}: UseNetworkAnimationOptions): UseNetworkAnimationReturn {
  const [particles, setParticles] = useState<FlowParticle[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const animationRef = useRef<number | null>(null);
  const lastSpawnTimeRef = useRef<Map<string, number>>(new Map());
  const mountedRef = useRef(true);

  const pause = useCallback(() => setIsPaused(true), []);
  const resume = useCallback(() => setIsPaused(false), []);
  const reset = useCallback(() => {
    setParticles([]);
    lastSpawnTimeRef.current.clear();
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled || isPaused) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const frameInterval = 1000 / frameRate;
    let lastFrameTime = performance.now();

    const animate = (currentTime: number) => {
      if (!mountedRef.current) return;

      const deltaTime = currentTime - lastFrameTime;

      if (deltaTime >= frameInterval) {
        lastFrameTime = currentTime;

        setParticles((prevParticles) => {
          // Update existing particles
          const updated = prevParticles
            .map(updateParticlePosition)
            .filter((p): p is FlowParticle => p !== null);

          // Spawn new particles for active links
          const activeLinks = links.filter((l) => l.active && l.utilization > 0);
          const newParticles: FlowParticle[] = [];

          activeLinks.forEach((link) => {
            const intensity = generateTrafficIntensity(link.utilization);
            const spawnRate = calculateSpawnRate(intensity);
            const spawnInterval = 1000 / spawnRate;

            const lastSpawn = lastSpawnTimeRef.current.get(link.id) || 0;
            if (currentTime - lastSpawn >= spawnInterval) {
              if (updated.length + newParticles.length < maxParticles) {
                const offset = generateParticleOffset();

                // Forward direction
                newParticles.push(
                  createFlowParticle({
                    sourceX: link.sourceX + offset,
                    sourceY: link.sourceY + offset,
                    targetX: link.targetX + offset,
                    targetY: link.targetY + offset,
                    speed: 0.015 + intensity * 0.01,
                    linkId: link.id,
                    color: '#76b900',
                  })
                );

                // Reverse direction for bidirectional links
                if (link.bidirectional !== false) {
                  newParticles.push(
                    createFlowParticle({
                      sourceX: link.targetX - offset,
                      sourceY: link.targetY - offset,
                      targetX: link.sourceX - offset,
                      targetY: link.sourceY - offset,
                      speed: 0.015 + intensity * 0.01,
                      linkId: link.id,
                      color: '#3b82f6',
                    })
                  );
                }

                lastSpawnTimeRef.current.set(link.id, currentTime);
              }
            }
          });

          return [...updated, ...newParticles];
        });
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [enabled, isPaused, links, frameRate, maxParticles]);

  return {
    particles,
    isPaused,
    pause,
    resume,
    reset,
  };
}
