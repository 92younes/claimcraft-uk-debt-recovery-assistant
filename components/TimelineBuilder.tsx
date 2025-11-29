import React, { useState } from 'react';
import { TimelineEvent } from '../types';
import { Calendar, Plus, Trash2, MessageCircle, FileText, PoundSterling, Mail, Zap, Clock, AlertCircle, Scale, CheckCircle, Truck, CreditCard } from 'lucide-react';

interface TimelineBuilderProps {
  events: TimelineEvent[];
  onChange: (events: TimelineEvent[]) => void;
  invoiceDate?: string;
}

export const TimelineBuilder: React.FC<TimelineBuilderProps> = ({ events, onChange, invoiceDate }) => {
  const [newEvent, setNewEvent] = useState<TimelineEvent>({
    date: '',
    description: '',
    type: 'communication'
  });

  const validateEventOrder = (events: TimelineEvent[]): string | null => {
    // Check for logical event sequence
    const eventTypes = events.map(e => ({ type: e.type, date: new Date(e.date).getTime() }));

    // Find key events
    const contractIdx = eventTypes.findIndex(e => e.type === 'contract');
    const serviceIdx = eventTypes.findIndex(e => e.type === 'service_delivered');
    const invoiceIdx = eventTypes.findIndex(e => e.type === 'invoice');
    const paymentDueIdx = eventTypes.findIndex(e => e.type === 'payment_due');
    const lbaIdx = eventTypes.findIndex(e => e.type === 'lba_sent');

    // Contract should come before service delivery (if both exist)
    if (contractIdx !== -1 && serviceIdx !== -1 && contractIdx > serviceIdx) {
      return 'Warning: Contract typically comes before service delivery';
    }

    // Service should come before invoice (if both exist)
    if (serviceIdx !== -1 && invoiceIdx !== -1 && serviceIdx > invoiceIdx) {
      return 'Warning: Service delivery typically comes before invoicing';
    }

    // Contract should come before invoice (if both exist)
    if (contractIdx !== -1 && invoiceIdx !== -1 && contractIdx > invoiceIdx) {
      return 'Warning: Contract event typically comes before Invoice';
    }

    // Invoice should come before payment due (if both exist)
    if (invoiceIdx !== -1 && paymentDueIdx !== -1 && invoiceIdx > paymentDueIdx) {
      return 'Warning: Invoice should be sent before Payment Due date';
    }

    // LBA should come after payment due (if both exist)
    if (lbaIdx !== -1 && paymentDueIdx !== -1 && lbaIdx < paymentDueIdx) {
      return 'Warning: Letter Before Action should be sent after payment is overdue';
    }

    return null;
  };

  const addEvent = () => {
    if (!newEvent.date || !newEvent.description) return;
    const updated = [...events, newEvent].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    onChange(updated);
    setNewEvent({ date: '', description: '', type: 'communication' });

    // Validate after adding
    const warning = validateEventOrder(updated);
    if (warning) {
      console.warn(warning);
    }
  };

  const addQuickEvent = (daysOffset: number, type: TimelineEvent['type'], descTemplate: string) => {
    if (!invoiceDate) return;
    
    const base = new Date(invoiceDate);
    if (isNaN(base.getTime())) return; // Guard against invalid dates

    base.setDate(base.getDate() + daysOffset);
    const dateStr = base.toISOString().split('T')[0];
    
    const newEv: TimelineEvent = {
        date: dateStr,
        description: descTemplate,
        type: type
    };
    
    const updated = [...events, newEv].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    onChange(updated);
  };

  const removeEvent = (index: number) => {
    const updated = [...events];
    updated.splice(index, 1);
    onChange(updated);
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'contract': return <FileText className="w-4 h-4 text-blue-400"/>;
      case 'service_delivered': return <Truck className="w-4 h-4 text-purple-400"/>;
      case 'invoice': return <FileText className="w-4 h-4 text-green-400"/>;
      case 'payment_due': return <PoundSterling className="w-4 h-4 text-red-400"/>;
      case 'part_payment': return <CreditCard className="w-4 h-4 text-emerald-400"/>;
      case 'chaser': return <Mail className="w-4 h-4 text-amber-400"/>;
      case 'lba_sent': return <Scale className="w-4 h-4 text-red-400"/>;
      case 'acknowledgment': return <CheckCircle className="w-4 h-4 text-teal-400"/>;
      default: return <MessageCircle className="w-4 h-4 text-slate-400"/>;
    }
  };

  const isValidInvoiceDate = invoiceDate && !isNaN(new Date(invoiceDate).getTime());

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
       <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-violet-500/20 rounded-lg">
            <Calendar className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Chronology of Events</h2>
            <p className="text-sm text-slate-400">Build the dispute timeline. This is critical evidence for the court.</p>
          </div>
       </div>

       {/* Quick Actions */}
       {isValidInvoiceDate ? (
         <div className="mb-6 mt-6 bg-violet-500/10 p-5 rounded-xl border border-violet-500/30">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-violet-400 uppercase tracking-wider flex items-center gap-2">
                  <Zap className="w-4 h-4" /> Quick Add Timeline Events
              </p>
              <span className="text-xs text-violet-300 bg-dark-700 px-2 py-1 rounded-md border border-violet-500/30">
                Invoice: {new Date(invoiceDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-4">Add common debt recovery events based on your invoice date:</p>
            <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => addQuickEvent(30, 'payment_due', 'Payment Due Date (30 Days)')}
                  className="flex-1 min-w-[200px] px-4 py-3 bg-dark-700 border border-dark-500 rounded-lg text-xs font-bold text-slate-300 hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-400 transition-all duration-200 flex flex-col items-start gap-1 group"
                >
                   <div className="flex items-center gap-2 w-full">
                     <Clock className="w-4 h-4 text-blue-400" />
                     <span>Payment Due Date</span>
                   </div>
                   <span className="text-[10px] text-slate-500 font-normal group-hover:text-blue-400">
                     {(() => {
                       const date = new Date(invoiceDate);
                       date.setDate(date.getDate() + 30);
                       return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                     })()}
                     {' '}(+30 days)
                   </span>
                </button>
                <button
                  onClick={() => addQuickEvent(37, 'chaser', 'First Overdue Chaser sent via Email')}
                  className="flex-1 min-w-[200px] px-4 py-3 bg-dark-700 border border-dark-500 rounded-lg text-xs font-bold text-slate-300 hover:border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-400 transition-all duration-200 flex flex-col items-start gap-1 group"
                >
                   <div className="flex items-center gap-2 w-full">
                     <Mail className="w-4 h-4 text-amber-400" />
                     <span>First Chaser Email</span>
                   </div>
                   <span className="text-[10px] text-slate-500 font-normal group-hover:text-amber-400">
                     {(() => {
                       const date = new Date(invoiceDate);
                       date.setDate(date.getDate() + 37);
                       return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                     })()}
                     {' '}(+7 days overdue)
                   </span>
                </button>
                <button
                  onClick={() => addQuickEvent(44, 'chaser', 'Final Demand sent via Email')}
                  className="flex-1 min-w-[200px] px-4 py-3 bg-dark-700 border border-dark-500 rounded-lg text-xs font-bold text-slate-300 hover:border-orange-500/50 hover:bg-orange-500/10 hover:text-orange-400 transition-all duration-200 flex flex-col items-start gap-1 group"
                >
                   <div className="flex items-center gap-2 w-full">
                     <AlertCircle className="w-4 h-4 text-orange-400" />
                     <span>Final Demand</span>
                   </div>
                   <span className="text-[10px] text-slate-500 font-normal group-hover:text-orange-400">
                     {(() => {
                       const date = new Date(invoiceDate);
                       date.setDate(date.getDate() + 44);
                       return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                     })()}
                     {' '}(+14 days overdue)
                   </span>
                </button>
                <button
                  onClick={() => addQuickEvent(58, 'lba_sent', 'Letter Before Action sent via Recorded Delivery')}
                  className="flex-1 min-w-[200px] px-4 py-3 bg-dark-700 border border-dark-500 rounded-lg text-xs font-bold text-slate-300 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 flex flex-col items-start gap-1 group"
                >
                   <div className="flex items-center gap-2 w-full">
                     <Scale className="w-4 h-4 text-red-400" />
                     <span>Letter Before Action</span>
                   </div>
                   <span className="text-[10px] text-slate-500 font-normal group-hover:text-red-400">
                     {(() => {
                       const date = new Date(invoiceDate);
                       date.setDate(date.getDate() + 58);
                       return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                     })()}
                     {' '}(+28 days overdue)
                   </span>
                   <span className="text-[10px] text-red-400 font-bold">REQUIRED before court</span>
                </button>
            </div>
            <div className="mt-3 text-[10px] text-slate-400 bg-dark-700/50 p-2 rounded border border-dark-600">
              <strong className="text-slate-300">Tip:</strong> These are typical timings for UK debt recovery. You can edit event descriptions after adding them.
            </div>
         </div>
       ) : (
          <div className="mb-6 mt-6 flex items-start gap-3 text-xs text-amber-400 bg-amber-500/10 p-4 rounded-xl border border-amber-500/30">
             <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
             <div>
               <p className="font-bold mb-1 text-amber-300">Invoice Date Required</p>
               <p className="text-amber-400/80">Set an Invoice Date in the previous step to enable Quick Add timeline events based on standard payment terms.</p>
             </div>
          </div>
       )}

      {/* Input Area */}
      <div className="bg-dark-700 p-5 rounded-xl border border-dark-600 mb-8 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
        <div className="md:col-span-3">
          <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Date</label>
          <input
            type="date"
            value={newEvent.date}
            onChange={e => setNewEvent({...newEvent, date: e.target.value})}
            className="w-full p-2.5 bg-dark-800 border border-dark-500 rounded-lg text-sm text-slate-100 focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 focus:outline-none"
          />
        </div>
        <div className="md:col-span-3">
           <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Event Type</label>
           <select
             value={newEvent.type}
             onChange={e => setNewEvent({...newEvent, type: e.target.value as any})}
             className="w-full p-2.5 bg-dark-800 border border-dark-500 rounded-lg text-sm text-slate-100 focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 focus:outline-none"
           >
             <option value="contract" className="bg-dark-700">Contract Signed</option>
             <option value="service_delivered" className="bg-dark-700">Service/Goods Delivered</option>
             <option value="invoice" className="bg-dark-700">Invoice Sent</option>
             <option value="payment_due" className="bg-dark-700">Payment Due</option>
             <option value="part_payment" className="bg-dark-700">Part Payment Received</option>
             <option value="chaser" className="bg-dark-700">Chaser / Reminder</option>
             <option value="lba_sent" className="bg-dark-700">Letter Before Action</option>
             <option value="acknowledgment" className="bg-dark-700">Debtor Acknowledged</option>
             <option value="communication" className="bg-dark-700">Other Comms</option>
           </select>
        </div>
        <div className="md:col-span-5">
           <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Description</label>
           <input
             type="text"
             placeholder="e.g. Called debtor, they promised payment by Friday"
             value={newEvent.description}
             onChange={e => setNewEvent({...newEvent, description: e.target.value})}
             className="w-full p-2.5 bg-dark-800 border border-dark-500 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 focus:outline-none"
           />
        </div>
        <div className="md:col-span-1">
          <button
            onClick={addEvent}
            disabled={!newEvent.date || !newEvent.description}
            className="w-full bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white p-2.5 rounded-lg flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:from-dark-600 disabled:to-dark-600 shadow-glow-sm"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Timeline Visual */}
      <div className="relative border-l-2 border-dark-600 ml-4 space-y-4 pb-4">
        {events.length === 0 && (
          <div className="pl-8 py-4 text-slate-500 italic text-sm border border-dashed border-dark-600 rounded-lg bg-dark-700 m-4 text-center">
             No events added yet. Use the Quick Add buttons or enter manually above.
          </div>
        )}

        {events.map((ev, idx) => (
          <div key={idx} className="relative pl-8 group animate-fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
            <div className="absolute -left-[9px] top-4 w-4 h-4 bg-dark-800 border-2 border-dark-500 rounded-full group-hover:border-violet-500 group-hover:scale-110 transition-all duration-200 z-10"></div>
            <div className="bg-dark-700 p-4 rounded-xl border border-dark-600 hover:border-violet-500/50 transition-all duration-200 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1 bg-dark-600 rounded-lg">
                    {getIcon(ev.type)}
                  </div>
                  <span className="text-xs font-bold uppercase text-slate-500 tracking-wide">{new Date(ev.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
                <p className="text-slate-200 font-medium text-sm mt-1">{ev.description}</p>
              </div>
              <button onClick={() => removeEvent(idx)} className="text-slate-600 hover:text-red-400 hover:bg-red-500/10 p-2 rounded-lg transition-colors duration-200">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};