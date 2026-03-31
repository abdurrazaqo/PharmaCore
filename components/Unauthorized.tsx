import React from 'react';
import { useNavigate } from 'react-router-dom';

const Unauthorized: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4 text-center" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm max-w-md w-full border border-slate-200 dark:border-slate-700">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
          <span className="material-symbols-outlined text-red-600 dark:text-red-500 text-2xl">lock</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Access Denied</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8">
          You don't have permission to access this page.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="w-full bg-[#006C75] hover:bg-[#005a62] text-white py-2.5 px-4 rounded-xl font-medium transition-colors"
        >
          Go Back
        </button>
      </div>
    </div>
  );
};

export default Unauthorized;
