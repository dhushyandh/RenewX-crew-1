import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { registerPushTokenInBackground } from '@/services/pushNotifications';

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  reference_id?: string;
  reference_type?: string;
  read_at?: string | null;
  created_at?: string;
}

interface NotificationContextValue {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  refreshNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  unreadCount: 0,
  loading: false,
  refreshNotifications: async () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  deleteNotification: async () => {},
  clearAll: async () => {},
});

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  // Fetch real notifications and unread count from server
  const refreshNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      setLoading(true);
      const res = await api.notifications.getAll();
      const rawList: any[] = res?.data || (Array.isArray(res) ? res : []);
      const mapped: NotificationItem[] = rawList.map((n: any) => ({
        id: String(n.id || n._id || ''),
        type: n.type || 'system',
        title: n.title || 'Notification',
        body: n.body || '',
        reference_id: n.reference_id,
        reference_type: n.reference_type,
        read_at: n.read_at || null,
        created_at: n.created_at || new Date().toISOString(),
      }));

      setNotifications(mapped);

      // Unread count
      if (typeof res?.unreadCount === 'number') {
        setUnreadCount(res.unreadCount);
      } else {
        const count = mapped.filter((n) => !n.read_at).length;
        setUnreadCount(count);
      }
    } catch {
      // In case of network glitch, keep existing state
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial load and auto-registration when user signs in
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    // Register push token in background
    registerPushTokenInBackground();

    // Fetch notifications
    refreshNotifications();

    // Polling interval (every 30 seconds) to keep count fresh
    const interval = setInterval(() => {
      refreshNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, [user, refreshNotifications]);

  // Listen for push notifications received in foreground to update badge live
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const sub = Notifications.addNotificationReceivedListener(() => {
      refreshNotifications();
    });

    return () => {
      sub.remove();
    };
  }, [refreshNotifications]);

  // Mark single notification as read
  const markAsRead = useCallback(async (id: string) => {
    try {
      await api.notifications.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Ignore failure
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await api.notifications.markAllRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch {
      // Ignore failure
    }
  }, []);

  // Delete single notification
  const deleteNotification = useCallback(async (id: string) => {
    try {
      await api.notifications.delete(id);
      setNotifications((prev) => {
        const target = prev.find((n) => n.id === id);
        if (target && !target.read_at) {
          setUnreadCount((c) => Math.max(0, c - 1));
        }
        return prev.filter((n) => n.id !== id);
      });
    } catch {
      // Ignore failure
    }
  }, []);

  // Clear all notifications
  const clearAll = useCallback(async () => {
    try {
      await api.notifications.clearAll();
      setNotifications([]);
      setUnreadCount(0);
    } catch {
      // Ignore failure
    }
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        refreshNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
