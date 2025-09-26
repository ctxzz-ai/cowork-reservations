import { useCallback, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { Toast } from '../types';

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = uuid();
    const nextToast: Toast = { id, ...toast };
    setToasts((prev) => [...prev, nextToast]);
    return id;
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return {
    toasts,
    pushToast,
    dismissToast
  };
}
