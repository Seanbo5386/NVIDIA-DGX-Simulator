/**
 * Network Animation Hook
 *
 * Manages animated particle flow for network topology visualizations.
 * Renders particles directly to an SVG group via D3, bypassing React state
 * to avoid 60fps re-renders that interfere with click event handling.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import * as d3 from "d3";
import {
  FlowParticle,
  createFlowParticle,
  updateParticlePosition,
  generateTrafficIntensity,
  calculateSpawnRate,
  generateParticleOffset,
} from "@/utils/networkFlowAnimation";

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
  /** SVG <g> element ref where particles are rendered directly via D3. */
  renderTarget?: React.RefObject<SVGGElement | null>;
}

export interface UseNetworkAnimationReturn {
  /** Current particles (ref snapshot — reads current value from internal ref). */
  particles: FlowParticle[];
  /** Particle count updated ~2×/sec for UI display without 60fps re-renders. */
  particleCount: number;
  isPaused: boolean;
  pause: () => void;
  resume: () => void;
  reset: () => void;
}

export function useNetworkAnimation({
  enabled,
  links,
  frameRate = 60,
  maxParticles = 40,
  renderTarget,
}: UseNetworkAnimationOptions): UseNetworkAnimationReturn {
  const particlesRef = useRef<FlowParticle[]>([]);
  const [particleCount, setParticleCount] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const animationRef = useRef<number | null>(null);
  const lastSpawnTimeRef = useRef<Map<string, number>>(new Map());
  const mountedRef = useRef(true);

  const pause = useCallback(() => setIsPaused(true), []);
  const resume = useCallback(() => setIsPaused(false), []);
  const reset = useCallback(() => {
    particlesRef.current = [];
    if (renderTarget?.current) {
      d3.select(renderTarget.current).selectAll("*").remove();
    }
    setParticleCount(0);
    lastSpawnTimeRef.current.clear();
  }, [renderTarget]);

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
      if (!enabled && particlesRef.current.length > 0) {
        particlesRef.current = [];
        if (renderTarget?.current) {
          d3.select(renderTarget.current).selectAll("*").remove();
        }
        if (mountedRef.current) {
          setParticleCount(0);
        }
      }
      return;
    }

    const frameInterval = 1000 / frameRate;
    let lastFrameTime = performance.now();
    let lastCountUpdate = 0;

    const animate = (currentTime: number) => {
      if (!mountedRef.current) return;

      const deltaTime = currentTime - lastFrameTime;

      if (deltaTime >= frameInterval) {
        lastFrameTime = currentTime;

        // Update existing particles
        const updated = particlesRef.current
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
                  speed: 0.008 + intensity * 0.006,
                  linkId: link.id,
                  color: "#76b900",
                }),
              );

              // Reverse direction for bidirectional links
              if (link.bidirectional !== false) {
                newParticles.push(
                  createFlowParticle({
                    sourceX: link.targetX - offset,
                    sourceY: link.targetY - offset,
                    targetX: link.sourceX - offset,
                    targetY: link.sourceY - offset,
                    speed: 0.008 + intensity * 0.006,
                    linkId: link.id,
                    color: "#3b82f6",
                  }),
                );
              }

              lastSpawnTimeRef.current.set(link.id, currentTime);
            }
          }
        });

        particlesRef.current = [...updated, ...newParticles];

        // Render directly to SVG group via D3 (no React state, no re-render)
        if (renderTarget?.current) {
          const group = d3.select(renderTarget.current);
          const sel = group
            .selectAll<SVGCircleElement, FlowParticle>("circle")
            .data(particlesRef.current, (d) => d.id);

          sel
            .enter()
            .append("circle")
            .attr("r", (d) => d.size || 2.5)
            .attr("fill", (d) => d.color)
            .attr("opacity", 0.5)
            .merge(sel)
            .attr("cx", (d) => d.x)
            .attr("cy", (d) => d.y);

          sel.exit().remove();
        }

        // Update particle count for UI display (~2×/sec, not 60fps)
        if (currentTime - lastCountUpdate > 500) {
          if (mountedRef.current) {
            setParticleCount(particlesRef.current.length);
          }
          lastCountUpdate = currentTime;
        }
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
  }, [enabled, isPaused, links, frameRate, maxParticles, renderTarget]);

  return {
    get particles() {
      return particlesRef.current;
    },
    particleCount,
    isPaused,
    pause,
    resume,
    reset,
  };
}
