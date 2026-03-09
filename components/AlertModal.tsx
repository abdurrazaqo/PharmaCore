import React from 'react';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
}

const AlertModal: React.FC<AlertModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  type = 'info' 
}) => {
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-100 dark:bg-green-900/30',
          text: 'text-green-600 dark:text-green-400',
          icon: 'check_circle'
        };
      case 'error':
        return {
          bg: 'bg-red-100 dark:bg-red-900/30',
          text: 'text-red-600 dark:text-red-400',
          icon: 'error'
        };
      case 'warning':
        return {
          bg: 'bg-orange-100 dark:bg-orange-900/30',
          text: 'text-orange-600 dark:text-orange-400',
          icon: 'warning'
        };
      default:
        return {
          bg: 'bg-blue-100 dark:bg-blue-900/30',
          text: 'text-blue-600 dark:text-blue-400',
          icon: 'info'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className="modal-overlay bg-black/50 flex items-center justify-center p-4">
      <div className="modal-content bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-md w-full">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full ${styles.bg}`}>
              <span className={`material-symbols-outlined text-2xl ${styles.text}`}>
                {styles.icon}
              </span>
            </div>
            <h3 className="text-xl font-bold dark:text-white">{title}</h3>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          <p className="text-slate-600 dark:text-slate-400">{message}</p>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end p-6 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertModal;
