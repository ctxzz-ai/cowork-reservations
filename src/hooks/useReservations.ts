import { useCallback, useEffect, useMemo, useState } from 'react';
import { v4 as uuid } from 'uuid';
import dayjs from 'dayjs';
import { Reservation } from '../types';
import { loadReservations, saveReservations } from '../services/storage';
import { canCreateReservation, toDayjs } from '../services/availability';

type CreateReservationInput = Omit<Reservation, 'id' | 'createdAt' | 'updatedAt'>;

type UpdateReservationInput = {
  id: string;
  changes: Partial<Omit<Reservation, 'id' | 'createdAt'>>;
};

export type ReservationError = {
  field?: keyof CreateReservationInput;
  message: string;
};

export function useReservations() {
  const [reservations, setReservations] = useState<Reservation[]>(() => loadReservations());

  useEffect(() => {
    saveReservations(reservations);
  }, [reservations]);

  const createReservation = useCallback(
    (input: CreateReservationInput): { reservation?: Reservation; error?: ReservationError } => {
      const now = dayjs().tz().toISOString();
      const reservation: Reservation = {
        id: uuid(),
        createdAt: now,
        updatedAt: now,
        ...input
      };

      const capacity = canCreateReservation(reservation, reservations);
      if (!capacity.ok) {
        return { error: { message: capacity.reason ?? 'この時間帯は満席です。' } };
      }

      setReservations((prev) => [...prev, reservation]);
      return { reservation };
    },
    [reservations]
  );

  const updateReservation = useCallback(
    ({ id, changes }: UpdateReservationInput): { reservation?: Reservation; error?: ReservationError } => {
      const existing = reservations.find((reservation) => reservation.id === id);
      if (!existing) {
        return { error: { message: '予約が見つかりませんでした。' } };
      }

      const updated: Reservation = {
        ...existing,
        ...changes,
        updatedAt: dayjs().tz().toISOString()
      };

      const capacity = canCreateReservation(updated, reservations, { excludeId: id });
      if (!capacity.ok) {
        return { error: { message: capacity.reason ?? 'この時間帯は満席です。' } };
      }

      setReservations((prev) => prev.map((reservation) => (reservation.id === id ? updated : reservation)));
      return { reservation: updated };
    },
    [reservations]
  );

  const deleteReservation = useCallback((id: string) => {
    setReservations((prev) => prev.filter((reservation) => reservation.id !== id));
  }, []);

  const replaceReservations = useCallback((next: Reservation[]) => {
    setReservations(next);
  }, []);

  const stats = useMemo(() => {
    if (reservations.length === 0) return { latestCreatedAt: undefined as string | undefined };
    const latest = reservations.reduce((latestReservation, current) => {
      const currentDate = toDayjs(current.createdAt);
      if (!latestReservation) return current;
      const latestDate = toDayjs(latestReservation.createdAt);
      return currentDate.isAfter(latestDate) ? current : latestReservation;
    }, undefined as Reservation | undefined);
    return {
      latestCreatedAt: latest?.createdAt
    };
  }, [reservations]);

  return {
    reservations,
    createReservation,
    updateReservation,
    deleteReservation,
    replaceReservations,
    stats
  };
}
