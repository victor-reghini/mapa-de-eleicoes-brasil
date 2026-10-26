import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface ShareToastProps {
  message: string | null;
}

export const ShareToast: React.FC<ShareToastProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div className="share-toast-notification" role="status" aria-live="polite">
      <CheckCircle2 size={16} className="share-toast-icon" />
      <span className="share-toast-text">{message}</span>
    </div>
  );
};
