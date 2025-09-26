import dayjs, { Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { Reservation } from '../types';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.tz.setDefault('Asia/Tokyo');

export const SLOT_MINUTES = 30;
const MAX_CAPACITY = 3;

export function toDayjs(value: string | Dayjs): Dayjs {
  return typeof value === 'string' ? dayjs(value).tz() : value.tz();
}

export function enumerateSlots(start: Dayjs, end: Dayjs, slotMinutes = SLOT_MINUTES): Dayjs[] {
  const slots: Dayjs[] = [];
  let cursor = start.startOf('minute');
  const slotSize = slotMinutes;
  while (cursor.isBefore(end)) {
    slots.push(cursor);
    cursor = cursor.add(slotSize, 'minute');
  }
  return slots;
}

export function reservationSlots(reservation: Reservation, slotMinutes = SLOT_MINUTES): Dayjs[] {
  const start = toDayjs(reservation.start);
  const end = toDayjs(reservation.end);
  return enumerateSlots(start, end, slotMinutes);
}

export function overlaps(aStart: Dayjs, aEnd: Dayjs, bStart: Dayjs, bEnd: Dayjs): boolean {
  return aStart.isBefore(bEnd) && bStart.isBefore(aEnd);
}

export function countOverlaps(reservations: Reservation[], slotStart: Dayjs, slotMinutes = SLOT_MINUTES): number {
  const slotEnd = slotStart.add(slotMinutes, 'minute');
  return reservations.reduce((count, reservation) => {
    const resStart = toDayjs(reservation.start);
    const resEnd = toDayjs(reservation.end);
    if (overlaps(resStart, resEnd, slotStart, slotEnd)) {
      return count + 1;
    }
    return count;
  }, 0);
}

export type CapacityCheck = {
  ok: boolean;
  reason?: string;
};

export function canCreateReservation(
  newReservation: Reservation,
  reservations: Reservation[],
  options?: { excludeId?: string }
): CapacityCheck {
  const filtered = options?.excludeId
    ? reservations.filter((reservation) => reservation.id !== options.excludeId)
    : reservations;

  const newStart = toDayjs(newReservation.start);
  const newEnd = toDayjs(newReservation.end);
  const slots = enumerateSlots(newStart, newEnd);

  for (const slot of slots) {
    const existingCount = countOverlaps(filtered, slot);
    const total = existingCount + 1;
    if (total > MAX_CAPACITY) {
      return {
        ok: false,
        reason: `この時間帯は満席です（${existingCount}/${MAX_CAPACITY}）。別の時間をご検討ください。`
      };
    }
  }

  return { ok: true };
}

export function isAlignedToSlot(value: Dayjs, slotMinutes = SLOT_MINUTES): boolean {
  const minutes = value.minute();
  return minutes % slotMinutes === 0 && value.second() === 0 && value.millisecond() === 0;
}

export function validateRange(start: Dayjs, end: Dayjs): string | undefined {
  if (!start.isBefore(end)) {
    return '終了時刻は開始時刻より後にしてください。';
  }
  if (!isAlignedToSlot(start) || !isAlignedToSlot(end)) {
    return '開始・終了は30分刻みに揃えてください。';
  }
  return undefined;
}

export function summarizeOccupancy(
  reservations: Reservation[],
  slotStart: Dayjs,
  slotMinutes = SLOT_MINUTES
): { count: number; max: number } {
  const count = countOverlaps(reservations, slotStart, slotMinutes);
  return { count, max: MAX_CAPACITY };
}

export function getDayReservations(reservations: Reservation[], day: Dayjs): Reservation[] {
  return reservations.filter((reservation) => {
    const start = toDayjs(reservation.start);
    return start.isSame(day, 'day');
  });
}

export function getWeekRange(anchor: Dayjs): { start: Dayjs; end: Dayjs } {
  const start = anchor.startOf('week');
  const end = start.add(7, 'day');
  return { start, end };
}

export function getMonthGrid(anchor: Dayjs): Dayjs[] {
  const start = anchor.startOf('month').startOf('week');
  return Array.from({ length: 42 }, (_, index) => start.add(index, 'day'));
}

export function getTimeLabels(slotMinutes = SLOT_MINUTES): string[] {
  const start = dayjs().startOf('day');
  const labels: string[] = [];
  for (let m = 0; m < 24 * 60; m += slotMinutes) {
    labels.push(start.add(m, 'minute').format('HH:mm'));
  }
  return labels;
}

export function getSlotEnd(slotStart: Dayjs, slotMinutes = SLOT_MINUTES): Dayjs {
  return slotStart.add(slotMinutes, 'minute');
}

export function withinEditableWindow(reservation: Reservation, minutes = 10): boolean {
  const created = toDayjs(reservation.createdAt);
  const now = dayjs().tz();
  return now.diff(created, 'minute') <= minutes;
}
