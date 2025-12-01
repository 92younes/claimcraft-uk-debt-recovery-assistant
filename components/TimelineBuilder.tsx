import React, { useState, useEffect } from 'react';
import { TimelineEvent } from '../types';
import { Calendar, Plus, Trash2, MessageCircle, FileText, PoundSterling, Mail, Zap, Clock, AlertCircle, Scale, CheckCircle, Truck, CreditCard, AlertTriangle } from 'lucide-react';

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
  const [orderWarning, setOrderWarning] = useState<string | null>(null);

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

  // Validate event order whenever events change
  useEffect(() => {
    if (events.length >= 2) {
      const warning = validateEventOrder(events);
      setOrderWarning(warning);
    } else {
      setOrderWarning(null);
    }
  }, [events]);

  const addEvent = () => {
    if (!newEvent.date || !newEvent.description) return;
    const updated = [...events, newEvent].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    onChange(updated);
    setNewEvent({ date: '', description: '', type: 'communication' });
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
      case 'contract': return <FileText className="w-4 h-4 text-blue-500"/>;
      case 'service_delivered': return <Truck className="w-4 h-4 text-purple-500"/>;
      case 'invoice': return <FileText className="w-4 h-4 text-green-500"/>;
      case 'payment_due': return <PoundSterling className="w-4 h-4 text-red-500"/>;
      case 'part_payment': return <CreditCard className="w-4 h-4 text-emerald-500"/>;
      case 'chaser': return <Mail className="w-4 h-4 text-amber-500"/>;
      case 'lba_sent': return <Scale className="w-4 h-4 text-red-500"/>;
      case 'acknowledgment': return <CheckCircle className="w-4 h-4 text-teal-500"/>;
      default: return <MessageCircle className="w-4 h-4 text-slate-500"/>;
    }
  };

  const isValidInvoiceDate = invoiceDate && !isNaN(new Date(invoiceDate).getTime());

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
       <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-emerald-100 rounded-xl">
            <Calendar className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 font-display">Chronology of Events</h2>
            <p className="text-sm text-slate-500">Build the dispute timeline. This is critical evidence for the court.</p>
          </div>
       </div>

       {/* Quick Actions */}
       {isValidInvoiceDate ? (
         <div className="mb-6 mt-6 bg-emerald-50 p-5 rounded-xl border border-emerald-200">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-2">
                  <Zap className="w-4 h-4" /> Quick Add Timeline Events
              </p>
              <span className="text-xs text-emerald-600 bg-white px-2 py-1 rounded-lg border border-emerald-200 font-mono">
                Invoice: {new Date(invoiceDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
            <p className="text-xs text-slate-600 mb-4">Add common debt recovery events based on your invoice date:</p>
            <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => addQuickEvent(30, 'payment_due', 'Payment Due Date (30 Days)')}
                  className="flex-1 min-w-[200px] px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 flex flex-col items-start gap-1 group shadow-sm"
                >
                   <div className="flex items-center gap-2 w-full">
                     <Clock className="w-4 h-4 text-blue-500" />
                     <span>Payment Due Date</span>
                   </div>
                   <span className="text-[10px] text-slate-500 font-normal group-hover:text-blue-500">
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
                  className="flex-1 min-w-[200px] px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-600 transition-all duration-200 flex flex-col items-start gap-1 group shadow-sm"
                >
                   <div className="flex items-center gap-2 w-full">
                     <Mail className="w-4 h-4 text-amber-500" />
                     <span>First Chaser Email</span>
                   </div>
                   <span className="text-[10px] text-slate-500 font-normal group-hover:text-amber-500">
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
                  className="flex-1 min-w-[200px] px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:border-orange-400 hover:bg-orange-50 hover:text-orange-600 transition-all duration-200 flex flex-col items-start gap-1 group shadow-sm"
                >
                   <div className="flex items-center gap-2 w-full">
                     <AlertCircle className="w-4 h-4 text-orange-500" />
                     <span>Final Demand</span>
                   </div>
                   <span className="text-[10px] text-slate-500 font-normal group-hover:text-orange-500">
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
                  className="flex-1 min-w-[200px] px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:border-red-400 hover:bg-red-50 hover:text-red-600 transition-all duration-200 flex flex-col items-start gap-1 group shadow-sm"
                >
                   <div className="flex items-center gap-2 w-full">
                     <Scale className="w-4 h-4 text-red-500" />
                     <span>Letter Before Action</span>
                   </div>
                   <span className="text-[10px] text-slate-500 font-normal group-hover:text-red-500">
                     {(() => {
                       const date = new Date(invoiceDate);
                       date.setDate(date.getDate() + 58);
                       return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                     })()}
                     {' '}(+28 days overdue)
                   </span>
                   <span className="text-[10px] text-red-500 font-bold">REQUIRED before court</span>
                </button>
            </div>
            <div className="mt-3 text-[10px] text-slate-500 bg-white p-2 rounded-lg border border-slate-200">
              <strong className="text-slate-700">Tip:</strong> These are typical timings for UK debt recovery. You can edit event descriptions after adding them.
            </div>
         </div>
       ) : (
          <div className="mb-6 mt-6 flex items-start gap-3 text-xs text-amber-700 bg-amber-50 p-4 rounded-xl border border-amber-200">
             <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
             <div>
               <p className="font-bold mb-1 text-amber-800">Invoice Date Required</p>
               <p className="text-amber-600">Set an Invoice Date in the previous step to enable Quick Add timeline events based on standard payment terms.</p>
             </div>
          </div>
       )}

      {/* Input Area */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 mb-8 grid grid-cols-1 md:grid-cols-12 gap-4 items-end shadow-sm">
        <div className="md:col-span-3">
          <label className="text-xs font-bold text-slate-500 uppercase mb-1 block tracking-wider">Date</label>
          <input
            type="date"
            value={newEvent.date}
            onChange={e => setNewEvent({...newEvent, date: e.target.value})}
            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:outline-none transition-colors"
          />
        </div>
        <div className="md:col-span-3">
           <label className="text-xs font-bold text-slate-500 uppercase mb-1 block tracking-wider">Event Type</label>
           <select
             value={newEvent.type}
             onChange={e => setNewEvent({...newEvent, type: e.target.value as any})}
             className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:outline-none transition-colors"
           >
             <option value="contract">Contract Signed</option>
             <option value="service_delivered">Service/Goods Delivered</option>
             <option value="invoice">Invoice Sent</option>
             <option value="payment_due">Payment Due</option>
             <option value="part_payment">Part Payment Received</option>
             <option value="chaser">Chaser / Reminder</option>
             <option value="lba_sent">Letter Before Action</option>
             <option value="acknowledgment">Debtor Acknowledged</option>
             <option value="communication">Other Comms</option>
           </select>
        </div>
        <div className="md:col-span-5">
           <label className="text-xs font-bold text-slate-500 uppercase mb-1 block tracking-wider">Description</label>
           <input
             type="text"
             placeholder="e.g. Called debtor, they promised payment by Friday"
             value={newEvent.description}
             onChange={e => setNewEvent({...newEvent, description: e.target.value})}
             className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 focus:outline-none transition-colors"
           />
        </div>
        <div className="md:col-span-1">
          <button
            onClick={addEvent}
            disabled={!newEvent.date || !newEvent.description}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-xl flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:bg-slate-300 shadow-sm"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Event Order Warning */}
      {orderWarning && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-amber-900 text-sm">Timeline Sequence Issue</h4>
            <p className="text-amber-800 text-sm mt-1">{orderWarning}</p>
            <p className="text-amber-700 text-xs mt-2">
              This may weaken your case. Consider adjusting the event dates to reflect the correct chronological order.
            </p>
          </div>
        </div>
      )}

      {/* Timeline Visual */}
      <div className="relative border-l-2 border-slate-200 ml-4 space-y-4 pb-4">
        {events.length === 0 && (
          <div className="pl-8 py-4 text-slate-500 italic text-sm border border-dashed border-slate-300 rounded-xl bg-slate-50 m-4 text-center">
             No events added yet. Use the Quick Add buttons or enter manually above.
          </div>
        )}

        {events.map((ev, idx) => (
          <div key={idx} className="relative pl-8 group animate-fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
            <div className="absolute -left-[9px] top-4 w-4 h-4 bg-white border-2 border-slate-300 rounded-full group-hover:border-emerald-500 group-hover:scale-110 transition-all duration-200 z-10"></div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 hover:border-emerald-300 hover:shadow-sm transition-all duration-200 flex justify-between items-start shadow-sm">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1 bg-slate-100 rounded-lg">
                    {getIcon(ev.type)}
                  </div>
                  <span className="text-xs font-bold uppercase text-slate-500 tracking-wider font-mono">{new Date(ev.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
                <p className="text-slate-700 font-medium text-sm mt-1">{ev.description}</p>
              </div>
              <button onClick={() => removeEvent(idx)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors duration-200">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
