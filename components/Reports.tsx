
import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { getProducts, getTransactions, getCustomers } from '../services/database';
import { supabase } from '../services/supabaseClient';

const COLORS = ['#006C75', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

const Reports: React.FC = () => {
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [salesTrendData, setSalesTrendData] = useState<any[]>([]);
  const [avgBasketSize, setAvgBasketSize] = useState(0);
  const [inventoryTurnover, setInventoryTurnover] = useState(0);
  const [patientRetention, setPatientRetention] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('Last 30 Days');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startDate, setStartDate] = useState<Date>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date;
  });
  const [endDate, setEndDate] = useState<Date>(new Date());

  useEffect(() => {
    loadReportData();
  }, [startDate, endDate]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      
      // Get transactions within date range
      const { data: transactions, error: txError } = await supabase!
        .from('transactions')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .eq('status', 'Completed');
      
      if (txError) throw txError;

      // Get sales items within date range to calculate category distribution
      const { data: salesItems, error: salesError } = await supabase!
        .from('sales')
        .select('*, products(category)')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      if (salesError) throw salesError;

      const [products, customers] = await Promise.all([
        getProducts(),
        getCustomers()
      ]);

      // Calculate category distribution from actual sales
      const categoryMap = new Map<string, number>();
      salesItems?.forEach((sale: any) => {
        if (sale.products?.category) {
          const current = categoryMap.get(sale.products.category) || 0;
          categoryMap.set(sale.products.category, current + (sale.quantity * sale.unit_price));
        }
      });

      const categoryDistribution = Array.from(categoryMap.entries()).map(([name, value]) => ({
        name,
        value: Math.round(value)
      }));

      setCategoryData(categoryDistribution.length > 0 ? categoryDistribution : [
        { name: 'No Sales Data', value: 1 }
      ]);

      // Generate sales trend data based on date range
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const trendData = [];
      
      if (daysDiff <= 7) {
        // Show daily data for last 7 days
        for (let i = 0; i <= daysDiff; i++) {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + i);
          const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
          
          const dayStart = new Date(date);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(date);
          dayEnd.setHours(23, 59, 59, 999);
          
          const daySales = transactions?.filter(t => {
            const txDate = new Date(t.created_at);
            return txDate >= dayStart && txDate <= dayEnd;
          }).reduce((sum, t) => sum + t.amount, 0) || 0;
          
          trendData.push({ name: dayName, sales: daySales });
        }
      } else if (daysDiff <= 31) {
        // Show weekly data for up to a month
        const weeks = Math.ceil(daysDiff / 7);
        for (let i = 0; i < weeks; i++) {
          const weekStart = new Date(startDate);
          weekStart.setDate(startDate.getDate() + (i * 7));
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          if (weekEnd > endDate) weekEnd.setTime(endDate.getTime());
          
          const weekSales = transactions?.filter(t => {
            const txDate = new Date(t.created_at);
            return txDate >= weekStart && txDate <= weekEnd;
          }).reduce((sum, t) => sum + t.amount, 0) || 0;
          
          trendData.push({ name: `Week ${i + 1}`, sales: weekSales });
        }
      } else {
        // Show monthly data for longer periods
        const months = Math.ceil(daysDiff / 30);
        for (let i = 0; i < Math.min(months, 12); i++) {
          const monthStart = new Date(startDate);
          monthStart.setMonth(startDate.getMonth() + i);
          monthStart.setDate(1);
          const monthEnd = new Date(monthStart);
          monthEnd.setMonth(monthStart.getMonth() + 1);
          monthEnd.setDate(0);
          if (monthEnd > endDate) monthEnd.setTime(endDate.getTime());
          
          const monthSales = transactions?.filter(t => {
            const txDate = new Date(t.created_at);
            return txDate >= monthStart && txDate <= monthEnd;
          }).reduce((sum, t) => sum + t.amount, 0) || 0;
          
          const monthName = monthStart.toLocaleDateString('en-US', { month: 'short' });
          trendData.push({ name: monthName, sales: monthSales });
        }
      }

      setSalesTrendData(trendData);

      // Calculate average basket size
      const avgBasket = transactions && transactions.length > 0
        ? transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length
        : 0;
      setAvgBasketSize(avgBasket);

      // Calculate inventory turnover
      const totalInventoryValue = products.reduce((sum, p) => sum + (p.price * p.totalUnits), 0);
      const totalSalesValue = transactions?.reduce((sum, t) => sum + t.amount, 0) || 0;
      const turnover = totalInventoryValue > 0 ? totalSalesValue / totalInventoryValue : 0;
      setInventoryTurnover(turnover);

      // Calculate patient retention
      const returningCustomers = customers.filter((c: any) => c.visits >= 2).length;
      const retention = customers.length > 0 ? (returningCustomers / customers.length) * 100 : 0;
      setPatientRetention(retention);

    } catch (error) {
      console.error('Error loading report data:', error);
      setCategoryData([{ name: 'No Data', value: 1 }]);
      setSalesTrendData([]);
      setAvgBasketSize(0);
      setInventoryTurnover(0);
      setPatientRetention(0);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    const reportContent = `
PHARMACORE BUSINESS REPORT
Generated: ${new Date().toLocaleString()}
Date Range: ${dateRange} (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})

========================================
SALES ANALYTICS
========================================

Average Basket Size: ₦${avgBasketSize.toFixed(2)}
Inventory Turnover: ${inventoryTurnover.toFixed(1)}x
Patient Retention: ${patientRetention.toFixed(0)}%

========================================
SALES BY CATEGORY
========================================
${categoryData.map(cat => `${cat.name}: ${cat.value} units`).join('\n')}

========================================
SALES TREND
========================================
${salesTrendData.map(day => `${day.name}: ₦${day.sales.toFixed(2)}`).join('\n')}

========================================
End of Report
========================================
    `;

    const blob = new Blob([reportContent], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PharmaCore-Report-${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDateRangeChange = () => {
    setShowDatePicker(!showDatePicker);
  };

  const applyDateRange = (range: string) => {
    const now = new Date();
    let start = new Date();
    
    switch (range) {
      case 'Last 7 Days':
        start.setDate(now.getDate() - 7);
        break;
      case 'Last 30 Days':
        start.setDate(now.getDate() - 30);
        break;
      case 'This Month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'Last Month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        now.setDate(0); // Last day of previous month
        break;
      case 'Last 3 Months':
        start.setMonth(now.getMonth() - 3);
        break;
      case 'This Year':
        start = new Date(now.getFullYear(), 0, 1);
        break;
    }
    
    setStartDate(start);
    setEndDate(new Date());
    setDateRange(range);
    setShowDatePicker(false);
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8 animate-in zoom-in-95 duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold dark:text-white">Business Intelligence</h2>
          <p className="text-sm text-slate-500">Analytics and sales performance metrics</p>
        </div>
        <div className="flex gap-2 w-full lg:w-auto">
          <button 
            onClick={handleExportPDF}
            className="flex-1 lg:flex-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
          >
            <span className="material-symbols-outlined text-lg">download</span> Export PDF
          </button>
          <div className="relative flex-1 lg:flex-none">
            <button 
              onClick={handleDateRangeChange}
              className="w-full bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              <span className="material-symbols-outlined text-lg">calendar_month</span> {dateRange}
            </button>
            {showDatePicker && (
              <div className="absolute right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-4 z-50 min-w-[200px]">
                <p className="text-xs font-bold text-slate-500 uppercase mb-3">Select Period</p>
                <div className="space-y-2">
                  {[
                    'Last 7 Days',
                    'Last 30 Days',
                    'This Month',
                    'Last Month',
                    'Last 3 Months',
                    'This Year'
                  ].map(range => (
                    <button
                      key={range}
                      onClick={() => applyDateRange(range)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-sm transition-colors"
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Avg Basket Size', value: loading ? '...' : `₦${avgBasketSize.toFixed(2)}`, icon: 'shopping_basket', color: 'text-primary' },
          { label: 'Inventory Turnover', value: loading ? '...' : `${inventoryTurnover.toFixed(1)}x`, icon: 'autorenew', color: 'text-blue-500' },
          { label: 'Patient Retention', value: loading ? '...' : `${patientRetention.toFixed(0)}%`, icon: 'loyalty', color: 'text-emerald-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-4">
            <div className={`${stat.color} bg-white dark:bg-slate-900 p-3 rounded-xl shadow-sm`}>
              <span className="material-symbols-outlined">{stat.icon}</span>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{stat.label}</p>
              <h4 className="text-2xl font-bold dark:text-white">{stat.value}</h4>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sales Distribution */}
        <div className="bg-white dark:bg-surface-dark p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-lg font-bold mb-6 dark:text-white">Sales by Category</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="bg-white dark:bg-surface-dark p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-lg font-bold mb-6 dark:text-white">Revenue Growth</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesTrendData}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis hide />
                <Tooltip />
                <Bar dataKey="sales" fill="#006C75" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
