
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Page } from '../types';
import { getTransactions, getDashboardStats, getWeeklySalesTrend } from '../services/database';
import { supabase } from '../services/supabaseClient';
import PrintReceipt from './PrintReceipt';
import TransactionHistory from './TransactionHistory';
import ReturnModal from './ReturnModal';

interface DashboardProps {
  onNavigate?: (page: Page) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [chartPeriod, setChartPeriod] = useState<'Week' | 'Month'>('Week');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<any[]>([]);
  const [salesTrendData, setSalesTrendData] = useState<any[]>([]);
  const [todayPerformance, setTodayPerformance] = useState<string>('');
  const [dateRange, setDateRange] = useState<'today' | '7days' | '30days' | 'all'>('all');
  const [stats, setStats] = useState({
    totalSales: 0,
    monthlyRevenue: 0,
    profitMargin: 0,
    lowStockCount: 0,
    expiringSoon: 0
  });
  const [loading, setLoading] = useState(true);
  const [printTransactionId, setPrintTransactionId] = useState<string | null>(null);
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [todaySalesChange, setTodaySalesChange] = useState<string>('');
  const [monthlyRevenueChange, setMonthlyRevenueChange] = useState<string>('');
  const [returnTransactionId, setReturnTransactionId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadChartData();
  }, [chartPeriod]);

  useEffect(() => {
    filterTransactions();
  }, [transactions, dateRange]);

  const filterTransactions = () => {
    let filtered = [...transactions];

    if (dateRange !== 'all') {
      const now = new Date();
      const startDate = new Date();
      
      if (dateRange === 'today') {
        startDate.setHours(0, 0, 0, 0);
      } else if (dateRange === '7days') {
        startDate.setDate(now.getDate() - 7);
      } else if (dateRange === '30days') {
        startDate.setDate(now.getDate() - 30);
      }

      filtered = filtered.filter(tx => {
        const txDate = new Date(tx.createdAt || tx.dateTime);
        return txDate >= startDate;
      });
    }

    setFilteredTransactions(filtered);
  };

  const loadChartData = async () => {
    try {
      if (chartPeriod === 'Week') {
        const trendData = await getWeeklySalesTrend();
        setSalesTrendData(trendData);
      } else {
        // Load monthly data (last 30 days)
        const monthlyData = await getMonthlyTrend();
        setSalesTrendData(monthlyData);
      }
    } catch (error) {
      console.error('Error loading chart data:', error);
    }
  };

  const getMonthlyTrend = async () => {
    const today = new Date();
    const monthData = [];
    
    // Get last 30 days grouped by week
    for (let i = 3; i >= 0; i--) {
      const weekEnd = new Date(today);
      weekEnd.setDate(today.getDate() - (i * 7));
      
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekEnd.getDate() - 6);
      
      const { data, error } = await (await import('../services/supabaseClient')).supabase!
        .from('transactions')
        .select('amount')
        .gte('created_at', weekStart.toISOString())
        .lt('created_at', new Date(weekEnd.getTime() + 86400000).toISOString())
        .eq('status', 'Completed');
      
      if (error) throw error;
      
      const weekTotal = data?.reduce((sum: number, t: any) => sum + t.amount, 0) || 0;
      
      monthData.push({
        name: `Week ${4 - i}`,
        sales: weekTotal
      });
    }
    
    return monthData;
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [txData, statsData, trendData] = await Promise.all([
        getTransactions(4),
        getDashboardStats(),
        getWeeklySalesTrend()
      ]);
      
      setTransactions(txData);
      setStats(statsData);
      setSalesTrendData(trendData);
      
      // Calculate today's sales change vs yesterday
      if (trendData.length >= 2) {
        const todaySales = trendData[trendData.length - 1].sales;
        const yesterdaySales = trendData[trendData.length - 2].sales;
        
        if (yesterdaySales > 0) {
          const percentChange = ((todaySales - yesterdaySales) / yesterdaySales) * 100;
          const sign = percentChange >= 0 ? '+' : '';
          setTodaySalesChange(`${sign}${percentChange.toFixed(1)}%`);
        } else if (todaySales > 0) {
          setTodaySalesChange('+100%');
        } else {
          setTodaySalesChange('0%');
        }
      } else {
        setTodaySalesChange('N/A');
      }
      
      // Calculate monthly revenue change vs last month
      const { data: lastMonthData } = await supabase!
        .from('transactions')
        .select('amount')
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString())
        .lt('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
        .eq('status', 'Completed');
      
      const lastMonthRevenue = lastMonthData?.reduce((sum: number, t: any) => sum + t.amount, 0) || 0;
      
      if (lastMonthRevenue > 0) {
        const percentChange = ((statsData.monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
        const sign = percentChange >= 0 ? '+' : '';
        setMonthlyRevenueChange(`${sign}${percentChange.toFixed(1)}%`);
      } else if (statsData.monthlyRevenue > 0) {
        setMonthlyRevenueChange('+100%');
      } else {
        setMonthlyRevenueChange('0%');
      }
      
      // Calculate today's performance vs same day last week
      if (trendData.length >= 7) {
        const todaySales = trendData[trendData.length - 1].sales;
        const lastWeekSales = trendData[0].sales;
        
        if (lastWeekSales > 0) {
          const percentChange = ((todaySales - lastWeekSales) / lastWeekSales) * 100;
          const sign = percentChange >= 0 ? '+' : '';
          const dayName = trendData[0].name;
          setTodayPerformance(`${sign}${percentChange.toFixed(1)}% vs last ${dayName}`);
        } else if (todaySales > 0) {
          setTodayPerformance('First sales recorded this week');
        } else {
          setTodayPerformance('No sales data available');
        }
      } else {
        setTodayPerformance('Insufficient data for comparison');
      }
    } catch (error) {
      console.error('Dashboard: Failed to load data from database:', error);
      // Set empty data but keep existing stats to avoid flash
      setTransactions([]);
      setSalesTrendData([]);
    } finally {
      setLoading(false);
    }
  };

  // Generate system notice based on real data
  const getSystemNotice = () => {
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    
    if (stats.lowStockCount > 0) {
      return `${stats.lowStockCount} items are running low on stock. Please reorder soon.`;
    } else if (stats.expiringSoon > 0) {
      return `${stats.expiringSoon} items expiring within 3 months. Check inventory.`;
    } else if (transactions.length > 0) {
      return `Last sync completed successfully at ${time}. All systems operational.`;
    } else {
      return `System ready. No transactions recorded today.`;
    }
  };

  const handleViewAllTransactions = () => {
    setShowAllTransactions(true);
  };
  return (
    <div className="p-4 max-w-[1400px] mx-auto space-y-4 animate-in fade-in duration-500">
      {/* KPI Section */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total Sales (Today)', value: `₦${stats.totalSales.toFixed(2)}`, icon: 'analytics', change: todaySalesChange || 'N/A', type: todaySalesChange.startsWith('+') ? 'success' : todaySalesChange.startsWith('-') ? 'danger' : 'info', hideOnMobile: false },
          { label: 'Revenue (Month)', value: `₦${stats.monthlyRevenue.toFixed(2)}`, icon: 'payments', change: monthlyRevenueChange || 'N/A', type: monthlyRevenueChange.startsWith('+') ? 'success' : monthlyRevenueChange.startsWith('-') ? 'danger' : 'info', hideOnMobile: false },
          { label: 'Profit Margin', value: `${stats.profitMargin.toFixed(1)}%`, icon: 'trending_up', change: 'Steady', type: 'info', hideOnMobile: true },
          { label: 'Low Stock Items', value: `${stats.lowStockCount} items`, icon: 'warning', change: 'Alert', type: stats.lowStockCount > 0 ? 'danger' : 'info', hideOnMobile: false },
          { label: 'Expiring Soon', value: `${stats.expiringSoon} items`, icon: 'hourglass_empty', change: 'Warning', type: stats.expiringSoon > 0 ? 'warning' : 'info', hideOnMobile: false },
        ].map((kpi, idx) => (
          <div key={idx} className={`bg-white dark:bg-surface-dark p-4 rounded-xl border transition-all hover:shadow-md ${
            kpi.hideOnMobile ? 'hidden lg:block' : ''
          } ${
            kpi.type === 'danger' ? 'border-red-500/20 ring-1 ring-red-500/10' : 
            kpi.type === 'warning' ? 'border-orange-500/20 ring-1 ring-orange-500/10' :
            'border-slate-200 dark:border-slate-800'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <span className={`material-symbols-outlined ${
                kpi.type === 'danger' ? 'text-red-500' : 
                kpi.type === 'warning' ? 'text-orange-500' : 'text-primary'
              }`}>{kpi.icon}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                kpi.type === 'success' ? 'text-green-500 bg-green-500/10' :
                kpi.type === 'danger' ? 'text-white bg-red-500' :
                kpi.type === 'warning' ? 'text-white bg-orange-500' :
                'text-slate-400 bg-slate-400/10'
              }`}>{kpi.change}</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">{kpi.label}</p>
            <h3 className={`text-2xl font-bold ${
              kpi.type === 'danger' ? 'text-red-500' : 
              kpi.type === 'warning' ? 'text-orange-500' : 'dark:text-white'
            }`}>{kpi.value}</h3>
          </div>
        ))}
      </div>

      {/* Chart and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white dark:bg-surface-dark p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold dark:text-white">Daily Sales Trend</h3>
              <p className="text-sm text-slate-500">Pharmacy performance tracking</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setChartPeriod('Week')}
                className={`px-3 py-1 text-xs font-medium rounded-lg ${chartPeriod === 'Week' ? 'bg-primary text-white' : 'text-slate-500 dark:hover:text-white transition-colors'}`}
              >
                Week
              </button>
              <button 
                onClick={() => setChartPeriod('Month')}
                className={`px-3 py-1 text-xs font-medium rounded-lg ${chartPeriod === 'Month' ? 'bg-primary text-white' : 'text-slate-500 dark:hover:text-white transition-colors'}`}
              >
                Month
              </button>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesTrendData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={10} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', color: 'white', fontSize: '10px' }} />
                <Bar dataKey="sales" radius={[4, 4, 0, 0]}>
                  {salesTrendData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === salesTrendData.length - 1 ? '#006C75' : 'rgba(0, 108, 117, 0.15)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {todayPerformance && (
            <div className="flex justify-between mt-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest px-2">
              <span>Today's Performance: <strong>{todayPerformance}</strong></span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="bg-white dark:bg-surface-dark p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex-1">
            <h3 className="text-lg font-bold mb-4 dark:text-white">Quick Actions</h3>
            <div className="space-y-2">
              {[
                { label: 'New Sale', icon: 'add_shopping_cart', primary: true, page: Page.POS },
                { label: 'Add Medicine', icon: 'add_circle', primary: false, page: Page.INVENTORY },
                { label: 'View Alerts', icon: 'notification_important', primary: false, danger: true, page: Page.INVENTORY },
              ].map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => onNavigate?.(action.page)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all font-semibold group border ${
                    action.primary 
                      ? 'bg-primary text-white border-primary hover:bg-primary/90' 
                      : 'bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                  } ${action.danger ? 'text-red-500' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined">{action.icon}</span>
                    <span>{action.label}</span>
                  </div>
                  <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </button>
              ))}
            </div>
          </div>
          <div className="bg-primary/10 dark:bg-primary/5 p-3 rounded-xl border border-primary/20 flex items-center gap-3">
            <div className="bg-primary size-10 rounded-lg flex items-center justify-center text-white shrink-0">
              <span className="material-symbols-outlined">info</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-wider">System Notice</p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">{getSystemNotice()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="px-4 lg:px-6 py-4 lg:py-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold dark:text-white">Recent Transactions</h3>
              <p className="text-xs lg:text-sm text-slate-500">List of latest pharmacy sales and orders</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Date Range Filter */}
              <div className="flex gap-1">
                {[
                  { value: 'today', label: 'Today' },
                  { value: '7days', label: '7D' },
                  { value: '30days', label: '30D' },
                  { value: 'all', label: 'All' }
                ].map((range) => (
                  <button
                    key={range.value}
                    onClick={() => setDateRange(range.value as any)}
                    className={`px-2 lg:px-3 py-1 text-[10px] lg:text-xs font-medium rounded-lg transition-colors ${
                      dateRange === range.value
                        ? 'bg-primary text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
              <button 
                onClick={handleViewAllTransactions}
                className="text-primary text-xs lg:text-sm font-semibold hover:underline whitespace-nowrap"
              >
                View All
              </button>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-xs font-bold uppercase tracking-widest">
              <tr>
                <th className="px-3 lg:px-6 py-4">Invoice ID</th>
                <th className="px-6 py-4 hidden lg:table-cell">Customer</th>
                <th className="px-3 lg:px-6 py-4">Date & Time</th>
                <th className="px-3 lg:px-6 py-4">Amount</th>
                <th className="px-3 lg:px-6 py-4">Payment</th>
                <th className="px-6 py-4 hidden lg:table-cell">Status</th>
                <th className="px-3 lg:px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    Loading transactions...
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    No transactions found
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  // Parse date and time
                  const dateTimeParts = tx.dateTime.split(' at ');
                  const datePart = dateTimeParts[0] || tx.dateTime;
                  const timePart = dateTimeParts[1] || '';
                  
                  return (
                <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                  <td className="px-3 lg:px-6 py-4 font-mono text-xs lg:text-sm dark:text-slate-300">{tx.id}</td>
                  <td className="px-6 py-4 hidden lg:table-cell">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold">{tx.initials}</div>
                      <span className="text-sm font-medium dark:text-white">{tx.customer}</span>
                    </div>
                  </td>
                  <td className="px-3 lg:px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-medium dark:text-white">{datePart}</span>
                      {timePart && <span className="text-[10px] text-slate-500">{timePart}</span>}
                    </div>
                  </td>
                  <td className="px-3 lg:px-6 py-4 text-xs lg:text-sm font-bold dark:text-white">₦{tx.amount.toFixed(2)}</td>
                  <td className="px-3 lg:px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold ${
                      tx.paymentMethod === 'Cash' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      tx.paymentMethod === 'Card' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      tx.paymentMethod === 'Transfer' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      <span className="material-symbols-outlined text-xs">
                        {tx.paymentMethod === 'Cash' ? 'payments' : tx.paymentMethod === 'Card' ? 'credit_card' : tx.paymentMethod === 'Transfer' ? 'swap_horiz' : 'help'}
                      </span>
                      {tx.paymentMethod || 'Cash'}
                    </span>
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      tx.status === 'Completed' ? 'bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-400' :
                      tx.status === 'Pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-400' :
                      'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400'
                    }`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-3 lg:px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {tx.status === 'Completed' && (
                        <button 
                          onClick={() => setReturnTransactionId(tx.id)}
                          className="text-slate-400 hover:text-red-500 transition-colors"
                          title="Process Return"
                        >
                          <span className="material-symbols-outlined text-lg lg:text-xl">undo</span>
                        </button>
                      )}
                      <button 
                        onClick={() => setPrintTransactionId(tx.id)}
                        className="text-slate-400 hover:text-primary transition-colors"
                        title="Print Receipt"
                      >
                        <span className="material-symbols-outlined text-lg lg:text-xl">print</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            }))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Print Receipt Modal */}
      {printTransactionId && (
        <PrintReceipt
          transactionId={printTransactionId}
          onClose={() => setPrintTransactionId(null)}
        />
      )}

      {/* Return Modal */}
      {returnTransactionId && (
        <ReturnModal
          transactionId={returnTransactionId}
          onClose={() => setReturnTransactionId(null)}
          onSuccess={() => {
            loadData(); // Reload dashboard data after successful return
          }}
        />
      )}

      {/* Transaction History Modal */}
      {showAllTransactions && (
        <TransactionHistory onClose={() => setShowAllTransactions(false)} />
      )}
    </div>
  );
};

export default Dashboard;
