import React, { useEffect } from 'react';
import { CheckCircleIcon, XIcon } from 'lucide-react';
interface ToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
}
export function Toast({
  message,
  onClose,
  duration = 5000
}: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);
  return <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-3 sm:p-4 flex items-center gap-2 sm:gap-3 max-w-[calc(100vw-2rem)] sm:max-w-md animate-slide-up">
      <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
      <p className="text-xs sm:text-sm text-gray-900 flex-1 break-words">{message}</p>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
        <XIcon className="w-5 h-5" />
      </button>
    </div>;
}