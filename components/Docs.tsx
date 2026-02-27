
import React from 'react';

const Docs: React.FC = () => {
  return (
    <div className="p-8 max-w-[1000px] mx-auto space-y-12 animate-in fade-in duration-700">
      <section>
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-4">Core Architecture</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
          PharmaCare Pro is built on a shared-database multi-tenant architecture. Security and data isolation are ensured through a mandatory scoping layer.
        </p>
        <div className="bg-primary/5 border-l-4 border-primary p-6 rounded-r-xl">
          <h3 className="text-primary font-bold mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined">security</span>
            Multi-tenant Implementation
          </h3>
          <p className="text-slate-700 dark:text-slate-300">
            Every database table contains a <code className="bg-white dark:bg-slate-800 px-2 py-0.5 rounded text-primary font-mono text-xs">pharmacy_id</code> column. The application layer utilizes middleware to extract the pharmacy context from the user session and injects it into every database query.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-4">
          <span className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold">01</span>
          Folder Structure (App Router)
        </h2>
        <div className="bg-slate-900 rounded-2xl p-6 font-mono text-sm text-slate-300 leading-7 overflow-x-auto">
          <ul className="space-y-1 whitespace-nowrap">
            <li className="flex items-center gap-2 opacity-60">src/</li>
            <li className="pl-6 flex items-center gap-2"><span className="text-slate-500">📁</span> app/ <span className="text-slate-500 italic ml-4">// Main routes & layout</span></li>
            <li className="pl-12 flex items-center gap-2"><span className="text-slate-500">📁</span> (dashboard)/ <span className="text-slate-500 italic ml-4">// Protected pharmacy routes</span></li>
            <li className="pl-18 ml-12 border-l border-slate-700 flex items-center gap-2"><span className="text-slate-500">📁</span> inventory/</li>
            <li className="pl-18 ml-12 border-l border-slate-700 flex items-center gap-2"><span className="text-slate-500">📁</span> sales/</li>
            <li className="pl-6 flex items-center gap-2"><span className="text-slate-500">📁</span> components/ <span className="text-slate-500 italic ml-4">// Shared UI kit</span></li>
            <li className="pl-6 flex items-center gap-2"><span className="text-slate-500">📁</span> services/ <span className="text-slate-500 italic ml-4">// API integrations</span></li>
          </ul>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-4">
          <span className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold">02</span>
          API Route Structure
        </h2>
        <div className="overflow-hidden border border-slate-200 dark:border-slate-800 rounded-2xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
              <tr>
                <th className="px-6 py-4">Endpoint</th>
                <th className="px-6 py-4">Method</th>
                <th className="px-6 py-4">Functionality</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                <td className="px-6 py-4 font-mono text-primary">/api/inventory</td>
                <td className="px-6 py-4"><span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-[10px] font-bold">GET / POST</span></td>
                <td className="px-6 py-4">Update stock levels and batches.</td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                <td className="px-6 py-4 font-mono text-primary">/api/sales</td>
                <td className="px-6 py-4"><span className="bg-green-100 text-green-700 px-2 py-1 rounded text-[10px] font-bold">POST</span></td>
                <td className="px-6 py-4">Process checkout transactions.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default Docs;
