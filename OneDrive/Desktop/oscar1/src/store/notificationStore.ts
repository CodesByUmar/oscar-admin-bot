import { create } from 'zustand';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  timestamp: number;
  type?: string;
}

interface NotificationState {
  notifications: AppNotification[];
  isLoading: boolean;
  listenNotifications: (telegramChatId: number | null) => () => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  unreadCount: () => number;
}

const getReadIds = (): string[] => {
  try {
    const saved = localStorage.getItem('oscar_read_notifications');
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
};

const saveReadIds = (ids: string[]) => {
  try {
    localStorage.setItem('oscar_read_notifications', JSON.stringify(ids));
  } catch (e) {}
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  isLoading: false,

  listenNotifications: (telegramChatId) => {
    const q = telegramChatId
      ? query(
          collection(db, 'notifications'),
          where('isActive', '==', true),
          where('telegramChatId', '==', telegramChatId)
        )
      : query(collection(db, 'notifications'), where('isActive', '==', true));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const readIds = getReadIds();
      const loaded: AppNotification[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        let ts = Date.now();
        if (data.createdAt) {
          ts = typeof data.createdAt.toMillis === 'function'
            ? data.createdAt.toMillis()
            : data.createdAt;
        }
        loaded.push({
          id: doc.id,
          title: data.title || '',
          message: data.message || '',
          timestamp: ts,
          read: readIds.includes(doc.id),
          type: data.type || '',
        });
      });
      loaded.sort((a, b) => b.timestamp - a.timestamp);
      set({ notifications: loaded });
    });

    return unsubscribe;
  },

  markAsRead: (id) => {
    set((state) => {
      const updated = state.notifications.map(n =>
        n.id === id ? { ...n, read: true } : n
      );
      const readIds = updated.filter(n => n.read).map(n => n.id);
      saveReadIds(readIds);
      return { notifications: updated };
    });
  },

  markAllAsRead: () => {
    set((state) => {
      const updated = state.notifications.map(n => ({ ...n, read: true }));
      saveReadIds(updated.map(n => n.id));
      return { notifications: updated };
    });
  },

  unreadCount: () => get().notifications.filter(n => !n.read).length,
}));