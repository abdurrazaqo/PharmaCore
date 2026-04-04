import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabaseClient';
import { UserRole } from '../../types';
import Logo from '../Logo';

interface OnboardingWizardProps {
  onComplete: () => void;
}

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { profile } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    pharmacyName: '',
    pharmacyEmail: '',
    pharmacyPhone: '',
    pharmacyAddress: '',
    pcnNumber: '',
    logoUrl: '',
    logoFile: null as File | null,
    branchName: '',
    branchLocation: '',
    staffName: '',
    staffEmail: '',
    staffPassword: '',
    staffRole: UserRole.CASHIER,
    createdBranchId: ''
  });

  const [wizardSummary, setWizardSummary] = useState({
    branchName: '',
    staffAddedCount: 0
  });

  useEffect(() => {
    fetchTenantData();
  }, []);

  const fetchTenantData = async () => {
    try {
      if (!profile?.tenant?.id) return;
      
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', profile.tenant.id)
        .single();
        
      if (error) throw error;
      
      setFormData(prev => ({
        ...prev,
        pharmacyName: data.name || '',
        pharmacyEmail: data.pharmacy_email || '',
        pharmacyPhone: data.pharmacy_phone || '',
        pharmacyAddress: data.pharmacy_address || '',
        pcnNumber: data.pcn_number || '',
        logoUrl: data.logo_url || ''
      }));
    } catch (err: any) {
      console.error('Failed to load tenant data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const goToNextStep = () => {
    setError(null);
    setCurrentStep(prev => prev + 1);
  };
  
  const goToPreviousStep = () => {
    setError(null);
    setCurrentStep(prev => prev - 1);
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      if (!profile?.tenant?.id) throw new Error('Tenant ID missing');

      let uploadedLogoUrl = formData.logoUrl;

      // Handle logo upload if a new file was selected
      if (formData.logoFile) {
        const fileExt = formData.logoFile.name.split('.').pop();
        const fileName = `${profile.tenant.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('pharmacy-logos')
          .upload(filePath, formData.logoFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('pharmacy-logos')
          .getPublicUrl(filePath);
          
        uploadedLogoUrl = publicUrlData.publicUrl;
        setFormData(prev => ({ ...prev, logoUrl: uploadedLogoUrl }));
      }

      // Update tenant record
      const { error: updateError } = await supabase
        .from('tenants')
        .update({
          name: formData.pharmacyName,
          pharmacy_email: formData.pharmacyEmail,
          pharmacy_phone: formData.pharmacyPhone,
          pharmacy_address: formData.pharmacyAddress,
          pcn_number: formData.pcnNumber,
          logo_url: uploadedLogoUrl
        })
        .eq('id', profile.tenant.id);

      if (updateError) throw updateError;
      
      goToNextStep();
    } catch (err: any) {
      setError(err.message || 'Failed to save pharmacy profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStep3Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      if (!profile?.tenant?.id) throw new Error('Tenant ID missing');

      // Create first branch
      const { data, error } = await supabase
        .from('branches')
        .insert([{
          tenant_id: profile.tenant.id,
          name: formData.branchName,
          location: formData.branchLocation || null
        }])
        .select()
        .single();

      if (error) throw error;
      
      setFormData(prev => ({ ...prev, createdBranchId: data.id }));
      setWizardSummary(prev => ({ ...prev, branchName: data.name }));
      goToNextStep();
    } catch (err: any) {
      setError(err.message || 'Failed to create branch. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStep4Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      if (!profile?.tenant?.id) throw new Error('Tenant ID missing');

      const payload = {
        email: formData.staffEmail,
        password: formData.staffPassword,
        display_name: formData.staffName,
        role: formData.staffRole,
        tenant_id: profile.tenant.id,
        branch_id: formData.createdBranchId
      };

      const { data, error } = await supabase.functions.invoke('create-user', {
        body: payload
      });

      if (error || data?.error) throw error || new Error(data?.error);

      setWizardSummary(prev => ({ ...prev, staffAddedCount: 1 }));
      goToNextStep();
    } catch (err: any) {
      setError(err.message || 'Failed to create user. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const completeOnboarding = async () => {
    setIsSaving(true);
    setError(null);
    try {
      if (!profile?.tenant?.id) throw new Error('Tenant ID missing');

      const { data, error: functionError } = await supabase.functions.invoke('finalize-onboarding');

      if (functionError || !data?.success) {
        const errorDetail = data?.error || functionError?.message || 'Failed to finalize setup.';
        console.error('Finalization failure:', { data, functionError });
        throw new Error(errorDetail);
      }
      
      console.log('Finalization success:', data);
      onComplete(); // Triggers a profile refresh and unmounts the wizard
    } catch (err: any) {
      setError(err.message || 'Failed to finalize setup.');
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-12 shadow-2xl flex flex-col items-center max-w-sm w-full">
          <div className="w-12 h-12 border-4 border-[#006C75]/30 border-t-[#006C75] rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 font-medium">Preparing your setup...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-50 z-[100] flex flex-col font-inter overflow-y-auto">
      {/* Wizard Header / Progress */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Logo size="sm" />
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map(step => (
              <div key={step} className="flex items-center">
                <div className={`w-2.5 h-2.5 rounded-full transition-colors ${currentStep === step ? 'bg-[#006C75] scale-125' : currentStep > step ? 'bg-[#006C75]/50' : 'bg-slate-200'}`} />
                {step < 5 && <div className={`w-8 h-px mx-1 transition-colors ${currentStep > step ? 'bg-[#006C75]/50' : 'bg-slate-200'}`} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 min-h-[calc(100vh-80px)]">
        
        {/* Step 1: Welcome */}
        {currentStep === 1 && (
          <div className="max-w-lg w-full text-center animate-in slide-in-from-bottom-4 duration-500 fade-in">
            <div className="w-24 h-24 bg-[#006C75]/10 rounded-full flex flex-col items-center justify-center mx-auto mb-8 relative">
              <span className="material-symbols-outlined text-5xl text-[#006C75]">waving_hand</span>
            </div>
            <h1 className="text-4xl font-bold text-slate-900 mb-4">You're all set up!</h1>
            <p className="text-lg text-slate-600 mb-8 leading-relaxed">
              Welcome to PharmaCore, <strong>{formData.pharmacyName}</strong>! Let's take a few minutes to configure your pharmacy. This will help you get the most out of our platform from day one.
            </p>
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 mb-8 text-left flex items-start gap-4">
              <span className="material-symbols-outlined text-blue-500 mt-1">info</span>
              <div>
                <h4 className="font-bold text-blue-900 mb-1">Your Subscription</h4>
                <p className="text-blue-800 text-sm">You're on the <strong>{profile?.tenant?.plan?.toUpperCase()}</strong> plan with 30 days free trial ending <strong>{new Date(profile?.tenant?.trial_ends_at || Date.now()).toLocaleDateString()}</strong>.</p>
              </div>
            </div>
            <button
              onClick={goToNextStep}
              className="w-full bg-[#006C75] text-white py-4 rounded-2xl font-bold shadow-lg shadow-[#006C75]/20 hover:bg-[#005a62] transition-all text-lg flex items-center justify-center gap-2"
            >
              Let's Go <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        )}

        {/* Step 2: Pharmacy Profile */}
        {currentStep === 2 && (
          <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 md:p-12 animate-in slide-in-from-right-8 duration-300 fade-in">
            <div className="mb-8 select-none">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Complete your pharmacy profile</h2>
              <p className="text-slate-500">Ensure your contact details and branding are correct. This will be visible on your receipts.</p>
            </div>
            
            <form onSubmit={handleStep2Submit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Pharmacy Name *</label>
                  <input required type="text" value={formData.pharmacyName} onChange={e => setFormData({...formData, pharmacyName: e.target.value})} className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:border-[#006C75] focus:outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Contact Email *</label>
                  <input required type="email" value={formData.pharmacyEmail} onChange={e => setFormData({...formData, pharmacyEmail: e.target.value})} className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:border-[#006C75] focus:outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Phone Number *</label>
                  <input required type="tel" value={formData.pharmacyPhone} onChange={e => setFormData({...formData, pharmacyPhone: e.target.value})} className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:border-[#006C75] focus:outline-none transition-all" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Physical Address *</label>
                  <input required type="text" value={formData.pharmacyAddress} onChange={e => setFormData({...formData, pharmacyAddress: e.target.value})} className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:border-[#006C75] focus:outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">PCN Number <span className="text-slate-400 font-normal">(Optional)</span></label>
                  <input type="text" value={formData.pcnNumber} onChange={e => setFormData({...formData, pcnNumber: e.target.value})} className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:border-[#006C75] focus:outline-none transition-all" placeholder="e.g. PCN-123456" />
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100">
                <label className="block text-sm font-bold text-slate-700 mb-2">Pharmacy Logo <span className="text-slate-400 font-normal">(Optional)</span></label>
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden shrink-0">
                    {formData.logoFile ? (
                      <img src={URL.createObjectURL(formData.logoFile)} alt="Logo Preview" className="w-full h-full object-cover" />
                    ) : formData.logoUrl ? (
                      <img src={formData.logoUrl} alt="Current Logo" className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-slate-400 text-3xl">add_photo_alternate</span>
                    )}
                  </div>
                  <div>
                    <input 
                      type="file" 
                      id="logo-upload" 
                      accept="image/png, image/jpeg, image/webp"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          if (file.size > 2 * 1024 * 1024) {
                            setError('Logo must be smaller than 2MB');
                            return;
                          }
                          setFormData({...formData, logoFile: file});
                          setError(null);
                        }
                      }}
                    />
                    <label htmlFor="logo-upload" className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold transition-colors cursor-pointer inline-block mb-1">
                      Choose Image
                    </label>
                    <p className="text-xs text-slate-500">PNG, JPG, or WEBP up to 2MB. Square image recommended.</p>
                  </div>
                </div>
              </div>

              {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

              <div className="flex justify-between items-center pt-6">
                <button type="button" onClick={goToPreviousStep} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors">
                  &larr; Back
                </button>
                <button type="submit" disabled={isSaving} className="px-8 py-3 bg-[#006C75] text-white rounded-xl font-bold hover:bg-[#005a62] transition-colors disabled:opacity-50 flex items-center gap-2">
                  {isSaving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Saving...</> : 'Save & Continue'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 3: Set Up First Branch */}
        {currentStep === 3 && (
          <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 md:p-12 animate-in slide-in-from-right-8 duration-300 fade-in">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Set up your first branch</h2>
              <p className="text-slate-500">A branch represents a physical pharmacy location. All sales and inventory are linked to a specific branch.</p>
            </div>
            
            <form onSubmit={handleStep3Submit} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Branch Name *</label>
                <input required type="text" value={formData.branchName} onChange={e => setFormData({...formData, branchName: e.target.value})} className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:border-[#006C75] focus:outline-none transition-all" placeholder="e.g. Main Branch, Ikeja Branch" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Branch Location Address <span className="text-slate-400 font-normal">(Optional)</span></label>
                <input type="text" value={formData.branchLocation} onChange={e => setFormData({...formData, branchLocation: e.target.value})} className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:border-[#006C75] focus:outline-none transition-all" placeholder="Where is this branch located?" />
              </div>
              
              {profile?.tenant?.plan === 'basic' ? (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-500 flex gap-3">
                  <span className="material-symbols-outlined text-slate-400">info</span>
                  <p>Your Basic plan includes 1 branch. Upgrade your plan later to manage multiple locations.</p>
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic mt-2">You can add more branches later from your dashboard settings.</p>
              )}

              {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

              <div className="flex justify-between items-center pt-6">
                <button type="button" onClick={goToPreviousStep} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors">
                  &larr; Back
                </button>
                <button type="submit" disabled={isSaving || !formData.branchName} className="px-8 py-3 bg-[#006C75] text-white rounded-xl font-bold hover:bg-[#005a62] transition-colors disabled:opacity-50 flex items-center gap-2">
                  {isSaving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Creating branch...</> : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 4: Add First Staff User */}
        {currentStep === 4 && (
          <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 md:p-12 animate-in slide-in-from-right-8 duration-300 fade-in">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Add your first team member</h2>
              <p className="text-slate-500">You can safely skip this step and add users later from the User Management section.</p>
            </div>
            
            {wizardSummary.staffAddedCount > 0 ? (
              <div className="text-center p-8 border-2 border-dashed border-[#006C75]/20 rounded-2xl bg-[#006C75]/5 mb-6">
                <span className="material-symbols-outlined justify-center flex text-4xl text-[#006C75] mb-2">person_add</span>
                <h3 className="text-lg font-bold text-[#006C75]">User Added Successfully</h3>
                <p className="text-slate-500 text-sm mb-4">You can add another or proceed to dashboard.</p>
                <button onClick={() => setWizardSummary(prev => ({...prev, staffAddedCount: 0}))} className="px-4 py-2 bg-white rounded-lg shadow-sm border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50">Add Another User</button>
              </div>
            ) : (
              <form onSubmit={handleStep4Submit} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Full Name</label>
                  <input required type="text" value={formData.staffName} onChange={e => setFormData({...formData, staffName: e.target.value})} className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:border-[#006C75] focus:outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
                  <input required type="email" value={formData.staffEmail} onChange={e => setFormData({...formData, staffEmail: e.target.value})} className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:border-[#006C75] focus:outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Temporary Password</label>
                  <input required type="password" value={formData.staffPassword} onChange={e => setFormData({...formData, staffPassword: e.target.value})} className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:border-[#006C75] focus:outline-none transition-all" minLength={6} placeholder="Min 6 characters" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Role</label>
                  <select required value={formData.staffRole} onChange={e => setFormData({...formData, staffRole: e.target.value as UserRole})} className="w-full px-5 py-3 rounded-xl border border-slate-200 focus:border-[#006C75] focus:outline-none transition-all bg-white capitalize">
                    {[UserRole.BRANCH_ADMIN, UserRole.PHARMACIST, UserRole.PHARMACY_TECHNICIAN, UserRole.CASHIER].map(role => (
                      <option key={role} value={role}>{role.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-sm font-medium text-slate-700">Branch Assignment</p>
                  <p className="text-xs text-slate-500 mt-1">This user will be automatically assigned to <strong>{formData.branchName}</strong>.</p>
                </div>

                {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

                <div className="flex justify-between items-center pt-6">
                  <button type="button" onClick={goToPreviousStep} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors">
                    &larr; Back
                  </button>
                  <button type="submit" disabled={isSaving} className="px-8 py-3 bg-[#006C75] text-white rounded-xl font-bold hover:bg-[#005a62] transition-colors disabled:opacity-50 flex items-center gap-2">
                    {isSaving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Adding...</> : 'Add User'}
                  </button>
                </div>
              </form>
            )}
            
            {/* Skip Button (visible whether user added or not) */}
            <div className="mt-6 flex justify-center">
              <button 
                type="button" 
                onClick={goToNextStep} 
                disabled={isSaving}
                className="text-slate-400 font-bold hover:text-slate-600 transition-colors flex items-center justify-center gap-1 group"
              >
                Skip for now <span className="material-symbols-outlined text-sm pt-0.5 group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 5: You're Ready */}
        {currentStep === 5 && (
          <div className="max-w-lg w-full text-center animate-in zoom-in-95 duration-500 fade-in">
            <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-8 relative">
              <span className="material-symbols-outlined text-5xl text-emerald-600">rocket_launch</span>
              <div className="absolute inset-0 rounded-full animate-ping bg-emerald-100 opacity-50 -z-10"></div>
            </div>
            
            <h1 className="text-4xl font-bold text-slate-900 mb-4 tracking-tight">Your pharmacy is ready to go!</h1>
            
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-8 mt-8 text-left space-y-3">
              <div className="flex items-center gap-3 text-slate-700">
                <span className="material-symbols-outlined text-emerald-500 font-bold">check_circle</span>
                <span>Pharmacy profile configured</span>
              </div>
              <div className="flex items-center gap-3 text-slate-700">
                <span className="material-symbols-outlined text-emerald-500 font-bold">check_circle</span>
                <span><strong>{wizardSummary.branchName}</strong> branch created</span>
              </div>
              <div className="flex items-center gap-3 text-slate-700">
                <span className="material-symbols-outlined text-emerald-500 font-bold">check_circle</span>
                <span>{wizardSummary.staffAddedCount > 0 ? `${wizardSummary.staffAddedCount} team member(s) added` : 'No team members added yet'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-8">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-left hover:border-slate-300 transition-colors cursor-default">
                <span className="material-symbols-outlined text-[#006C75] mb-2 block">inventory_2</span>
                <p className="text-sm font-bold text-slate-800">Add Inventory</p>
                <p className="text-xs text-slate-500">Import or add products</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-left hover:border-slate-300 transition-colors cursor-default">
                <span className="material-symbols-outlined text-[#006C75] mb-2 block">point_of_sale</span>
                <p className="text-sm font-bold text-slate-800">Make a Sale</p>
                <p className="text-xs text-slate-500">Go to Point of Sale</p>
              </div>
            </div>

            {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm mb-4">{error}</div>}

            <button
              onClick={completeOnboarding}
              disabled={isSaving}
              className="w-full bg-[#006C75] text-white py-4 rounded-2xl font-bold shadow-lg shadow-[#006C75]/20 hover:bg-[#005a62] transition-all text-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Loading Dashboard...</>
              ) : (
                'Go to Dashboard'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
