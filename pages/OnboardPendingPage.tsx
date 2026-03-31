import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import Logo from '../components/Logo';

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

export default function OnboardPendingPage() {
  const location = useLocation();
  const email = location.state?.email;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-inter">
      <OnboardHeader />
      
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 md:p-12 text-center">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
            <span className="material-symbols-outlined text-emerald-600 text-4xl font-bold">check_circle</span>
          </div>

          <h2 className="text-3xl font-bold text-slate-900 mb-4">Application Submitted!</h2>
          <p className="text-slate-500 text-lg mb-8 leading-relaxed">
            We've received your pharmacy registration request. Our team will review your application and get back to you within 24 hours.
          </p>

          <div className="bg-slate-50 rounded-2xl p-6 text-left mb-8 border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#006C75]">info</span>
              What happens next?
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-teal-100 text-[#006C75] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</div>
                <p className="text-sm text-slate-600">Our team reviews your pharmacy registration and PCN details for verification.</p>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-teal-100 text-[#006C75] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</div>
                <p className="text-sm text-slate-600">
                  You'll receive an approval email at <strong className="text-slate-900">{email || 'your email'}</strong> with your secure setup link.
                </p>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-teal-100 text-[#006C75] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</div>
                <p className="text-sm text-slate-600">Follow the link to create your admin account and start your 30-day free trial.</p>
              </li>
            </ul>
          </div>

          <p className="text-slate-400 text-sm">
            Questions? Contact us at <a href="mailto:hello@365health.online" className="text-[#006C75] hover:underline font-bold">hello@365health.online</a>
          </p>
        </div>
      </main>

      <OnboardFooter />
    </div>
  );
}
