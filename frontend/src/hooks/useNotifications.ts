import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  EMPTY_FEED,
  fetchNotifications,
  hasNotificationFeed,
  type NotificationFeed,
} from "@/services/notificationService";

/**
 * The signed in account's expiry notifications.
 *
 * Loaded once when the shell mounts and refreshed whenever the panel is opened,
 * which is the moment somebody actually cares whether it is current. No polling:
 * an expiry date does not change minute to minute, and a background request every
 * few seconds would cost more than it tells anyone.
 */
export function useNotifications() {
  const { role, isAuthenticated } = useAuth();
  const supported = isAuthenticated && hasNotificationFeed(role);

  const [feed, setFeed] = useState<NotificationFeed>(EMPTY_FEED);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    if (!supported || !role) {
      setFeed(EMPTY_FEED);
      return;
    }

    setLoading(true);
    setError(false);
    try {
      setFeed(await fetchNotifications(role));
    } catch {
      // A failed reminder must never break the shell it lives in.
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [role, supported]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { ...feed, loading, error, supported, refresh };
}
