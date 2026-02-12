/**
 * Network Flow Animation Utilities
 *
 * Provides utilities for animating data flow particles across network links.
 */

export interface FlowParticle {
  id: string;
  x: number;
  y: number;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  progress: number; // 0 to 1
  speed: number; // progress per frame
  linkId: string;
  color: string;
  size?: number;
}

export interface CreateParticleOptions {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  speed?: number;
  linkId: string;
  color?: string;
  size?: number;
}

let particleCounter = 0;

export function createFlowParticle(
  options: CreateParticleOptions,
): FlowParticle {
  const {
    sourceX,
    sourceY,
    targetX,
    targetY,
    speed = 0.02,
    linkId,
    color = "#76b900",
    size = 2.5,
  } = options;

  return {
    id: `particle-${++particleCounter}`,
    x: sourceX,
    y: sourceY,
    sourceX,
    sourceY,
    targetX,
    targetY,
    progress: 0,
    speed,
    linkId,
    color,
    size,
  };
}

export function updateParticlePosition(
  particle: FlowParticle,
): FlowParticle | null {
  const newProgress = particle.progress + particle.speed;

  if (newProgress >= 1) {
    return null; // Particle reached destination
  }

  const x =
    particle.sourceX + (particle.targetX - particle.sourceX) * newProgress;
  const y =
    particle.sourceY + (particle.targetY - particle.sourceY) * newProgress;

  return {
    ...particle,
    x,
    y,
    progress: newProgress,
  };
}

export function calculatePathPoints(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  numPoints: number,
): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];

  for (let i = 0; i < numPoints; i++) {
    const t = i / (numPoints - 1);
    points.push({
      x: sourceX + (targetX - sourceX) * t,
      y: sourceY + (targetY - sourceY) * t,
    });
  }

  return points;
}

export function generateTrafficIntensity(utilization: number): number {
  return Math.max(0, Math.min(1, utilization / 100));
}

/**
 * Calculate how many particles should be spawned per second based on traffic intensity.
 * Higher utilization = more particles.
 */
export function calculateSpawnRate(
  intensity: number,
  baseRate: number = 0.4,
): number {
  return baseRate + intensity * 1.6; // 0.4-2 particles per second per link
}

/**
 * Generate a random offset for particles to avoid perfect alignment.
 */
export function generateParticleOffset(maxOffset: number = 1.5): number {
  return (Math.random() - 0.5) * 2 * maxOffset;
}
