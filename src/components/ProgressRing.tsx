/**
 * ProgressRing Component - Circular progress indicator for learning progress visualization
 *
 * A reusable SVG-based circular progress ring with animated fill, size variants,
 * and color customization.
 */

import React, { useMemo } from "react";

export interface ProgressRingProps {
  /** Progress value from 0-100 */
  progress: number;
  /** Size variant of the ring */
  size?: "sm" | "md" | "lg";
  /** Whether to show percentage label in center */
  showLabel?: boolean;
  /** Custom color for the progress ring (default: NVIDIA green #76B900) */
  color?: string;
  /** Optional className for additional styling */
  className?: string;
  /** Whether to animate the progress on mount/update */
  animated?: boolean;
}

// Size configurations
const SIZE_CONFIG = {
  sm: {
    width: 40,
    height: 40,
    strokeWidth: 4,
    radius: 16,
    fontSize: "text-xs",
  },
  md: {
    width: 60,
    height: 60,
    strokeWidth: 5,
    radius: 24,
    fontSize: "text-sm",
  },
  lg: {
    width: 80,
    height: 80,
    strokeWidth: 6,
    radius: 32,
    fontSize: "text-base",
  },
};

// Color thresholds for automatic coloring based on progress
const getProgressColor = (progress: number, customColor?: string): string => {
  if (customColor) return customColor;
  if (progress < 30) return "#ef4444"; // red-500
  if (progress < 70) return "#eab308"; // yellow-500
  return "#76B900"; // NVIDIA green
};

export const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size = "md",
  showLabel = true,
  color,
  className = "",
  animated = true,
}) => {
  // Clamp progress between 0 and 100
  const clampedProgress = Math.max(0, Math.min(100, progress));

  // Get size configuration
  const config = SIZE_CONFIG[size];
  const { width, height, strokeWidth, radius, fontSize } = config;

  // Calculate circumference and dash offset
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = useMemo(() => {
    return circumference - (clampedProgress / 100) * circumference;
  }, [circumference, clampedProgress]);

  // Determine color
  const ringColor = getProgressColor(clampedProgress, color);

  // Center coordinates
  const center = width / 2;

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width, height }}
      role="progressbar"
      aria-valuenow={clampedProgress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Progress: ${Math.round(clampedProgress)}%`}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#374151"
          strokeWidth={strokeWidth}
          className="opacity-50"
        />
        {/* Progress circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={animated ? "transition-all duration-500 ease-out" : ""}
          style={{
            transformOrigin: "center",
          }}
        />
      </svg>
      {/* Center label */}
      {showLabel && (
        <span
          className={`absolute ${fontSize} font-bold`}
          style={{ color: ringColor }}
        >
          {Math.round(clampedProgress)}%
        </span>
      )}
    </div>
  );
};

/**
 * Helper component for displaying mastery status with a badge
 */
export interface MasteryBadgeProps {
  consecutiveSuccesses: number;
  threshold?: number;
}

export const MasteryBadge: React.FC<MasteryBadgeProps> = ({
  consecutiveSuccesses,
  threshold = 5,
}) => {
  const isMastered = consecutiveSuccesses >= threshold;

  if (isMastered) {
    return (
      <div className="flex items-center gap-1 px-2 py-0.5 bg-nvidia-green/20 border border-nvidia-green/50 rounded-full">
        <span className="text-nvidia-green text-xs font-bold">Mastered</span>
        <span className="text-nvidia-green text-xs">
          ({consecutiveSuccesses})
        </span>
      </div>
    );
  }

  if (consecutiveSuccesses > 0) {
    return (
      <div className="flex items-center gap-1 px-2 py-0.5 bg-gray-700 border border-gray-600 rounded-full">
        <span className="text-gray-400 text-xs">Streak:</span>
        <span className="text-yellow-500 text-xs font-bold">
          {consecutiveSuccesses}
        </span>
      </div>
    );
  }

  return null;
};

export default ProgressRing;
