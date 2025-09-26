import { useRef, useState } from 'react';
import dayjs from 'dayjs';
import { Calendar, SlotClickPayload } from './components/Calendar';
import { ReservationDialog, ReservationFormValues } from './components/ReservationDialog';
import { SlotDetailsPopover } from './components/SlotDetailsPopover';
import { ToastContainer } from './components/ToastContainer';
import { useReservations } from './hooks/useReservations';
import { useToasts } from './hooks/useToasts';
import { clearReservations, exportReservations, importReservations } from './services/storage';
import { Reservation, ViewMode } from './types';
import { getSlotEnd, toDayjs, withinEditableWindow } from './services/availability';

const initialStart = dayjs().minute(Math.floor(dayjs().minute() / 30) * 30).second(0).millisecond(0);
const INITIAL_FORM_VALUES: ReservationFormValues = {
  name: '',
  affiliation: '',
  start: initialStart.toISOString(),
  end: getSlotEnd(initialStart).toISOString()
};

type SlotDetailState = SlotClickPayload | null;

type DialogState = {
  open: boolean;
  mode: 'create' | 'edit';
  values: ReservationFormValues;
  target?: Reservation;
  allowEditing: boolean;
};

export default function App() {
  const { reservations, createReservation, updateReservation, deleteReservation, replaceReservations, stats } =
    useReservations();
  const { toasts, pushToast, dismissToast } = useToasts();
  const [view, setView] = useState<ViewMode>('week');
  const [anchorDate, setAnchorDate] = useState(dayjs());
  const [slotDetail, setSlotDetail] = useState<SlotDetailState>(null);
  const [dialogState, setDialogState] = useState<DialogState>({
    open: false,
    mode: 'create',
    values: INITIAL_FORM_VALUES,
    allowEditing: true
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const closeDialog = () => setDialogState((prev) => ({ ...prev, open: false }));

  const handleAnchorDateChange = (next: dayjs.Dayjs) => {
    setAnchorDate(next);
    setSlotDetail(null);
  };

  const handleViewChange = (next: ViewMode) => {
    setView(next);
    setSlotDetail(null);
  };

  const openCreateDialog = (startIso: string, endIso: string) => {
    setDialogState({
      open: true,
      mode: 'create',
      values: {
        name: '',
        affiliation: '',
        start: startIso,
        end: endIso
      },
      allowEditing: true
    });
  };

  const openEditDialog = (reservation: Reservation) => {
    setDialogState({
      open: true,
      mode: 'edit',
      values: {
        name: reservation.name,
        affiliation: reservation.affiliation,
        start: reservation.start,
        end: reservation.end
      },
      target: reservation,
      allowEditing: withinEditableWindow(reservation)
    });
  };

  const handleSlotClick = (payload: SlotClickPayload) => {
    setSlotDetail(payload);
  };

  const handleCreateFromDay = (day: dayjs.Dayjs) => {
    handleAnchorDateChange(day);
    handleViewChange('day');
    const start = day.hour(9).minute(0).second(0).millisecond(0);
    openCreateDialog(start.toISOString(), getSlotEnd(start).toISOString());
  };

  const handleDialogSubmit = (values: ReservationFormValues) => {
    if (dialogState.mode === 'create') {
      const { reservation, error } = createReservation(values);
      if (error) {
        pushToast({ title: '予約に失敗しました', description: error.message, intent: 'error' });
        return { ok: false, error: error.message };
      }
      if (reservation) {
        pushToast({ title: '予約を保存しました', intent: 'success' });
      }
      return { ok: true };
    }

    if (dialogState.mode === 'edit' && dialogState.target) {
      const { reservation, error } = updateReservation({ id: dialogState.target.id, changes: values });
      if (error) {
        pushToast({ title: '更新に失敗しました', description: error.message, intent: 'error' });
        return { ok: false, error: error.message };
      }
      if (reservation) {
        pushToast({ title: '予約を更新しました', intent: 'success' });
      }
      return { ok: true };
    }

    return { ok: false, error: '操作を完了できませんでした。' };
  };

  const handleDeleteReservation = (reservation: Reservation) => {
    if (!withinEditableWindow(reservation)) {
      pushToast({ title: '削除できません', description: '編集可能な時間を過ぎています。', intent: 'error' });
      return;
    }
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm('この予約を削除しますか？');
      if (!confirmed) return;
    }
    deleteReservation(reservation.id);
    pushToast({ title: '予約を削除しました', intent: 'success' });
    setSlotDetail(null);
  };

  const handleExport = () => {
    try {
      exportReservations(reservations);
      pushToast({ title: 'JSONをエクスポートしました', intent: 'success' });
    } catch (error) {
      pushToast({ title: 'エクスポートに失敗しました', description: String(error), intent: 'error' });
    }
  };

  const handleImport = async (file: File) => {
    try {
      const imported = await importReservations(file);
      replaceReservations(imported);
      setSlotDetail(null);
      pushToast({ title: 'データをインポートしました', intent: 'success' });
    } catch (error) {
      pushToast({ title: 'インポートに失敗しました', description: String(error), intent: 'error' });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClear = () => {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm('全ての予約データを削除しますか？');
      if (!confirmed) return;
    }
    clearReservations();
    replaceReservations([]);
    setSlotDetail(null);
    pushToast({ title: '全データを削除しました', intent: 'success' });
  };

  const latestCreatedText = stats.latestCreatedAt ? toDayjs(stats.latestCreatedAt).format('M/D HH:mm') : 'なし';

  return (
    <div className="twc-app">
      <header className="px-6 py-4 border-b border-neutral-200/60 bg-base-100 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">大学コワーキング施設 利用登録デモ</h1>
          <p className="text-sm text-neutral-500">ブラウザローカルで動作する予約・状況可視化ツール</p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <span className="badge badge-soft">最大3名 / 30分刻み</span>
          <span className="badge badge-soft">匿名表示</span>
        </div>
      </header>

      <main className="twc-main">
        <Calendar
          reservations={reservations}
          view={view}
          anchorDate={anchorDate}
          onAnchorDateChange={handleAnchorDateChange}
          onViewChange={handleViewChange}
          onSlotClick={handleSlotClick}
          onCreateFromDay={handleCreateFromDay}
        />

        {slotDetail ? (
          <SlotDetailsPopover
            slotStartIso={slotDetail.slotStart}
            anchor={slotDetail.anchor}
            reservations={reservations}
            onClose={() => setSlotDetail(null)}
            onCreate={(startIso, endIso) => {
              openCreateDialog(startIso, endIso);
              setSlotDetail(null);
            }}
            onEdit={(reservation) => {
              openEditDialog(reservation);
              setSlotDetail(null);
            }}
            onDelete={handleDeleteReservation}
          />
        ) : null}

        <section className="twc-data-card" aria-label="データ管理">
          <header className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">データ管理</h2>
              <p className="text-sm text-neutral-500">JSONエクスポート / インポート・全削除</p>
            </div>
            <span className="text-xs text-neutral-400">最新作成: {latestCreatedText}</span>
          </header>
          <div className="twc-data-actions">
            <button type="button" className="btn btn-sm btn-primary" onClick={handleExport}>
              エクスポート
            </button>
            <label className="btn btn-sm btn-outline twc-file-input">
              インポート
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void handleImport(file);
                  }
                }}
              />
            </label>
            <button type="button" className="btn btn-sm btn-ghost text-error" onClick={handleClear}>
              全削除
            </button>
          </div>
        </section>
      </main>

      <ReservationDialog
        open={dialogState.open}
        mode={dialogState.mode}
        values={dialogState.values}
        onClose={() => {
          closeDialog();
        }}
        onSubmit={handleDialogSubmit}
        onDelete={
          dialogState.target
            ? () => {
                handleDeleteReservation(dialogState.target as Reservation);
                closeDialog();
              }
            : undefined
        }
        allowEditing={dialogState.allowEditing}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
