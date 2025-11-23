import React, { useState } from 'react';
import { TimelineEvent } from '../types';
import { Calendar, Plus, Trash2, MessageCircle, FileText, PoundSterling, Mail, Zap, Clock, AlertCircle, MessageSquareText } from 'lucide-react';

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
      case 'contract': return <FileText className="w-4 h-4 text-blue-600"/>;
      case 'invoice': return <FileText className="w-4 h-4 text-green-600"/>;
      case 'payment_due': return <PoundSterling className="w-4 h-4 text-red-600"/>;
      case 'chaser': return <Mail className="w-4 h-4 text-amber-600"/>;
      default: return <MessageCircle className="w-4 h-4 text-slate-600"/>;
    }
  };

  const isValidInvoiceDate = invoiceDate && !isNaN(new Date(invoiceDate).getTime());

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
       <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Calendar className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Chronology of Events</h2>
            <p className="text-sm text-slate-500">Build the dispute timeline. This is critical evidence for the court.</p>
          </div>
       </div>
       
       {/* Quick Actions */}
       {isValidInvoiceDate ? (
         <div className="mb-6 mt-6 bg-slate-50/50 p-4 rounded-lg border border-slate-100">
            <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-3 flex items-center gap-1">
                <Zap className="w-3 h-3" /> Quick Actions (Invoice: {invoiceDate})
            </p>
            <div className="flex flex-wrap gap-3">
                <button 
                  onClick={() => addQuickEvent(30, 'payment_due', 'Payment Due Date (30 Days)')}
                  className="px-3 py-2 bg-white border border-slate-200 shadow-sm rounded-lg text-xs font-bold text-slate-700 hover:border-blue-400 hover:text-blue-600 hover:shadow-md transition-all duration-200 flex items-center gap-2"
                >
                   <Clock className="w-3 h-3" /> +30 Days (Due)
                </button>
                <button 
                  onClick={() => addQuickEvent(37, 'chaser', 'First Overdue Chaser sent via Email')}
                  className="px-3 py-2 bg-white border border-slate-200 shadow-sm rounded-lg text-xs font-bold text-slate-700 hover:border-amber-400 hover:text-amber-600 hover:shadow-md transition-all duration-200 flex items-center gap-2"
                >
                   <Mail className="w-3 h-3" /> +7 Days Overdue
                </button>
                <button 
                  onClick={() => addQuickEvent(44, 'chaser', 'Final Demand sent via Email')}
                  className="px-3 py-2 bg-white border border-slate-200 shadow-sm rounded-lg text-xs font-bold text-slate-700 hover:border-red-400 hover:text-red-600 hover:shadow-md transition-all duration-200 flex items-center gap-2"
                >
                   <AlertCircle className="w-3 h-3" /> +14 Days Overdue
                </button>
            </div>
         </div>
       ) : (
          <div className="mb-6 mt-6 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100">
             <AlertCircle className="w-4 h-4" /> Set an Invoice Date in the previous step to enable Quick Actions.
          </div>
       )}

      {/* Input Area */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 mb-8 grid grid-cols-1 md:grid-cols-12 gap-4 items-end shadow-sm">
        <div className="md:col-span-3">
          <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Date</label>
          <input 
            type="date" 
            value={newEvent.date} 
            onChange={e => setNewEvent({...newEvent, date: e.target.value})}
            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <div className="md:col-span-3">
           <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Event Type</label>
           <select 
             value={newEvent.type}
             onChange={e => setNewEvent({...newEvent, type: e.target.value as any})}
             className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
           >
             <option value="contract">Contract Signed</option>
             <option value="invoice">Invoice Sent</option>
             <option value="payment_due">Payment Due</option>
             <option value="chaser">Chaser / Reminder</option>
             <option value="communication">Other Comms</option>
           </select>
        </div>
        <div className="md:col-span-5">
           <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Description</label>
           <input 
             type="text" 
             placeholder="e.g. Called debtor, they promised payment by Friday"
             value={newEvent.description} 
             onChange={e => setNewEvent({...newEvent, description: e.target.value})}
             className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
           />
        </div>
        <div className="md:col-span-1">
          <button 
            onClick={addEvent}
            disabled={!newEvent.date || !newEvent.description}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white p-2.5 rounded-lg flex items-center justify-center transition-all duration-200 disabled:opacity-50 shadow-md"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Timeline Visual */}
      <div className="relative border-l-2 border-slate-200 ml-4 space-y-4 pb-4">
        {events.length === 0 && (
          <div className="pl-8 py-4 text-slate-400 italic text-sm border border-dashed border-slate-300 rounded-lg bg-slate-50 m-4 text-center">
             No events added yet. Use the Quick Add buttons or enter manually above.
          </div>
        )}
        
        {events.map((ev, idx) => (
          <div key={idx} className="relative pl-8 group animate-fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
            <div className="absolute -left-[9px] top-4 w-4 h-4 bg-white border-2 border-slate-300 rounded-full group-hover:border-blue-500 group-hover:scale-110 transition-all duration-200 z-10"></div>
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all duration-200 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1 bg-slate-100 rounded-md">
                    {getIcon(ev.type)}
                  </div>
                  <span className="text-xs font-bold uppercase text-slate-500 tracking-wide">{new Date(ev.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
                <p className="text-slate-800 font-medium text-sm mt-1">{ev.description}</p>
              </div>
              <button onClick={() => removeEvent(idx)} className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors duration-200">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};