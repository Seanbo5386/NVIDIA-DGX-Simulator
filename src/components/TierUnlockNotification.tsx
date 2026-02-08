/**
 * Tier Unlock Notification Component
 *
 * Displays celebratory notifications when users unlock new tiers in the
 * learning progression system. Features animated entrance, confetti-style
 * decoration, and auto-dismiss functionality.
 */

import React, { useEffect, useState, useCallback } from "react";
import {
  useTierNotificationStore,
  getTierDescription,
  getTierLabel,
  type TierUnlockNotification as NotificationData,
} from "@/store/tierNotificationStore";
import { Sparkles, Trophy, ChevronRight, X } from "lucide-react";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Time in milliseconds before notification auto-dismisses */
const AUTO_DISMISS_DELAY = 5500;

/** Animation duration for enter/exit transitions */
const ANIMATION_DURATION = 300;

// ============================================================================
// INDIVIDUAL NOTIFICATION COMPONENT
// ============================================================================

interface NotificationItemProps {
  notification: NotificationData;
  onDismiss: (id: string) => void;
  onTryNow?: (familyId: string, tier: number) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onDismiss,
  onTryNow,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // Define handlers first so they can be used in effects
  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(notification.id);
    }, ANIMATION_DURATION);
  }, [notification.id, onDismiss]);

  const handleTryNow = useCallback(() => {
    if (onTryNow) {
      onTryNow(notification.familyId, notification.newTier);
    }
    handleDismiss();
  }, [notification.familyId, notification.newTier, onTryNow, handleDismiss]);

  // Trigger entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Auto-dismiss after delay
  useEffect(() => {
    const timer = setTimeout(() => {
      handleDismiss();
    }, AUTO_DISMISS_DELAY);

    return () => clearTimeout(timer);
  }, [handleDismiss]);

  const tierLabel = getTierLabel(notification.newTier);
  const tierDescription = getTierDescription(notification.newTier);

  // Determine animation classes
  const animationClasses = isExiting
    ? "translate-x-full opacity-0"
    : isVisible
      ? "translate-x-0 opacity-100"
      : "translate-x-full opacity-0";

  return (
    <div
      className={`
        relative overflow-hidden
        bg-gradient-to-r from-green-900/95 via-green-800/95 to-emerald-900/95
        border border-green-500/50
        rounded-xl shadow-2xl shadow-green-900/50
        p-4 pr-10 min-w-[320px] max-w-[400px]
        transform transition-all duration-300 ease-out
        ${animationClasses}
      `}
      role="alert"
      aria-live="polite"
    >
      {/* Decorative sparkle effects */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        {/* Animated sparkles */}
        <div className="absolute top-2 left-4 text-yellow-300/60 animate-pulse">
          <Sparkles className="w-3 h-3" />
        </div>
        <div
          className="absolute top-4 right-16 text-yellow-400/50 animate-pulse"
          style={{ animationDelay: "0.2s" }}
        >
          <Sparkles className="w-2 h-2" />
        </div>
        <div
          className="absolute bottom-3 left-8 text-yellow-300/40 animate-pulse"
          style={{ animationDelay: "0.4s" }}
        >
          <Sparkles className="w-2.5 h-2.5" />
        </div>
        <div
          className="absolute bottom-6 right-24 text-green-300/50 animate-pulse"
          style={{ animationDelay: "0.3s" }}
        >
          <Sparkles className="w-2 h-2" />
        </div>

        {/* Gradient shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
      </div>

      {/* Close button */}
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1.5 text-green-300/60 hover:text-white hover:bg-green-700/50 rounded-lg transition-colors"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Content */}
      <div className="relative z-10 flex items-start gap-3">
        {/* Trophy icon */}
        <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
          <Trophy className="w-6 h-6 text-amber-900" />
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-yellow-300 font-bold text-lg">
              Tier {notification.newTier} Unlocked!
            </span>
          </div>

          {/* Family name */}
          <div className="text-white font-semibold text-sm mb-1">
            {notification.familyIcon} {notification.familyName}
          </div>

          {/* Description */}
          <p className="text-green-200/80 text-xs leading-relaxed mb-3">
            {tierDescription}
          </p>

          {/* Try Now button */}
          {onTryNow && (
            <button
              onClick={handleTryNow}
              className="
                inline-flex items-center gap-1.5
                px-3 py-1.5
                bg-nvidia-green hover:bg-nvidia-darkgreen
                text-black font-semibold text-xs
                rounded-lg
                transition-all duration-200
                shadow-md hover:shadow-lg
                hover:scale-105
              "
            >
              Try {tierLabel}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Progress bar showing auto-dismiss timer */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-green-900/50 overflow-hidden">
        <div
          className="h-full bg-nvidia-green origin-left"
          style={{
            animation: `shrink ${AUTO_DISMISS_DELAY}ms linear forwards`,
          }}
        />
      </div>
    </div>
  );
};

// ============================================================================
// MAIN CONTAINER COMPONENT
// ============================================================================

interface TierUnlockNotificationContainerProps {
  /** Optional callback when user clicks "Try Now" */
  onNavigateToTier?: (familyId: string, tier: number) => void;
}

export const TierUnlockNotificationContainer: React.FC<
  TierUnlockNotificationContainerProps
> = ({ onNavigateToTier }) => {
  const { notifications, removeNotification } = useTierNotificationStore();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <>
      {/* Global styles for animations */}
      <style>{`
        @keyframes shrink {
          from {
            transform: scaleX(1);
          }
          to {
            transform: scaleX(0);
          }
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        .animate-shimmer {
          animation: shimmer 2s ease-in-out infinite;
        }
      `}</style>

      {/* Notification container - fixed position in top-right */}
      <div
        className="fixed top-20 right-4 z-50 flex flex-col gap-3"
        aria-label="Tier unlock notifications"
      >
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onDismiss={removeNotification}
            onTryNow={onNavigateToTier}
          />
        ))}
      </div>
    </>
  );
};

export default TierUnlockNotificationContainer;
