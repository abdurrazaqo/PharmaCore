import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Logo from '../components/Logo';
import { supabase } from '../services/supabaseClient';

const OnboardHeader = () => (
  <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
    <Logo size="sm" />
    <div className="flex items-center gap-2 text-slate-500">
      <span className="material-symbols-outlined text-sm">lock</span>
      <span className="text-xs font-semibold uppercase tracking-wider">Secure Onboarding</span>
    </div>
  </header>
);

const OnboardFooter = () => (
  <footer className="py-8 text-center text-slate-400 text-sm">
    <p>© 2026 365Health Systems Ltd. All rights reserved.</p>
  </footer>
);

export default function SetupPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefill, setPrefill] = useState<any>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const [formData, setFormData] = useState({
    pharmacyName: '',
    pharmacyEmail: '',
    pharmacyPhone: '',
    pharmacyAddress: '',
    adminName: '',
    adminEmail: '',
    password: '',
    confirmPassword: '',
    agreedToTerms: false
  });

  const setupToken = searchParams.get('token');

  useEffect(() => {
    if (!setupToken) {
      setError("No setup token provided. Please check your email link.");
      setIsLoading(false);
      return;
    }
    validateToken();
  }, [setupToken]);

  const validateToken = async () => {
    try {
      const { data, error: functionError } = await supabase.functions.invoke('validate-setup-token', {
        body: { token: setupToken },
      });

      if (functionError || !data.valid) {
        throw new Error(data?.error || "Invalid setup link");
      }

      setPrefill(data);
      setFormData({
        ...formData,
        pharmacyName: data.pharmacy_name || '',
        pharmacyEmail: data.pharmacy_email || '',
        pharmacyPhone: data.pharmacy_phone || '',
        pharmacyAddress: data.pharmacy_address || '',
        adminName: data.contact_person_name || '',
        adminEmail: data.pharmacy_email || ''
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: 'bg-slate-200' };
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^a-zA-Z0-9]/.test(pass)) score++;

    if (score === 1) return { score, label: 'Weak', color: 'bg-red-400' };
    if (score === 2) return { score, label: 'Fair', color: 'bg-amber-400' };
    if (score === 3) return { score, label: 'Strong', color: 'bg-emerald-400' };
    return { score: 0, label: '', color: 'bg-slate-200' };
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.agreedToTerms) {
      setError("You must agree to the Terms of Service and Privacy Policy.");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (getPasswordStrength(formData.password).score < 3) {
      setError("Password must be at least 8 characters and include a number and special character.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const { data, error: functionError } = await supabase.functions.invoke('complete-setup', {
        body: {
          setup_token: setupToken,
          pharmacy_name: formData.pharmacyName,
          pharmacy_email: formData.pharmacyEmail,
          pharmacy_phone: formData.pharmacyPhone,
          pharmacy_address: formData.pharmacyAddress,
          admin_name: formData.adminName,
          admin_email: formData.adminEmail,
          password: formData.password
        },
      });

      if (functionError || !data.success) {
        throw new Error(data?.error || "Setup failed");
      }

      // Success!
      setError(null);
      setIsSuccess(true);
      setTimeout(() => {
        navigate('/login', { state: { message: "Your account is ready! Please log in to continue." } });
      }, 3000);
    } catch (err: any) {
      let errorMessage = err.message;
      if (errorMessage.includes("An account with this email already exists")) {
        errorMessage = "An account with this email already exists. Try logging in at pharmacore.365health.online/login instead.";
      }
      setError(errorMessage);
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-inter">
        <OnboardHeader />
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white border border-slate-100 rounded-2xl shadow-sm m-4 lg:m-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#006C75] border-t-transparent mb-4"></div>
          <p className="text-slate-500 font-medium tracking-wide">Validating your setup session...</p>
        </div>
        <OnboardFooter />
      </div>
    );
  }

  if (error && !prefill && !isSubmitting) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-inter">
        <OnboardHeader />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-3xl">warning</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Invalid Setup Link</h2>
          <p className="text-slate-500 max-w-sm mb-8">{error}</p>
          <p className="text-sm text-slate-400">If you believe this is an error, please contact <a href="mailto:hello@365health.online" className="text-[#006C75] font-bold">hello@365health.online</a></p>
        </div>
        <OnboardFooter />
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-inter">
        <OnboardHeader />
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white border border-slate-100 rounded-2xl shadow-sm m-4 lg:m-12 max-w-lg mx-auto w-full text-center">
          <style>
            {`
              @keyframes progress-bar {
                0% { width: 0%; }
                100% { width: 100%; }
              }
            `}
          </style>
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-5xl text-emerald-500">check_circle</span>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Your pharmacy is ready! 🎉</h2>
          <p className="text-slate-500 mb-8">Redirecting you to PharmaCore...</p>
          <div className="w-full max-w-xs bg-slate-100 rounded-full h-2 overflow-hidden mx-auto">
            <div className="bg-[#006C75] h-full rounded-full" style={{ animation: 'progress-bar 3s linear forwards' }}></div>
          </div>
        </div>
        <OnboardFooter />
      </div>
    );
  }

  const strength = getPasswordStrength(formData.password);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-inter antialiased">
      <OnboardHeader />

      <main className="flex-1 max-w-2xl w-full mx-auto p-4 md:p-8">
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 md:p-12">
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Complete Your Setup</h2>
            <p className="text-slate-500">Welcome to PharmaCore! Let's create your administrator account for <strong>{prefill?.pharmacy_name}</strong>.</p>
          </div>

          <form onSubmit={handleSetup} className="space-y-8">
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Pharmacy Details</label>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Pharmacy Name</label>
                    <input
                      type="text"
                      required
                      className="w-full px-5 py-3.5 rounded-xl border border-slate-200 focus:border-[#006C75] focus:outline-none transition-all"
                      value={formData.pharmacyName}
                      onChange={(e) => setFormData({ ...formData, pharmacyName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Pharmacy Email</label>
                    <input
                      type="email"
                      required
                      className="w-full px-5 py-3.5 rounded-xl border border-slate-200 focus:border-[#006C75] focus:outline-none transition-all"
                      value={formData.pharmacyEmail}
                      onChange={(e) => setFormData({ ...formData, pharmacyEmail: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Pharmacy Phone</label>
                    <input
                      type="tel"
                      required
                      className="w-full px-5 py-3.5 rounded-xl border border-slate-200 focus:border-[#006C75] focus:outline-none transition-all"
                      value={formData.pharmacyPhone}
                      onChange={(e) => setFormData({ ...formData, pharmacyPhone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Pharmacy Address</label>
                    <input
                      type="text"
                      required
                      className="w-full px-5 py-3.5 rounded-xl border border-slate-200 focus:border-[#006C75] focus:outline-none transition-all"
                      value={formData.pharmacyAddress}
                      onChange={(e) => setFormData({ ...formData, pharmacyAddress: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Admin Account</label>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    required
                    className="w-full px-5 py-3.5 rounded-xl border border-slate-200 focus:border-[#006C75] focus:outline-none transition-all"
                    value={formData.adminName}
                    onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    required
                    className="w-full px-5 py-3.5 rounded-xl border border-slate-200 focus:border-[#006C75] focus:outline-none transition-all"
                    value={formData.adminEmail}
                    onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    className="w-full px-5 py-3.5 rounded-xl border border-slate-200 focus:border-[#006C75] focus:outline-none transition-all font-mono"
                    placeholder="Create a secure password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  {formData.password && (
                    <div className="mt-3">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Security Strength</span>
                        <span className={`text-[10px] uppercase font-bold ${strength.score === 3 ? 'text-emerald-500' : strength.score === 2 ? 'text-amber-500' : 'text-red-400'}`}>
                          {strength.label}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
                        <div className={`h-full ${strength.color} flex-1 transition-all`}></div>
                        <div className={`h-full ${strength.score >= 2 ? strength.color : 'bg-slate-200'} flex-1 transition-all`}></div>
                        <div className={`h-full ${strength.score >= 3 ? strength.color : 'bg-slate-200'} flex-1 transition-all`}></div>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Confirm Password</label>
                  <input
                    type="password"
                    required
                    className={`w-full px-5 py-3.5 rounded-xl border-2 transition-all font-mono ${formData.confirmPassword ? (formData.password === formData.confirmPassword ? 'border-emerald-100' : 'border-red-100') : 'border-slate-200'
                      }`}
                    placeholder="Verify your password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <input
                type="checkbox"
                id="terms"
                checked={formData.agreedToTerms}
                onChange={(e) => setFormData({ ...formData, agreedToTerms: e.target.checked })}
                className="mt-1 w-5 h-5 rounded border-slate-300 text-[#006C75] focus:ring-[#006C75]"
              />
              <label htmlFor="terms" className="text-sm text-slate-600 leading-tight">
                I agree to PharmaCore's <a href="#" className="font-bold text-slate-800 hover:text-[#006C75]">Terms of Service</a> and <a href="#" className="font-bold text-slate-800 hover:text-[#006C75]">Privacy Policy</a>.
              </label>
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 flex items-center gap-3">
                <span className="material-symbols-outlined text-sm">error</span>
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !formData.password || formData.password !== formData.confirmPassword || !formData.agreedToTerms}
              className="w-full bg-[#006C75] text-white py-4 rounded-2xl font-bold shadow-lg shadow-[#006C75]/20 hover:bg-[#005a62] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Setting up your pharmacy...
                </>
              ) : (
                <>Complete Setup & Launch PharmaCore &rarr;</>
              )}
            </button>
          </form>

          <p className="mt-10 text-center text-xs text-slate-400 leading-normal">
            By completing setup, you agree to our <strong>Master Subscription Agreement</strong>. Your 30-day free trial will begin immediately.
          </p>
        </div>
      </main>

      <OnboardFooter />
    </div>
  );
}
