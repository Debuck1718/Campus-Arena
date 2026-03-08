import React from 'react';
import clsx from 'clsx';

type Toast = { id: number; message: string; type?: 'success' | 'error' | 'info' };
type Ctx = { notify: (message: string, type?: Toast['type']) => void };
const ToastContext = React.createContext<Ctx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const notify = React.useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);
  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={clsx(
              'rounded-lg px-4 py-2 text-sm shadow-md border',
              t.type === 'success' && 'bg-green-50 text-green-800 border-green-200',
              t.type === 'error' && 'bg-red-50 text-red-800 border-red-200',
              t.type === 'info' && 'bg-gray-50 text-gray-800 border-gray-200'
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx.notify;
}