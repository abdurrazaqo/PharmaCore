import React from 'react';

const ReadOnlyBadge: React.FC = () => {
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-xs font-semibold shadow-sm animate-pulse">
      <span className="material-symbols-outlined text-sm">lock</span>
      Read-Only Mode
    </div>
  );
};

export default ReadOnlyBadge;
