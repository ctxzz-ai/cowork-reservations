import { Fragment, useMemo } from 'react';
import type { MouseEvent } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { Reservation, ViewMode } from '../types';
import {
  getMonthGrid,
  getWeekRange,
  getTimeLabels,
  summarizeOccupancy,
  getSlotEnd,
  SLOT_MINUTES,
  toDayjs
} from '../services/availability';

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

export type SlotClickPayload = {
  slotStart: string;
  anchor: { top: number; left: number; width: number; height: number };
};

type CalendarProps = {
  reservations: Reservation[];
  view: ViewMode;
  anchorDate: Dayjs;
  onAnchorDateChange: (next: Dayjs) => void;
  onViewChange: (view: ViewMode) => void;
  onSlotClick: (payload: SlotClickPayload) => void;
  onCreateFromDay: (day: Dayjs) => void;
};

export function Calendar({
  reservations,
  view,
  anchorDate,
  onAnchorDateChange,
  onViewChange,
  onSlotClick,
  onCreateFromDay
}: CalendarProps) {
  const title = useMemo(() => {
    if (view === 'month') {
      return anchorDate.format('YYYY年 M月');
    }
    if (view === 'week') {
      const { start, end } = getWeekRange(anchorDate);
      return `${start.format('YYYY年M月D日')}〜${end.subtract(1, 'day').format('M月D日')}`;
    }
    return anchorDate.format('YYYY年M月D日 (ddd)');
  }, [anchorDate, view]);

  const goToToday = () => onAnchorDateChange(dayjs());
  const goPrevious = () => {
    if (view === 'month') {
      onAnchorDateChange(anchorDate.subtract(1, 'month'));
    } else if (view === 'week') {
      onAnchorDateChange(anchorDate.subtract(1, 'week'));
    } else {
      onAnchorDateChange(anchorDate.subtract(1, 'day'));
    }
  };

  const goNext = () => {
    if (view === 'month') {
      onAnchorDateChange(anchorDate.add(1, 'month'));
    } else if (view === 'week') {
      onAnchorDateChange(anchorDate.add(1, 'week'));
    } else {
      onAnchorDateChange(anchorDate.add(1, 'day'));
    }
  };

  return (
    <div className="twc-scroll-container" aria-label="予約カレンダー">
      <div className="p-4 sm:p-6 space-y-4">
        <header className="twc-toolbar" aria-label="カレンダーナビゲーション">
          <div className="twc-toolbar-group" role="group" aria-label="表示期間移動">
            <button type="button" className="btn btn-sm btn-ghost" onClick={goPrevious}>
              ←
            </button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={goToToday}>
              今日
            </button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={goNext}>
              →
            </button>
          </div>
          <h2 className="text-lg font-semibold flex-1">{title}</h2>
          <div className="twc-toolbar-group" role="tablist" aria-label="ビュー切替">
            {(
              [
                { label: '月', value: 'month' },
                { label: '週', value: 'week' },
                { label: '日', value: 'day' }
              ] satisfies { label: string; value: ViewMode }[]
            ).map((item) => (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={view === item.value}
                className={`btn btn-sm btn-ghost ${view === item.value ? 'twc-active' : ''}`}
                onClick={() => onViewChange(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </header>

        {view === 'month' ? (
          <MonthView reservations={reservations} anchorDate={anchorDate} onSelectDay={onCreateFromDay} />
        ) : (
          <WeekDayView
            reservations={reservations}
            anchorDate={anchorDate}
            view={view}
            onSlotClick={onSlotClick}
          />
        )}
      </div>
    </div>
  );
}

type MonthViewProps = {
  reservations: Reservation[];
  anchorDate: Dayjs;
  onSelectDay: (day: Dayjs) => void;
};

function MonthView({ reservations, anchorDate, onSelectDay }: MonthViewProps) {
  const days = useMemo(() => getMonthGrid(anchorDate), [anchorDate]);

  return (
    <div className="twc-month-grid">
      {days.map((day) => {
        const dayReservations = reservations.filter((reservation) => toDayjs(reservation.start).isSame(day, 'day'));
        const total = dayReservations.length;
        const occupancyMap = new Map<string, number>();
        dayReservations.forEach((reservation) => {
          const start = toDayjs(reservation.start);
          const end = toDayjs(reservation.end);
          for (let cursor = start; cursor.isBefore(end); cursor = cursor.add(SLOT_MINUTES, 'minute')) {
            const key = cursor.format();
            const current = occupancyMap.get(key) ?? 0;
            occupancyMap.set(key, current + 1);
          }
        });
        const peak = Math.max(0, ...Array.from(occupancyMap.values()));
        const isCurrentMonth = day.isSame(anchorDate, 'month');

        return (
          <button
            type="button"
            key={day.toISOString()}
            className={`twc-day-cell text-left ${isCurrentMonth ? '' : 'opacity-60'}`}
            onClick={() => onSelectDay(day)}
          >
            <div className="twc-day-cell-header">
              <span>{day.format('D日')}</span>
              {peak >= 3 ? <span className="twc-slot-badge twc-full">満席多数</span> : null}
            </div>
            <div className="twc-day-cell-body">
              <span>{total === 0 ? '予約なし' : `予約 ${total} 件`}</span>
              <span>最大同時利用 {peak}/3</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

type WeekDayViewProps = {
  reservations: Reservation[];
  anchorDate: Dayjs;
  view: Extract<ViewMode, 'week' | 'day'>;
  onSlotClick: (payload: SlotClickPayload) => void;
};

function WeekDayView({ reservations, anchorDate, view, onSlotClick }: WeekDayViewProps) {
  const { days, labels } = useMemo(() => {
    const timeLabels = getTimeLabels();
    if (view === 'day') {
      return { days: [anchorDate.startOf('day')], labels: timeLabels };
    }
    const { start } = getWeekRange(anchorDate);
    return {
      days: Array.from({ length: 7 }, (_, index) => start.add(index, 'day')),
      labels: timeLabels
    };
  }, [anchorDate, view]);

  const handleSlotClick = (
    event: MouseEvent<HTMLButtonElement>,
    day: Dayjs,
    label: string
  ) => {
    const slotStart = day.hour(Number(label.split(':')[0])).minute(Number(label.split(':')[1]));
    const anchor = event.currentTarget.getBoundingClientRect();
    const top = anchor.top + (typeof window !== 'undefined' ? window.scrollY : 0);
    const left = anchor.left + (typeof window !== 'undefined' ? window.scrollX : 0);
    onSlotClick({
      slotStart: slotStart.toISOString(),
      anchor: { top, left, width: anchor.width, height: anchor.height }
    });
  };

  return (
    <div className="twc-calendar-grid" style={{ gridTemplateColumns: `5rem repeat(${days.length}, minmax(0, 1fr))` }}>
      <div />
      {days.map((day) => (
        <div key={day.toISOString()} className="p-2 text-sm font-semibold text-neutral-500">
          {day.format('M/D')} ({WEEKDAY_LABELS[day.day()]})
        </div>
      ))}
      {labels.map((label) => (
        <Fragment key={label}>
          <div className="twc-time-cell twc-time-label" aria-hidden>
            {label}
          </div>
          {days.map((day) => {
            const slotStart = day.hour(Number(label.split(':')[0])).minute(Number(label.split(':')[1]));
            const occupancy = summarizeOccupancy(reservations, slotStart);
            const slotEnd = getSlotEnd(slotStart);
            const state = occupancy.count >= 3 ? 'twc-full' : occupancy.count >= 2 ? 'twc-limited' : 'twc-available';
            return (
              <button
                key={`${day.toISOString()}-${label}`}
                type="button"
                className={`twc-time-cell ${state}`}
                onClick={(event) => handleSlotClick(event, day, label)}
                aria-label={`${day.format('M月D日')} ${label}〜${slotEnd.format('HH:mm')} の空き状況: ${
                  occupancy.count
                } / ${occupancy.max}`}
              >
                <span className={`twc-slot-badge ${state}`}>
                  <span className="twc-badge-text">{occupancy.count}</span>
                  <span className="text-xs text-neutral-400">/ {occupancy.max}</span>
                </span>
              </button>
            );
          })}
        </Fragment>
      ))}
    </div>
  );
}
