import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import POS from './components/POS';
import Docs from './components/Docs';
import Customers from './components/Customers';
import Reports from './components/Reports';
import UserManagement from './components/UserManagement';
import SubscriptionPage from './components/SubscriptionPage';
import Login from './components/Login';
import DemoPage from './pages/DemoPage';
import OnboardPage from './pages/OnboardPage';
import OnboardPendingPage from './pages/OnboardPendingPage';
import SetupPage from './pages/SetupPage';
import SuperadminLayout from './components/superadmin/SuperadminLayout';
import SuperadminOverview from './components/superadmin/SuperadminOverview';
import SuperadminPending from './components/superadmin/SuperadminPending';
import SuperadminPharmacies from './components/superadmin/SuperadminPharmacies';
import SuperadminBetaTenants from './components/superadmin/SuperadminBetaTenants';
import SuperadminAccessCodes from './components/superadmin/SuperadminAccessCodes';
import SuperadminAuditLogs from './components/superadmin/SuperadminAuditLogs';
import SuperadminRejected from './components/superadmin/SuperadminRejected';
import ProtectedRoute from './components/ProtectedRoute';
import Unauthorized from './components/Unauthorized';
import Suspended from './components/Suspended';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Page, UserRole } from './types';
import { getMedicalAssistanceStream } from './services/geminiService';
import { ToastProvider } from './components/ToastContainer';

// DashboardWrapper to safely handle onNavigate prop if needed
const DashboardWrapper = () => {
  const navigate = useNavigate();
  return <Dashboard onNavigate={(page: Page) => navigate('/' + page)} />;
};

// HomeRedirect dynamically routes users based on their role
const HomeRedirect = () => {
  const { profile, isLoading, user } = useAuth();
  
  // console.log('🏠 HomeRedirect - profile:', profile?.role, 'isLoading:', isLoading, 'user:', user?.email);
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F0F4F4] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#006C75] border-t-transparent"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (profile?.role === UserRole.SUPERADMIN) {
    return <Navigate to="/superadmin" replace />;
  }
  
  return <Navigate to={`/${Page.DASHBOARD}`} replace />;
};

const App: React.FC = () => {
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [loading, setLoading] = useState(false);

  // Debug: Log when component mounts
  useEffect(() => {
    // console.log('PharmaCore App mounted successfully!');
    // console.log('React is working!');
  }, []);

  const handleAskAi = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setAiResponse('');
    
    try {
      const stream = getMedicalAssistanceStream(query);
      for await (const chunk of stream) {
        setAiResponse(prev => prev + chunk);
        setLoading(false); // Once first chunk arrives, stop spinner
      }
    } catch (e) {
      setAiResponse('Sorry, I failed to process that request.');
      setLoading(false);
    }
  };

  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/demo" element={<DemoPage />} />
            <Route path="/onboard" element={<OnboardPage />} />
            <Route path="/onboard/pending" element={<OnboardPendingPage />} />
            <Route path="/setup" element={<SetupPage />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/suspended" element={<Suspended />} />
            
            <Route path="/" element={<HomeRedirect />} />

            <Route element={
              <ProtectedRoute>
                <Layout 
                  isAiOpen={isAiOpen}
                  onToggleAi={() => setIsAiOpen(!isAiOpen)}
                  aiContent={
                    <div className="flex flex-col h-full">
                      <div className="bg-primary p-5 text-white flex items-center justify-between">
                        <div>
                          <h3 className="font-bold flex items-center gap-2">
                            <span className="material-symbols-outlined text-xl">smart_toy</span>
                            PharmaCore AI Consult
                          </h3>
                          <p className="text-[10px] opacity-70 mt-1 uppercase tracking-widest font-bold">Safe Interaction Guard • Gemini 3</p>
                        </div>
                        <button 
                          onClick={() => setIsAiOpen(false)}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                          title="Close AI Assistant"
                        >
                          <span className="material-symbols-outlined">close</span>
                        </button>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto p-5 bg-slate-50 dark:bg-slate-900/50">
                        {aiResponse ? (
                          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl text-sm leading-relaxed text-slate-700 dark:text-slate-200 shadow-sm whitespace-pre-wrap">
                            {aiResponse}
                            {loading && <span className="inline-block w-1.5 h-4 ml-1 bg-primary animate-pulse align-middle"></span>}
                          </div>
                        ) : (
                          <div className="text-center py-12 space-y-4">
                            <div className="bg-primary/10 text-primary size-12 rounded-full flex items-center justify-center mx-auto">
                              <span className="material-symbols-outlined text-2xl">question_answer</span>
                            </div>
                            <p className="text-sm text-slate-500 px-8 italic leading-relaxed">
                              "Check if Amoxicillin interacts with Warfarin" or "Summarize pediatric Ibuprofen dosage"
                            </p>
                          </div>
                        )}
                        {loading && !aiResponse && (
                          <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
                          </div>
                        )}
                      </div>

                      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-surface-dark">
                        <div className="relative group">
                          <input 
                            type="text" 
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAskAi()}
                            placeholder="Ask your clinical query..."
                            className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl py-3 pl-4 pr-12 text-sm focus:ring-2 focus:ring-primary/40 dark:text-white transition-all"
                          />
                          <button 
                            onClick={handleAskAi}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary text-white size-8 rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md"
                          >
                            <span className="material-symbols-outlined text-lg">arrow_upward</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  }
                />
              </ProtectedRoute>
            }>
              <Route path={`/${Page.DASHBOARD}`} element={<DashboardWrapper />} />
              <Route path={`/${Page.INVENTORY}`} element={<Inventory />} />
              <Route path={`/${Page.POS}`} element={<POS />} />
              <Route path={`/${Page.CUSTOMERS}`} element={<Customers />} />
              <Route path={`/${Page.REPORTS}`} element={<Reports />} />
              <Route path={`/${Page.DOCS}`} element={<Docs />} />
              <Route 
                path="/users" 
                element={
                  <ProtectedRoute requiredRoles={[UserRole.SUPERADMIN, UserRole.TENANT_ADMIN, UserRole.BRANCH_ADMIN]}>
                    <UserManagement />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/subscription" 
                element={
                  <ProtectedRoute requiredRoles={[UserRole.SUPERADMIN, UserRole.TENANT_ADMIN]}>
                    <SubscriptionPage />
                  </ProtectedRoute>
                } 
              />
            </Route>

            {/* Superadmin Area (Independent Layout) */}
            <Route 
              path="/superadmin" 
              element={
                <ProtectedRoute requiredRole={UserRole.SUPERADMIN}>
                  <SuperadminLayout />
                </ProtectedRoute>
              } 
            >
              <Route index element={<SuperadminOverview />} />
              <Route path="pending" element={<SuperadminPending />} />
              <Route path="pharmacies" element={<SuperadminPharmacies />} />
              <Route path="pharmacies/:filter" element={<SuperadminPharmacies />} />
              <Route path="beta-tenants" element={<SuperadminBetaTenants />} />
              <Route path="access-codes" element={<SuperadminAccessCodes />} />
              <Route path="audit-logs" element={<SuperadminAuditLogs />} />
              <Route path="rejected" element={<SuperadminRejected />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;
