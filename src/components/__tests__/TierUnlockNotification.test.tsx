/**
 * Tests for TierUnlockNotification component
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { TierUnlockNotificationContainer } from "../TierUnlockNotification";
import {
  useTierNotificationStore,
  getTierDescription,
  getTierLabel,
} from "@/store/tierNotificationStore";

describe("TierUnlockNotification", () => {
  beforeEach(() => {
    // Reset store state before each test
    useTierNotificationStore.getState().clearAllNotifications();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("getTierDescription", () => {
    it("returns correct description for tier 2", () => {
      expect(getTierDescription(2)).toBe(
        "You can now access Choice scenarios.",
      );
    });

    it("returns correct description for tier 3", () => {
      expect(getTierDescription(3)).toBe(
        "You can now access Expert-level challenges.",
      );
    });

    it("returns default description for unknown tier", () => {
      expect(getTierDescription(4)).toBe("New content is now available.");
    });
  });

  describe("getTierLabel", () => {
    it("returns Guided for tier 1", () => {
      expect(getTierLabel(1)).toBe("Guided");
    });

    it("returns Choice for tier 2", () => {
      expect(getTierLabel(2)).toBe("Choice");
    });

    it("returns Expert for tier 3", () => {
      expect(getTierLabel(3)).toBe("Expert");
    });

    it("returns generic label for unknown tier", () => {
      expect(getTierLabel(4)).toBe("Tier 4");
    });
  });

  describe("TierUnlockNotificationContainer", () => {
    it("renders nothing when there are no notifications", () => {
      const { container } = render(<TierUnlockNotificationContainer />);
      expect(container.firstChild).toBeNull();
    });

    it("renders notification when one is added", () => {
      render(<TierUnlockNotificationContainer />);

      act(() => {
        useTierNotificationStore
          .getState()
          .addNotification(
            "gpu-monitoring",
            "GPU Monitoring",
            "\uD83D\uDCCA",
            2,
          );
      });

      // Advance timers for the entrance animation delay
      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(screen.getByText("Tier 2 Unlocked!")).toBeInTheDocument();
      expect(screen.getByText(/GPU Monitoring/)).toBeInTheDocument();
      expect(
        screen.getByText("You can now access Choice scenarios."),
      ).toBeInTheDocument();
    });

    it("renders multiple notifications", () => {
      render(<TierUnlockNotificationContainer />);

      act(() => {
        useTierNotificationStore
          .getState()
          .addNotification(
            "gpu-monitoring",
            "GPU Monitoring",
            "\uD83D\uDCCA",
            2,
          );
        useTierNotificationStore
          .getState()
          .addNotification(
            "infiniband-tools",
            "InfiniBand Tools",
            "\uD83D\uDD17",
            3,
          );
      });

      // Advance timers for entrance animations
      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(screen.getByText("Tier 2 Unlocked!")).toBeInTheDocument();
      expect(screen.getByText("Tier 3 Unlocked!")).toBeInTheDocument();
    });

    it("calls onNavigateToTier when Try Now button is clicked", () => {
      const onNavigate = vi.fn();

      render(<TierUnlockNotificationContainer onNavigateToTier={onNavigate} />);

      act(() => {
        useTierNotificationStore
          .getState()
          .addNotification(
            "gpu-monitoring",
            "GPU Monitoring",
            "\uD83D\uDCCA",
            2,
          );
      });

      // Advance timers for entrance animation
      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(screen.getByText("Try Choice")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Try Choice"));

      expect(onNavigate).toHaveBeenCalledWith("gpu-monitoring", 2);
    });

    it("removes notification when dismiss button is clicked", () => {
      render(<TierUnlockNotificationContainer />);

      act(() => {
        useTierNotificationStore
          .getState()
          .addNotification(
            "gpu-monitoring",
            "GPU Monitoring",
            "\uD83D\uDCCA",
            2,
          );
      });

      // Advance timers for entrance animation
      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(screen.getByText("Tier 2 Unlocked!")).toBeInTheDocument();

      const dismissButton = screen.getByLabelText("Dismiss notification");
      fireEvent.click(dismissButton);

      // Wait for animation to complete
      act(() => {
        vi.advanceTimersByTime(400);
      });

      expect(screen.queryByText("Tier 2 Unlocked!")).not.toBeInTheDocument();
    });

    it("auto-dismisses notification after timeout", () => {
      render(<TierUnlockNotificationContainer />);

      act(() => {
        useTierNotificationStore
          .getState()
          .addNotification(
            "gpu-monitoring",
            "GPU Monitoring",
            "\uD83D\uDCCA",
            2,
          );
      });

      // Advance timers for entrance animation
      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(screen.getByText("Tier 2 Unlocked!")).toBeInTheDocument();

      // Advance past auto-dismiss delay (5500ms) + animation (300ms)
      act(() => {
        vi.advanceTimersByTime(6000);
      });

      expect(screen.queryByText("Tier 2 Unlocked!")).not.toBeInTheDocument();
    });
  });

  describe("useTierNotificationStore", () => {
    it("adds notification correctly", () => {
      const store = useTierNotificationStore.getState();

      store.addNotification(
        "gpu-monitoring",
        "GPU Monitoring",
        "\uD83D\uDCCA",
        2,
      );

      const notifications = useTierNotificationStore.getState().notifications;
      expect(notifications).toHaveLength(1);
      expect(notifications[0].familyId).toBe("gpu-monitoring");
      expect(notifications[0].familyName).toBe("GPU Monitoring");
      expect(notifications[0].newTier).toBe(2);
    });

    it("removes notification by ID", () => {
      const store = useTierNotificationStore.getState();

      store.addNotification(
        "gpu-monitoring",
        "GPU Monitoring",
        "\uD83D\uDCCA",
        2,
      );
      const notifications = useTierNotificationStore.getState().notifications;
      const notificationId = notifications[0].id;

      store.removeNotification(notificationId);

      expect(useTierNotificationStore.getState().notifications).toHaveLength(0);
    });

    it("clears all notifications", () => {
      const store = useTierNotificationStore.getState();

      store.addNotification(
        "gpu-monitoring",
        "GPU Monitoring",
        "\uD83D\uDCCA",
        2,
      );
      store.addNotification(
        "infiniband-tools",
        "InfiniBand Tools",
        "\uD83D\uDD17",
        3,
      );

      expect(useTierNotificationStore.getState().notifications).toHaveLength(2);

      store.clearAllNotifications();

      expect(useTierNotificationStore.getState().notifications).toHaveLength(0);
    });
  });
});
