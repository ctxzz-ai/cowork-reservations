import dayjs from 'dayjs';
import type { CSSProperties } from 'react';
import { Reservation } from '../types';
import { getSlotEnd, summarizeOccupancy, toDayjs, withinEditableWindow } from '../services/availability';

type SlotDetailsPopoverProps = {
  slotStartIso: string;
  anchor: { top: number; left: number; width: number; height: number };
  reservations: Reservation[];
  onClose: () => void;
  onCreate: (startIso: string, endIso: string) => void;
  onEdit: (reservation: Reservation) => void;
  onDelete: (reservation: Reservation) => void;
};

export function SlotDetailsPopover({
  slotStartIso,
  anchor,
  reservations,
  onClose,
  onCreate,
  onEdit,
  onDelete
}: SlotDetailsPopoverProps) {
  const slotStart = dayjs(slotStartIso);
  const slotEnd = getSlotEnd(slotStart);
  const occupancy = summarizeOccupancy(reservations, slotStart);
  const overlappingReservations = reservations
    .filter((reservation) => {
      const start = toDayjs(reservation.start);
      const end = toDayjs(reservation.end);
      return start.isBefore(slotEnd) && slotStart.isBefore(end);
    })
    .sort((a, b) => toDayjs(a.start).valueOf() - toDayjs(b.start).valueOf());

  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const left = Math.max(16, Math.min(anchor.left, viewportWidth - 320));
  const style: CSSProperties = {
    position: 'fixed',
    top: anchor.top + anchor.height + 8,
    left,
    zIndex: 30
  };

  const createReservation = () => onCreate(slotStartIso, slotEnd.toISOString());

  return (
    <div className="twc-popover" style={style} role="dialog" aria-modal="false">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-neutral-400">{slotStart.format('M月D日 (ddd)')}</p>
          <h3 className="font-semibold">{slotStart.format('HH:mm')}〜{slotEnd.format('HH:mm')}</h3>
        </div>
        <button type="button" className="btn btn-xs btn-ghost" aria-label="閉じる" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="twc-availability-grid mt-3">
        <div className="twc-availability-card">
          <span className="text-xs text-neutral-500">現在の利用状況</span>
          <span className="text-lg font-semibold">{occupancy.count} / {occupancy.max}</span>
          <span className="text-xs text-neutral-500">同時定員 3 名</span>
        </div>
      </div>

      <button type="button" className="btn btn-sm btn-primary w-full mt-3" onClick={createReservation}>
        この時間で予約する
      </button>

      <div className="mt-4 space-y-2" aria-live="polite">
        <p className="text-xs text-neutral-500">重なっている予約 ({overlappingReservations.length} 件)</p>
        {overlappingReservations.length === 0 ? (
          <p className="text-sm">この時間帯の予約はありません。</p>
        ) : (
          <ul className="space-y-2">
            {overlappingReservations.map((reservation) => {
              const start = toDayjs(reservation.start);
              const end = toDayjs(reservation.end);
              const editable = withinEditableWindow(reservation);
              return (
                <li key={reservation.id} className="p-2 rounded-lg bg-neutral-100/60">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">
                        {start.format('HH:mm')}〜{end.format('HH:mm')}
                      </p>
                      <p className="text-xs text-neutral-500">
                        登録: {toDayjs(reservation.createdAt).format('M/D HH:mm')}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="btn btn-xs btn-outline"
                        onClick={() => onEdit(reservation)}
                        disabled={!editable}
                      >
                        編集
                      </button>
                      <button
                        type="button"
                        className="btn btn-xs btn-ghost text-error"
                        onClick={() => onDelete(reservation)}
                        disabled={!editable}
                      >
                        削除
                      </button>
                    </div>
                  </div>
                  {!editable ? (
                    <p className="text-[10px] text-neutral-400 mt-1">編集可能期限を過ぎています。</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
