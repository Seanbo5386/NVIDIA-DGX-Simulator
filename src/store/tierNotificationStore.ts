/**
 * Tier Notification Store - Manages tier unlock notifications
 *
 * This store manages the queue of tier unlock notifications that should be
 * displayed to the user when they progress through the tier system.
 */

import { create } from "zustand";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Family metadata for display in notifications
 */
export interface FamilyMetadata {
  id: string;
  name: string;
  icon: string;
}

/**
 * Tier unlock notification data
 */
export interface TierUnlockNotification {
  id: string;
  familyId: string;
  familyName: string;
  familyIcon: string;
  newTier: number;
  timestamp: number;
}

/**
 * Tier notification store state
 */
interface TierNotificationState {
  /** Queue of pending notifications */
  notifications: TierUnlockNotification[];

  /** Add a new tier unlock notification */
  addNotification: (
    familyId: string,
    familyName: string,
    familyIcon: string,
    newTier: number,
  ) => void;

  /** Remove a notification by ID */
  removeNotification: (id: string) => void;

  /** Clear all notifications */
  clearAllNotifications: () => void;
}

// ============================================================================
// FAMILY METADATA
// ============================================================================

/**
 * Family display metadata for notifications
 * Icons match those defined in commandFamilies.json
 */
export const FAMILY_METADATA: Record<string, FamilyMetadata> = {
  "gpu-monitoring": {
    id: "gpu-monitoring",
    name: "GPU Monitoring",
    icon: "\uD83D\uDCCA", // chart emoji
  },
  "infiniband-tools": {
    id: "infiniband-tools",
    name: "InfiniBand Tools",
    icon: "\uD83D\uDD17", // link emoji
  },
  "bmc-hardware": {
    id: "bmc-hardware",
    name: "BMC & Hardware",
    icon: "\uD83D\uDDA5\uFE0F", // desktop computer emoji
  },
  "cluster-tools": {
    id: "cluster-tools",
    name: "Slurm Cluster Tools",
    icon: "\uD83D\uDDC2\uFE0F", // card file box emoji
  },
  "container-tools": {
    id: "container-tools",
    name: "Container Tools",
    icon: "\uD83D\uDCE6", // package emoji
  },
  diagnostics: {
    id: "diagnostics",
    name: "Diagnostics & Testing",
    icon: "\uD83D\uDD2C", // microscope emoji
  },
};

/**
 * Get tier description based on tier number
 */
export function getTierDescription(tier: number): string {
  switch (tier) {
    case 2:
      return "You can now access Choice scenarios.";
    case 3:
      return "You can now access Expert-level challenges.";
    default:
      return "New content is now available.";
  }
}

/**
 * Get tier label for display
 */
export function getTierLabel(tier: number): string {
  switch (tier) {
    case 1:
      return "Guided";
    case 2:
      return "Choice";
    case 3:
      return "Expert";
    default:
      return `Tier ${tier}`;
  }
}

// ============================================================================
// STORE
// ============================================================================

/**
 * Generate a unique notification ID
 */
function generateNotificationId(): string {
  return `tier-unlock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const useTierNotificationStore = create<TierNotificationState>()(
  (set) => ({
    notifications: [],

    addNotification: (
      familyId: string,
      familyName: string,
      familyIcon: string,
      newTier: number,
    ) => {
      const notification: TierUnlockNotification = {
        id: generateNotificationId(),
        familyId,
        familyName,
        familyIcon,
        newTier,
        timestamp: Date.now(),
      };

      set((state) => ({
        notifications: [...state.notifications, notification],
      }));
    },

    removeNotification: (id: string) => {
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }));
    },

    clearAllNotifications: () => {
      set({ notifications: [] });
    },
  }),
);
