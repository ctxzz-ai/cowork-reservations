import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { validateRange, toDayjs } from '../services/availability';

export type ReservationFormValues = {
  name: string;
  affiliation: string;
  start: string;
  end: string;
};

type ReservationDialogProps = {
  open: boolean;
  mode: 'create' | 'edit';
  values: ReservationFormValues;
  onClose: () => void;
  onSubmit: (values: ReservationFormValues) => { ok: boolean; error?: string };
  onDelete?: () => void;
  allowEditing?: boolean;
};

export function ReservationDialog({
  open,
  mode,
  values,
  onClose,
  onSubmit,
  onDelete,
  allowEditing = true
}: ReservationDialogProps) {
  const [formValues, setFormValues] = useState(values);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setFormValues(values);
      setErrors({});
    }
  }, [open, values]);

  const isCreate = mode === 'create';

  const periodText = useMemo(() => {
    const start = toDayjs(formValues.start);
    const end = toDayjs(formValues.end);
    return `${start.format('M月D日 HH:mm')} 〜 ${end.format('HH:mm')}`;
  }, [formValues.start, formValues.end]);

  if (!open) return null;

  const handleChange = (field: keyof ReservationFormValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {};
    if (!formValues.name.trim()) {
      nextErrors.name = '氏名は必須です。';
    }
    if (!formValues.affiliation.trim()) {
      nextErrors.affiliation = '所属は必須です。';
    }
    const start = dayjs(formValues.start);
    const end = dayjs(formValues.end);
    const rangeError = validateRange(start, end);
    if (rangeError) {
      nextErrors.time = rangeError;
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    const result = onSubmit(formValues);
    if (!result.ok) {
      setErrors((prev) => ({ ...prev, submit: result.error ?? '保存に失敗しました。' }));
      return;
    }
    onClose();
  };

  return (
    <div className="twc-dialog-backdrop" role="dialog" aria-modal="true">
      <form className="twc-dialog" onSubmit={handleSubmit}>
        <div className="twc-dialog-header">
          <div>
            <h2 className="text-xl font-semibold">
              {isCreate ? '新規予約' : allowEditing ? '予約の編集' : '予約の閲覧'}
            </h2>
            <p className="text-sm text-neutral-500 mt-1">{periodText}</p>
            {!allowEditing ? (
              <p className="text-xs text-neutral-400 mt-1">作成から10分を超えているため編集できません。</p>
            ) : null}
          </div>
          <button type="button" className="btn btn-sm btn-ghost" onClick={onClose} aria-label="閉じる">
            ✕
          </button>
        </div>

        <div className="twc-input-grid">
          <div className="twc-form-field">
            <label className="text-sm font-medium" htmlFor="reservation-name">
              氏名
            </label>
            <input
              id="reservation-name"
              type="text"
              className="input input-bordered"
              value={formValues.name}
              onChange={(event) => handleChange('name', event.target.value)}
              required
              disabled={!allowEditing}
            />
            {errors.name ? <p className="twc-error-text">{errors.name}</p> : null}
          </div>

          <div className="twc-form-field">
            <label className="text-sm font-medium" htmlFor="reservation-affiliation">
              所属
            </label>
            <input
              id="reservation-affiliation"
              type="text"
              className="input input-bordered"
              value={formValues.affiliation}
              onChange={(event) => handleChange('affiliation', event.target.value)}
              required
              disabled={!allowEditing}
            />
            {errors.affiliation ? <p className="twc-error-text">{errors.affiliation}</p> : null}
          </div>

          <div className="twc-form-field">
            <label className="text-sm font-medium" htmlFor="reservation-start">
              開始
            </label>
            <input
              id="reservation-start"
              type="datetime-local"
              className="input input-bordered"
              value={formatForInput(formValues.start)}
              onChange={(event) => handleChange('start', dayjs(event.target.value).toISOString())}
              step={SLOT_STEP_SECONDS}
              required
              disabled={!allowEditing}
            />
          </div>

          <div className="twc-form-field">
            <label className="text-sm font-medium" htmlFor="reservation-end">
              終了
            </label>
            <input
              id="reservation-end"
              type="datetime-local"
              className="input input-bordered"
              value={formatForInput(formValues.end)}
              onChange={(event) => handleChange('end', dayjs(event.target.value).toISOString())}
              step={SLOT_STEP_SECONDS}
              required
              disabled={!allowEditing}
            />
          </div>

          {errors.time ? <p className="twc-error-text">{errors.time}</p> : null}
          {errors.submit ? <p className="twc-error-text">{errors.submit}</p> : null}
        </div>

        <div className="twc-dialog-footer">
          {!isCreate && onDelete ? (
            <button
              type="button"
              className="btn btn-outline btn-error mr-auto"
              onClick={onDelete}
              disabled={!allowEditing}
            >
              削除
            </button>
          ) : null}
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            キャンセル
          </button>
          <button type="submit" className="btn btn-primary" disabled={!allowEditing}>
            {isCreate ? '予約する' : '更新する'}
          </button>
        </div>
      </form>
    </div>
  );
}

const SLOT_STEP_SECONDS = 30 * 60;

function formatForInput(value: string): string {
  return dayjs(value).format('YYYY-MM-DDTHH:mm');
}
