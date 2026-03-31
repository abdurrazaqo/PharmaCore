import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { getProducts, getTransactions, getCustomers } from '../services/database';
import { supabase } from '../services/supabaseClient';
import { useAuth, Permission } from '../contexts/AuthContext';
import { getCategoryColor } from '../utils/categoryColors';
import { useToast } from './ToastContainer';
import { printHTML, generateReportHTML } from '../utils/printUtils';

const Reports: React.FC = () => {
  const { hasPermission, profile, isTenantAdmin, isSuperAdmin } = useAuth();
  const { showToast } = useToast();
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [salesTrendData, setSalesTrendData] = useState<any[]>([]);
  const [avgBasketSize, setAvgBasketSize] = useState(0);
  const [inventoryTurnover, setInventoryTurnover] = useState(0);
  const [patientRetention, setPatientRetention] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('Last 30 Days');
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string | undefined>(profile?.branch?.id);

  const [startDate, setStartDate] = useState<Date>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date;
  });
  const [endDate, setEndDate] = useState<Date>(new Date());

  useEffect(() => {
    if (profile?.tenant?.id && (isTenantAdmin() || isSuperAdmin())) {
      fetchBranches();
    }
  }, [profile?.tenant?.id]);

  useEffect(() => {
    if (profile?.tenant?.id) {
      loadReportData();
    }
  }, [startDate, endDate, profile?.tenant?.id, selectedBranchId]);

  const fetchBranches = async () => {
    if (!profile?.tenant?.id) return;
    const { data } = await supabase.from('branches').select('id, name').eq('tenant_id', profile.tenant.id);
    if (data) setBranches(data);
  };

  const loadReportData = async () => {
    if (!profile?.tenant?.id) return;
    try {
      setLoading(true);
      
      // Get transactions within date range
      let txQuery = supabase
        .from('transactions')
        .select('*')
        .eq('tenant_id', profile.tenant.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .eq('status', 'Completed');
        
      if (selectedBranchId) txQuery = txQuery.eq('branch_id', selectedBranchId);

      const { data: transactions, error: txError } = await txQuery;
      if (txError) throw txError;

      // Get sales items within date range to calculate category distribution
      let salesQuery = supabase
        .from('sales')
        .select('*, products(category)')
        .eq('tenant_id', profile.tenant.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      const { data: salesItems, error: salesError } = await salesQuery;
      if (salesError) throw salesError;

      const [products, customers] = await Promise.all([
        getProducts(profile.tenant.id, selectedBranchId),
        getCustomers(profile.tenant.id) // Customers aren't branch specific technically in original DB helper so just pass tenantId
      ]);

      // Calculate category distribution from actual sales
      const categoryMap = new Map<string, number>();
      
      // Only include sales items for transactions from this branch if a branch is selected
      let validSalesItems = salesItems;
      if (selectedBranchId) {
         const txIds = new Set(transactions?.map(t => t.id) || []);
         validSalesItems = salesItems?.filter((s: any) => txIds.has(s.transaction_id));
      }

      validSalesItems?.forEach((sale: any) => {
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
            const txDate = new Date(t.created_at || t.dateTime || t.date_time); // fallback since column names vary
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
            const txDate = new Date(t.created_at || t.dateTime || t.date_time);
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
            const txDate = new Date(t.created_at || t.dateTime || t.date_time);
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
      // If branch selected, ideally filter customers by branch visits, but simple approximation:
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
    // Check permission
    if (!hasPermission(Permission.REPORTS_EXPORT)) {
      showToast('You do not have permission to export reports.', 'error');
      return;
    }
    
    const reportData = {
      dateRange,
      startStr: startDate.toLocaleDateString(),
      endStr: endDate.toLocaleDateString(),
      avgBasketSize,
      inventoryTurnover,
      patientRetention,
      categoryData,
      salesTrendData
    };

    const html = generateReportHTML(reportData);
    printHTML(html, `PharmaCore-Report-${new Date().toISOString().split('T')[0]}`, '@page { size: A4 portrait; margin: 10mm; }');
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
      <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 mb-4">
         <div className="flex items-center gap-3">
           <h2 className="text-xl font-bold dark:text-white">Business Intelligence</h2>
         </div>
         
         <div className="flex items-center gap-4">
           {(isTenantAdmin() || isSuperAdmin()) && (
             <div className="relative group">
               <select 
                  value={selectedBranchId || ''} 
                  onChange={(e) => setSelectedBranchId(e.target.value || undefined)}
                  className="appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-4 pr-10 py-2.5 text-sm font-semibold shadow-sm focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none transition-all dark:text-white hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer min-w-[160px]"
               >
                  <option value="">All Branches</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
               </select>
               <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-primary transition-colors text-[20px]">
                 expand_more
               </span>
             </div>
           )}
           <div className="flex gap-2 w-full lg:w-auto">
             {hasPermission(Permission.REPORTS_EXPORT) && (
               <button 
                 onClick={handleExportPDF}
                 className="flex-1 lg:flex-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
               >
                 <span className="material-symbols-outlined text-lg">download</span> Export PDF
               </button>
             )}
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
      </div>

      <p className="text-sm text-slate-500 -mt-4 mb-8">Analytics and sales performance metrics</p>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Avg Basket Size', value: loading ? '...' : `₦${avgBasketSize.toFixed(2)}`, icon: 'shopping_basket', color: 'text-primary' },
          { label: 'Inventory Turnover', value: loading ? '...' : `${inventoryTurnover.toFixed(1)}x`, icon: 'autorenew', color: 'text-blue-500' },
          { label: 'Patient Retention', value: loading ? '...' : `${patientRetention.toFixed(0)}%`, icon: 'loyalty', color: 'text-emerald-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-4">
            <div className={`${stat.color} bg-white dark:bg-surface-dark p-3 rounded-xl shadow-sm`}>
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
                    <Cell key={`cell-${index}`} fill={getCategoryColor(entry.name).chart} />
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
