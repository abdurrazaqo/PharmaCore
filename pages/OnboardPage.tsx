import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import Logo from '../components/Logo';

// Minimal Header for Onboarding
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
    <p>© 2026 365Health Systems Ltd. All rights reserved. | hello@365health.online</p>
  </footer>
);

export default function OnboardPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    token: '',
    code: '',
    plan: '',
    billingCycle: '',
    pharmacyName: '',
    pharmacyAddress: '',
    pharmacyEmail: '',
    pharmacyPhone: '',
    pcnNumber: '',
    contactName: '',
    contactTitle: '',
    contactPhone: '',
    whatsappNumber: '',
    sameAsPhone: false,
    agreedToTerms: false,
    isBeta: false
  });

  // Auto-verify token from URL
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      verifyCode(token, true);
    }
  }, []);

  const verifyCode = async (value: string, isFullToken = false) => {
    setIsVerifying(true);
    setError(null);
    try {
      const functionName = 'validate-access-token';
      const payload = isFullToken ? { token: value } : { code: value };
      
      const { data, error: functionError } = await supabase.functions.invoke(functionName, {
        body: payload,
      });

      if (functionError || !data.valid) {
        throw new Error(data?.error || "Invalid access code");
      }

      setFormData(prev => ({
        ...prev,
        token: isFullToken ? value : '',
        code: !isFullToken ? value : '',
        plan: data.plan,
        billingCycle: data.billing_cycle,
        pharmacyEmail: data.buyer_email === 'beta-invite@pharmacore' ? '' : (data.buyer_email || ''),
        isBeta: data.is_beta || false,
      }));
      
      setStep(2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Insert into onboarding_requests
      const { error: insertError } = await supabase
        .from('onboarding_requests')
        .insert([{
          access_code: formData.code || formData.token.substring(0, 8),
          pharmacy_name: formData.pharmacyName,
          pharmacy_address: formData.pharmacyAddress,
          pharmacy_email: formData.pharmacyEmail,
          pharmacy_phone: formData.pharmacyPhone,
          pcn_number: formData.pcnNumber || null,
          contact_person_name: formData.contactName,
          status: 'pending',
          is_beta: formData.isBeta
        }]);

      if (insertError) throw insertError;

      navigate('/onboard/pending', { state: { email: formData.pharmacyEmail } });
    } catch (err: any) {
      setError(err.message || "Failed to submit request");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper for step indicators
  const StepIndicator = () => {
    const steps = ["Access Code", "Pharmacy Info", "Contact Details", "Review"];
    return (
      <div className="mb-12">
        {/* Desktop Stepper */}
        <div className="hidden md:flex items-center justify-between max-w-2xl mx-auto relative px-4">
          {steps.map((label, index) => {
            const currentStep = index + 1;
            const isCompleted = step > currentStep;
            const isActive = step === currentStep;
            
            return (
              <React.Fragment key={label}>
                <div className="flex flex-col items-center z-10">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                    isCompleted ? 'bg-[#006C75] border-[#006C75] text-white' : 
                    isActive ? 'border-[#006C75] text-[#006C75] bg-white' : 
                    'border-slate-200 text-slate-300 bg-white'
                  }`}>
                    {isCompleted ? <span className="material-symbols-outlined text-xl">check</span> : currentStep}
                  </div>
                  <span className={`text-xs mt-2 font-semibold ${isActive ? 'text-[#006C75]' : isCompleted ? 'text-slate-600' : 'text-slate-300'}`}>
                    {label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className="flex-1 h-0.5 bg-slate-100 mx-2 -mt-6">
                    <div 
                      className="h-full bg-[#006C75] transition-all duration-500" 
                      style={{ width: isCompleted ? '100%' : '0%' }}
                    ></div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
        
        {/* Mobile Stepper */}
        <div className="md:hidden flex flex-col gap-2">
          <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-widest">
            <span>Step {step} of 4</span>
            <span>{steps[step - 1]}</span>
          </div>
          <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#006C75] transition-all duration-300" 
              style={{ width: `${(step / 4) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>
    );
  };

  if (isVerifying && step === 1) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col italic font-inter">
        <OnboardHeader />
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white border border-slate-100 rounded-2xl shadow-sm m-4 lg:m-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#006C75] border-t-transparent mb-4"></div>
            <p className="text-slate-500 font-medium">Verifying your access code...</p>
        </div>
        <OnboardFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-inter antialiased">
      <OnboardHeader />
      
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8">
        <StepIndicator />

        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden transition-all duration-500">
          
          {formData.isBeta && step > 1 && (
            <div className="bg-[#006C75] text-white p-4 text-center text-sm font-bold flex items-center justify-center gap-2 border-b border-white/10">
              <span className="material-symbols-outlined text-xl text-amber-300">stars</span>
              You've been invited as a beta tester — no payment required.
            </div>
          )}

          {/* STEP 1: VERIFY CODE */}
          {step === 1 && (
            <div className="p-8 md:p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-3xl text-slate-400">confirmation_number</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Enter Your Access Code</h2>
              <p className="text-slate-500 mb-8 max-w-sm mx-auto">Enter the 8-digit access code you received in your email after payment.</p>
              
              <div className="max-w-xs mx-auto mb-6">
                <input 
                  type="text"
                  placeholder="PHC-XXXX-XXXX"
                  className="w-full text-center text-2xl font-bold tracking-[0.2em] font-mono py-4 px-6 rounded-2xl border-2 border-slate-200 focus:border-[#006C75] focus:outline-none uppercase transition-all"
                  value={formData.code}
                  onChange={(e) => {
                    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    if (val.length > 3 && val.length <= 7) val = val.slice(0, 3) + '-' + val.slice(3);
                    if (val.length > 7) val = val.slice(0, 3) + '-' + val.slice(3, 7) + '-' + val.slice(7, 11);
                    setFormData({...formData, code: val.slice(0, 13)});
                  }}
                />
                {error && <p className="text-red-500 text-sm mt-3 font-medium">{error}</p>}
              </div>

              <button 
                onClick={() => verifyCode(formData.code)}
                disabled={formData.code.length < 10 || isVerifying}
                className="w-full max-w-xs bg-[#006C75] text-white py-4 rounded-2xl font-bold shadow-lg shadow-[#006C75]/20 hover:bg-[#005a62] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isVerifying ? 'Verifying...' : 'Verify Access Code'}
                {!isVerifying && <span className="material-symbols-outlined">arrow_forward</span>}
              </button>
              
              <p className="mt-8 text-sm text-slate-400">
                Lost your code? Contact support at <a href="mailto:hello@365health.online" className="text-[#006C75] hover:underline font-medium">hello@365health.online</a>
              </p>
            </div>
          )}

          {/* STEP 2: PHARMACY INFO */}
          {step === 2 && (
            <div className="p-8 md:p-12">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Pharmacy Details</h2>
                  <p className="text-slate-500">Provide the official registration details for your pharmacy.</p>
                </div>
                <div className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-bold border border-emerald-100 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">verified</span>
                  Access Verified
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Pharmacy Name</label>
                  <input 
                    type="text" 
                    className="w-full px-5 py-3.5 rounded-xl border border-slate-200 focus:border-[#006C75] focus:outline-none transition-all"
                    placeholder="e.g. Green Leaf Pharmacy"
                    value={formData.pharmacyName}
                    onChange={(e) => setFormData({...formData, pharmacyName: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Physical Address</label>
                  <textarea 
                    rows={3}
                    className="w-full px-5 py-3.5 rounded-xl border border-slate-200 focus:border-[#006C75] focus:outline-none transition-all resize-none"
                    placeholder="Street, City, State"
                    value={formData.pharmacyAddress}
                    onChange={(e) => setFormData({...formData, pharmacyAddress: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Contact Email</label>
                    <input 
                      type="email" 
                      className="w-full px-5 py-3.5 rounded-xl border border-slate-200 focus:border-[#006C75] focus:outline-none transition-all"
                      placeholder="pharmacy@example.com"
                      value={formData.pharmacyEmail}
                      onChange={(e) => setFormData({...formData, pharmacyEmail: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Pharmacy Phone</label>
                    <input 
                      type="tel" 
                      className="w-full px-5 py-3.5 rounded-xl border border-slate-200 focus:border-[#006C75] focus:outline-none transition-all"
                      placeholder="080 1234 5678"
                      value={formData.pharmacyPhone}
                      onChange={(e) => setFormData({...formData, pharmacyPhone: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                    PCN Registration Number
                    <span className="text-slate-400 font-normal">(Optional)</span>
                    <span className="material-symbols-outlined text-slate-300 text-sm cursor-help" title="Your PCN registration number helps us verify your pharmacy faster">info</span>
                  </label>
                  <input 
                    type="text" 
                    className="w-full px-5 py-3.5 rounded-xl border border-slate-200 focus:border-[#006C75] focus:outline-none transition-all uppercase"
                    placeholder="e.g. RUW-12345"
                    value={formData.pcnNumber}
                    onChange={(e) => setFormData({...formData, pcnNumber: e.target.value})}
                  />
                </div>
              </div>

              <div className="mt-12 flex gap-4">
                <button onClick={() => setStep(1)} className="flex-1 bg-slate-100 text-slate-600 font-bold py-4 rounded-2xl hover:bg-slate-200 transition-all">Back</button>
                <button 
                  onClick={() => setStep(3)}
                  disabled={!formData.pharmacyName || !formData.pharmacyAddress || !formData.pharmacyEmail || !formData.pharmacyPhone}
                  className="flex-[2] bg-[#006C75] text-white font-bold py-4 rounded-2xl shadow-lg shadow-[#006C75]/20 hover:bg-[#005a62] disabled:opacity-50 transition-all"
                >
                  Save & Continue
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: CONTACT INFO */}
          {step === 3 && (
            <div className="p-8 md:p-12">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Contact Person</h2>
                <p className="text-slate-500">Who will be the primary administrator for this account?</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Your Full Name</label>
                  <input 
                    type="text" 
                    className="w-full px-5 py-3.5 rounded-xl border border-slate-200 focus:border-[#006C75] focus:outline-none transition-all"
                    placeholder="e.g. John Doe"
                    value={formData.contactName}
                    onChange={(e) => setFormData({...formData, contactName: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                    Job Title
                    <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input 
                    type="text" 
                    className="w-full px-5 py-3.5 rounded-xl border border-slate-200 focus:border-[#006C75] focus:outline-none transition-all"
                    placeholder="e.g. Pharmacist-in-Charge"
                    value={formData.contactTitle}
                    onChange={(e) => setFormData({...formData, contactTitle: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Contact Phone Number</label>
                  <input 
                    type="tel" 
                    className="w-full px-5 py-3.5 rounded-xl border border-slate-200 focus:border-[#006C75] focus:outline-none transition-all"
                    placeholder="080 1234 5678"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({...formData, contactPhone: e.target.value})}
                  />
                </div>
                
                <div className="pt-4 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <div className="h-6 flex items-center">
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 accent-[#006C75] rounded cursor-pointer"
                        checked={formData.sameAsPhone}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setFormData({
                            ...formData, 
                            sameAsPhone: checked,
                            whatsappNumber: checked ? formData.contactPhone : ''
                          });
                        }}
                      />
                    </div>
                    <div>
                      <span className="block text-sm font-bold text-slate-700">Same as WhatsApp</span>
                      <span className="block text-xs text-slate-400">We'll use this for important notifications</span>
                    </div>
                  </label>
                  
                  {!formData.sameAsPhone && (
                    <div className="mt-4">
                      <label className="block text-sm font-bold text-slate-700 mb-2">WhatsApp Number</label>
                      <input 
                        type="tel" 
                        className="w-full px-5 py-3.5 rounded-xl border border-slate-200 focus:border-[#006C75] bg-white transition-all shadow-sm"
                        placeholder="080 1234 5678"
                        value={formData.whatsappNumber}
                        onChange={(e) => setFormData({...formData, whatsappNumber: e.target.value})}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-12 flex gap-4">
                <button onClick={() => setStep(2)} className="flex-1 bg-slate-100 text-slate-600 font-bold py-4 rounded-2xl hover:bg-slate-200 transition-all">Back</button>
                <button 
                  onClick={() => setStep(4)}
                  disabled={!formData.contactName || !formData.contactPhone}
                  className="flex-[2] bg-[#006C75] text-white font-bold py-4 rounded-2xl shadow-lg shadow-[#006C75]/20 hover:bg-[#005a62] disabled:opacity-50 transition-all"
                >
                  Review Application
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW */}
          {step === 4 && (
            <div className="p-8 md:p-12">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Review Your Details</h2>
                <p className="text-slate-500">Please verify your information before submitting.</p>
              </div>

              <div className="space-y-6">
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 relative group">
                  <button onClick={() => setStep(2)} className="absolute top-4 right-4 text-xs font-bold text-[#006C75] bg-teal-50 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">EDIT</button>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Pharmacy Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Pharmacy Name</p>
                      <p className="font-bold text-slate-800">{formData.pharmacyName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">PCN Number</p>
                      <p className="font-bold text-slate-800">{formData.pcnNumber || 'N/A'}</p>
                    </div>
                    <div className="md:col-span-2">
                       <p className="text-xs text-slate-500 mb-0.5">Address</p>
                       <p className="font-bold text-slate-800">{formData.pharmacyAddress}</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 relative group">
                  <button onClick={() => setStep(3)} className="absolute top-4 right-4 text-xs font-bold text-[#006C75] bg-teal-50 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">EDIT</button>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Contact Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Full Name</p>
                      <p className="font-bold text-slate-800">{formData.contactName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Job Title</p>
                      <p className="font-bold text-slate-800">{formData.contactTitle || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Email</p>
                      <p className="font-bold text-slate-800">{formData.pharmacyEmail}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Phone</p>
                      <p className="font-bold text-slate-800">{formData.contactPhone}</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-[#006C75] rounded-2xl text-white">
                  <h3 className="text-xs font-bold text-teal-200 uppercase tracking-widest mb-4">Plan Summary</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold capitalize">{formData.plan} Plan</p>
                      <p className="text-sm text-teal-100 capitalize">
                        {formData.isBeta ? 'Beta Trial Access | No Payment Required' : `${formData.billingCycle}ly billing | 30-day free trial`}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                       <span className="material-symbols-outlined">stars</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex items-start gap-3">
                  <div className="h-6 flex items-center">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 accent-[#006C75] rounded cursor-pointer"
                      checked={formData.agreedToTerms}
                      onChange={(e) => setFormData({...formData, agreedToTerms: e.target.checked})}
                    />
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    I confirm that the information provided is accurate and I agree to PharmaCore's <a href="#" className="font-bold text-[#006C75] hover:underline">Terms of Service</a> and <a href="#" className="font-bold text-[#006C75] hover:underline">Privacy Policy</a>.
                  </p>
                </div>
              </div>

              {error && (
                <div className="mt-8 p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3 border border-red-100">
                  <span className="material-symbols-outlined">error</span>
                  <span className="text-sm font-medium">{error}</span>
                </div>
              )}

              <div className="mt-12 flex gap-4">
                <button onClick={() => setStep(3)} className="flex-1 bg-slate-100 text-slate-600 font-bold py-4 rounded-2xl hover:bg-slate-200 transition-all">Back</button>
                <button 
                  onClick={handleSubmit}
                  disabled={!formData.agreedToTerms || isLoading}
                  className="flex-[2] bg-[#006C75] text-white font-bold py-4 rounded-2xl shadow-lg shadow-[#006C75]/20 hover:bg-[#005a62] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Submitting...
                    </>
                  ) : (
                    <>Submit Application</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <OnboardFooter />
    </div>
  );
}
