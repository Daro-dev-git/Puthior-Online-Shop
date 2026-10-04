import React from 'react';
import { useStore } from '../../context/StoreContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { notifications, dismissToast } = useStore();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none px-4">
      {notifications.map((n) => (
        <div
          key={n.id}
          className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg shadow-lg border text-sm transition-all duration-200 ${
            n.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : n.type === 'info'
              ? 'bg-sky-50 border-sky-200 text-sky-900'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          {n.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
          {n.type === 'info' && <Info className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />}
          {n.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
          <div className="flex-1 font-medium leading-relaxed">{n.message}</div>
          <button
            onClick={() => dismissToast(n.id)}
            className="text-stone-400 hover:text-stone-700 p-0.5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
