import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { Button } from '../components/ui/Button';
import { Scale, Sparkles, ArrowRight, CheckCircle, Wand2, PoundSterling, ShieldCheck, Zap, Calendar, MessageSquareText } from 'lucide-react';
import { useClaimStore } from '../store/claimStore';

export const LandingPage = () => {
  const navigate = useNavigate();
  const { userProfile } = useClaimStore();

  const handleEnterApp = () => {
    if (!userProfile) {
      navigate('/onboarding');
    } else {
      navigate('/dashboard');
    }
  };

  const openLegal = (tab: string) => {
      navigate(tab === 'privacy' ? '/privacy' : '/terms');
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden selection:bg-teal-100 selection:text-teal-900">
         {/* Navigation */}
         <div className="absolute top-0 left-0 right-0 z-50 py-6">
            <div className="container mx-auto px-6 flex items-center justify-between">
                <div className="flex items-center gap-2 font-display font-bold text-xl tracking-tight">
                    <div className="w-8 h-8 bg-gradient-to-tr from-teal-600 to-teal-500 rounded-lg flex items-center justify-center shadow-lg shadow-teal-500/20">
                        <Scale className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-slate-900">ClaimCraft</span>
                </div>
                <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
                    <Button variant="link" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>Features</Button>
                    <Button variant="link" onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>How it Works</Button>
                    <Button variant="link" onClick={() => openLegal('terms')}>Legal</Button>
                </div>
                <Button
                    variant="secondary"
                    onClick={handleEnterApp}
                >
                    {userProfile ? 'Continue' : 'Get Started'}
                </Button>
            </div>
         </div>

         {/* Hero Section */}
         <div className="relative pt-40 pb-20 md:pt-48 md:pb-32 overflow-hidden bg-slate-50">
            {/* Abstract Background Elements - constrained to prevent horizontal overflow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1200px] h-[800px] bg-teal-100/40 blur-[130px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-full max-w-[800px] h-[800px] bg-teal-100/40 blur-[120px] rounded-full pointer-events-none"></div>
            
            <div className="container mx-auto px-4 relative z-10 flex flex-col items-center text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-teal-100 text-teal-700 text-xs font-bold uppercase tracking-widest mb-8 hover:border-teal-200 transition-all cursor-default shadow-sm animate-fade-in">
                  <Sparkles className="w-3.5 h-3.5" /> AI-Powered Debt Recovery
                </div>
                
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-bold tracking-tight mb-8 leading-[1.1] md:leading-[1.1] text-slate-900 animate-fade-in-up animation-delay-100">
                  Recover Unpaid Debts <br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600">Without the Lawyers</span>
                </h1>
                
                <p className="text-lg md:text-xl text-slate-600 max-w-2xl mb-12 font-light leading-relaxed animate-fade-in-up animation-delay-200">
                  Generate court-ready <strong className="text-slate-900 font-medium">Letters Before Action</strong> and <strong className="text-slate-900 font-medium">Form N1 claims</strong> in minutes. 
                  Our AI handles the legal complexity, statutory interest, and compliance checks for you.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-lg z-20 animate-fade-in-up animation-delay-300">
                   <Button
                      variant="primary"
                      size="lg"
                      onClick={handleEnterApp}
                      rightIcon={<ArrowRight className="w-5 h-5" />}
                      className="w-full sm:w-auto shadow-lg shadow-teal-500/20"
                   >
                      Start Your Claim Free
                   </Button>
                   <Button
                      variant="outline"
                      size="lg"
                      onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                      className="w-full sm:w-auto"
                   >
                      See How It Works
                   </Button>
                </div>
                
                {/* Social Proof Mini */}
                <div className="mt-12 flex items-center gap-8 animate-fade-in-up animation-delay-400">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <CheckCircle className="w-4 h-4 text-teal-600" /> No Win, No Fee (Optional)
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <CheckCircle className="w-4 h-4 text-teal-600" /> UK GDPR Compliant
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <CheckCircle className="w-4 h-4 text-teal-600" /> HMCTS Approved Formats
                    </div>
                </div>
            </div>
         </div>

         {/* Trust/Stats Banner */}
         <div className="border-y border-slate-200 bg-white">
            <div className="container mx-auto px-4 py-12">
               <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                  <div className="text-center">
                     <p className="text-2xl md:text-3xl font-bold text-slate-900 mb-1">Local-first</p>
                     <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">Stored in your browser</p>
                  </div>
                  <div className="text-center">
                     <p className="text-2xl md:text-3xl font-bold text-slate-900 mb-1">Court-ready</p>
                     <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">HMCTS formats</p>
                  </div>
                  <div className="text-center">
                     <p className="text-2xl md:text-3xl font-bold text-slate-900 mb-1">Guided</p>
                     <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">Step-by-step workflow</p>
                  </div>
                  <div className="text-center">
                     <p className="text-2xl md:text-3xl font-bold text-slate-900 mb-1">Transparent</p>
                     <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">Unlock at download</p>
                  </div>
               </div>
               <p className="mt-8 text-center text-xs text-slate-400">
                 Product highlights shown above; any case outcomes depend on your facts and process compliance.
               </p>
            </div>
         </div>

         {/* Features Grid */}
         <div id="features" className="py-24 bg-slate-50 relative">
            <div className="container mx-auto px-4">
               <div className="text-center max-w-3xl mx-auto mb-16">
                  <h2 className="text-3xl md:text-4xl font-display font-bold mb-6 text-slate-900">Everything you need to get paid</h2>
                  <p className="text-slate-600 text-lg">We've codified the entire UK small claims process into a simple, intelligent workflow.</p>
               </div>

               <div className="grid md:grid-cols-3 gap-6">
                  {[
                     { 
                        icon: Wand2, 
                        color: "text-teal-600", 
                        bg: "bg-teal-50",
                        title: "AI Legal Drafting",
                        desc: "AI drafts professional Letters Before Action and N1 forms tailored to your specific case details."
                     },
                     { 
                        icon: PoundSterling, 
                        color: "text-emerald-600", 
                        bg: "bg-emerald-50",
                        title: "Smart Calculations",
                        desc: "Automatically calculate statutory interest (8% + Base), compensation fees (£40-£100), and court fees."
                     },
                     { 
                        icon: ShieldCheck, 
                        color: "text-teal-600", 
                        bg: "bg-teal-50",
                        title: "Protocol Compliance",
                        desc: "Built-in checks ensure you follow the Pre-Action Protocol, protecting your right to claim costs."
                     },
                     { 
                        icon: Zap, 
                        color: "text-amber-600", 
                        bg: "bg-amber-50",
                        title: "Instant Integration",
                        desc: "Connect Xero or upload CSVs to import invoices instantly. No manual data entry required."
                     },
                     { 
                        icon: Calendar, 
                        color: "text-red-600", 
                        bg: "bg-red-50",
                        title: "Evidence Timeline",
                        desc: "Build a rock-solid audit trail of every email, call, and invoice to prove your case in court."
                     },
                     { 
                        icon: MessageSquareText, 
                        color: "text-violet-600", 
                        bg: "bg-violet-50",
                        title: "AI Consultation",
                        desc: "Not sure about next steps? Chat with our legal AI to get instant guidance on strategy."
                     }
                  ].map((feature, i) => (
                     <div key={i} className="group p-8 rounded-2xl bg-white border border-slate-200 hover:border-teal-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                        <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                           <feature.icon className={`w-6 h-6 ${feature.color}`} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                        <p className="text-slate-500 leading-relaxed text-sm">{feature.desc}</p>
                     </div>
                  ))}
               </div>
            </div>
         </div>
         
         {/* How It Works */}
         <div id="how-it-works" className="py-24 bg-white">
            <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-display font-bold mb-4 text-slate-900">How it works</h2>
                    <p className="text-slate-600 text-lg">From unpaid invoice to court claim in 4 simple steps.</p>
                </div>
                
                <div className="grid md:grid-cols-4 gap-8">
                    {[
                        { step: "01", title: "Import Data", desc: "Connect Xero or upload your invoice details." },
                        { step: "02", title: "Build Case", desc: "Our AI helps you organize evidence and timeline." },
                        { step: "03", title: "Generate", desc: "Create compliant Letters Before Action or N1 Forms." },
                        { step: "04", title: "Recover", desc: "Send to debtor or file with HMCTS to get paid." }
                    ].map((item, i) => (
                        <div key={i} className="relative p-6 rounded-2xl bg-slate-50 border border-slate-100">
                            <div className="text-5xl font-display font-bold text-teal-100 mb-4 select-none absolute top-4 right-4">{item.step}</div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2 relative z-10">{item.title}</h3>
                            <p className="text-slate-500 text-sm relative z-10">{item.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
         </div>

         {/* CTA Section */}
         <div className="py-24 relative overflow-hidden bg-slate-900">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-900/20 to-slate-900 z-0"></div>
            <div className="container mx-auto px-4 relative z-10 text-center">
               <h2 className="text-4xl md:text-5xl font-display font-bold mb-8 text-white">Stop chasing. Start recovering.</h2>
               <p className="text-slate-300 text-lg mb-10 max-w-2xl mx-auto">
                  Join hundreds of UK businesses using ClaimCraft to recover unpaid invoices faster and cheaper than solicitors.
               </p>
               <Button
                  variant="outline"
                  size="lg"
                  onClick={handleEnterApp}
                  rightIcon={<ArrowRight className="w-5 h-5" />}
                  className="bg-white hover:bg-teal-50 shadow-lg"
               >
                  Create Your First Claim
               </Button>
            </div>
         </div>
         
         {/* Footer */}
         <footer className="border-t border-slate-200 py-12 bg-white text-slate-500 text-sm">
            <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>&copy; 2025 ClaimCraft UK. All rights reserved.</div>
                <div className="flex gap-6">
                    <Button variant="link" onClick={() => openLegal('privacy')}>Privacy Policy</Button>
                    <Button variant="link" onClick={() => openLegal('terms')}>Terms of Service</Button>
                </div>
            </div>
         </footer>
      </div>
  );
};


