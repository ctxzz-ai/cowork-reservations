import { Toast } from '../types';

type ToastContainerProps = {
  toasts: Toast[];
  onDismiss: (id: string) => void;
};

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="twc-toast-container" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`twc-toast twc-${toast.intent}`}>
          <div>
            <div className="font-semibold text-sm">{toast.title}</div>
            {toast.description ? (
              <p className="text-xs text-neutral-500 mt-1 leading-snug">{toast.description}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => onDismiss(toast.id)}
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
