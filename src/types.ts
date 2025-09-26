export type ReservationId = string;

export type Reservation = {
  id: ReservationId;
  name: string;
  affiliation: string;
  start: string; // ISO8601
  end: string;   // ISO8601
  createdAt: string;
  updatedAt: string;
};

export type StorageShape = {
  version: 1;
  data: Reservation[];
};

export type ViewMode = 'month' | 'week' | 'day';

export type Toast = {
  id: string;
  title: string;
  description?: string;
  intent: 'success' | 'error' | 'info';
};
