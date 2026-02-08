/**
 * Integration tests for tier unlock notification system
 *
 * Tests the integration between learningProgressStore and tierNotificationStore
 * to ensure notifications are triggered when tiers are unlocked.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useLearningProgressStore } from "../learningProgressStore";
import { useTierNotificationStore } from "../tierNotificationStore";

describe("Tier Unlock Notification Integration", () => {
  beforeEach(() => {
    // Reset both stores before each test
    useLearningProgressStore.getState().resetProgress();
    useTierNotificationStore.getState().clearAllNotifications();
  });

  it("should trigger notification when tier 2 is unlocked", () => {
    const learningStore = useLearningProgressStore.getState();

    // Complete 3 tier-1 scenarios to unlock tier 2
    learningStore.updateTierProgress("gpu-monitoring", 1, "scenario-1");
    learningStore.updateTierProgress("gpu-monitoring", 1, "scenario-2");
    learningStore.updateTierProgress("gpu-monitoring", 1, "scenario-3");

    // Verify tier 2 was unlocked
    const state = useLearningProgressStore.getState();
    expect(state.unlockedTiers["gpu-monitoring"]).toBe(2);

    // Verify notification was created
    const notifications = useTierNotificationStore.getState().notifications;
    expect(notifications).toHaveLength(1);
    expect(notifications[0].familyId).toBe("gpu-monitoring");
    expect(notifications[0].familyName).toBe("GPU Monitoring");
    expect(notifications[0].newTier).toBe(2);
  });

  it("should trigger notification when tier 3 is unlocked", () => {
    const learningStore = useLearningProgressStore.getState();

    // First unlock tier 2
    learningStore.updateTierProgress("gpu-monitoring", 1, "scenario-1");
    learningStore.updateTierProgress("gpu-monitoring", 1, "scenario-2");
    learningStore.updateTierProgress("gpu-monitoring", 1, "scenario-3");

    // Clear the tier 2 notification
    useTierNotificationStore.getState().clearAllNotifications();

    // Complete 3 tier-2 scenarios to unlock tier 3
    learningStore.updateTierProgress("gpu-monitoring", 2, "scenario-4");
    learningStore.updateTierProgress("gpu-monitoring", 2, "scenario-5");
    learningStore.updateTierProgress("gpu-monitoring", 2, "scenario-6");

    // Verify tier 3 was unlocked
    const state = useLearningProgressStore.getState();
    expect(state.unlockedTiers["gpu-monitoring"]).toBe(3);

    // Verify notification was created for tier 3
    const notifications = useTierNotificationStore.getState().notifications;
    expect(notifications).toHaveLength(1);
    expect(notifications[0].familyId).toBe("gpu-monitoring");
    expect(notifications[0].newTier).toBe(3);
  });

  it("should not trigger notification if tier is not unlocked", () => {
    const learningStore = useLearningProgressStore.getState();

    // Only complete 2 scenarios (threshold is 3)
    learningStore.updateTierProgress("gpu-monitoring", 1, "scenario-1");
    learningStore.updateTierProgress("gpu-monitoring", 1, "scenario-2");

    // Verify tier is still 1
    const state = useLearningProgressStore.getState();
    expect(state.unlockedTiers["gpu-monitoring"]).toBe(1);

    // No notification should be created
    const notifications = useTierNotificationStore.getState().notifications;
    expect(notifications).toHaveLength(0);
  });

  it("should not trigger duplicate notifications for same tier", () => {
    const learningStore = useLearningProgressStore.getState();

    // Complete threshold to unlock tier 2
    learningStore.updateTierProgress("gpu-monitoring", 1, "scenario-1");
    learningStore.updateTierProgress("gpu-monitoring", 1, "scenario-2");
    learningStore.updateTierProgress("gpu-monitoring", 1, "scenario-3");

    // Complete more tier 1 scenarios
    learningStore.updateTierProgress("gpu-monitoring", 1, "scenario-4");
    learningStore.updateTierProgress("gpu-monitoring", 1, "scenario-5");

    // Should still only have 1 notification
    const notifications = useTierNotificationStore.getState().notifications;
    expect(notifications).toHaveLength(1);
  });

  it("should trigger separate notifications for different families", () => {
    const learningStore = useLearningProgressStore.getState();

    // Unlock tier 2 for gpu-monitoring
    learningStore.updateTierProgress("gpu-monitoring", 1, "scenario-1");
    learningStore.updateTierProgress("gpu-monitoring", 1, "scenario-2");
    learningStore.updateTierProgress("gpu-monitoring", 1, "scenario-3");

    // Unlock tier 2 for infiniband-tools
    learningStore.updateTierProgress("infiniband-tools", 1, "scenario-a");
    learningStore.updateTierProgress("infiniband-tools", 1, "scenario-b");
    learningStore.updateTierProgress("infiniband-tools", 1, "scenario-c");

    // Should have 2 notifications
    const notifications = useTierNotificationStore.getState().notifications;
    expect(notifications).toHaveLength(2);
    expect(notifications[0].familyId).toBe("gpu-monitoring");
    expect(notifications[1].familyId).toBe("infiniband-tools");
  });
});
