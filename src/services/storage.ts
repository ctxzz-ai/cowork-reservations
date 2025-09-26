import { Reservation, StorageShape } from '../types';

const STORAGE_KEY = 'cowork-reservations';

function safeWindow(): Window | undefined {
  if (typeof window === 'undefined') return undefined;
  return window;
}

export function loadReservations(): Reservation[] {
  const w = safeWindow();
  if (!w) return [];
  try {
    const raw = w.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StorageShape;
    if (parsed.version !== 1 || !Array.isArray(parsed.data)) return [];
    return parsed.data;
  } catch (error) {
    console.error('Failed to load reservations', error);
    return [];
  }
}

export function saveReservations(reservations: Reservation[]): void {
  const w = safeWindow();
  if (!w) return;
  const payload: StorageShape = {
    version: 1,
    data: reservations
  };
  w.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function exportReservations(reservations: Reservation[]): void {
  const payload: StorageShape = { version: 1, data: reservations };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const now = new Date();
  const fileName = `cowork-reservations-${
    now.getFullYear()
  }${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.json`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function importReservations(file: File): Promise<Reservation[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const result = typeof reader.result === 'string' ? reader.result : '';
        const parsed = JSON.parse(result) as StorageShape;
        if (parsed.version !== 1 || !Array.isArray(parsed.data)) {
          throw new Error('フォーマットが不正です');
        }
        resolve(parsed.data);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error('読み込みに失敗しました'));
    reader.readAsText(file);
  });
}

export function clearReservations(): void {
  const w = safeWindow();
  if (!w) return;
  w.localStorage.removeItem(STORAGE_KEY);
}
