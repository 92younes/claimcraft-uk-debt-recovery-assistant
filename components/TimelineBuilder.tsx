import React, { useState, useEffect } from 'react';
import { TimelineEvent, Deadline, ClaimState, PartyType } from '../types';
import { Calendar, Plus, Trash2, MessageCircle, FileText, PoundSterling, Mail, Zap, Clock, AlertCircle, Scale, CheckCircle, Truck, CreditCard, AlertTriangle, Bell, HandCoins, CalendarPlus, X } from 'lucide-react';
import { Input, Select } from './ui/Input';
import { DateInput } from './ui/DateInput';
import { Button } from './ui/Button';
import { Tooltip } from './ui/Tooltip';
import { safeFormatDate, isValidDate } from '../utils/formatters';
import { getDeadlineFromTimelineEvent, calculateSuggestedDeadlines } from '../services/deadlineService';

interface TimelineBuilderProps {
  events: TimelineEvent[];
  onChange: (events: TimelineEvent[]) => void;
  invoiceDate?: string;
  /** Claim data for deadline calculations (defendant type, claim ID, etc.) */
  claimData?: ClaimState;
  /** Callback when a deadline should be added to the calendar */
  onAddDeadline?: (deadline: Deadline) => void;
  /** Existing deadlines to avoid duplicates */
  existingDeadlines?: Deadline[];
  /** Callback to navigate to Invoice tab when invoice date is missing */
  onGoToInvoice?: () => void;
}

export const TimelineBuilder: React.FC<TimelineBuilderProps> = ({
  events,
  onChange,
  invoiceDate,
  claimData,
  onAddDeadline,
  existingDeadlines = [],
  onGoToInvoice
}) => {
  const [newEvent, setNewEvent] = useState<TimelineEvent>({
    date: '',
    description: '',
    type: 'communication'
  });
  const [orderWarning, setOrderWarning] = useState<string | null>(null);
  const [suggestedDeadlines, setSuggestedDeadlines] = useState<Deadline[]>([]);
  const [dismissedDeadlineIds, setDismissedDeadlineIds] = useState<Set<string>>(new Set());

  // Calculate suggested deadlines when events change
  useEffect(() => {
    if (!claimData || !onAddDeadline) return;

    // Create a temporary claim state with current events for calculation
    const tempClaim: ClaimState = {
      ...claimData,
      timeline: events
    };

    const suggestions = calculateSuggestedDeadlines(tempClaim);

    // Filter out already existing deadlines and dismissed ones
    const existingTypes = new Set(existingDeadlines.map(d => `${d.type}_${d.claimId}`));
    const newSuggestions = suggestions.filter(s =>
      !existingTypes.has(`${s.type}_${s.claimId}`) &&
      !dismissedDeadlineIds.has(`${s.type}_${s.dueDate}`)
    );

    setSuggestedDeadlines(newSuggestions);
  }, [events, claimData, existingDeadlines, dismissedDeadlineIds, onAddDeadline]);

  const handleAddDeadline = (deadline: Deadline) => {
    if (onAddDeadline) {
      onAddDeadline(deadline);
      // Remove from suggestions
      setSuggestedDeadlines(prev => prev.filter(d => d.id !== deadline.id));
    }
  };

  const handleDismissDeadline = (deadline: Deadline) => {
    setDismissedDeadlineIds(prev => new Set([...prev, `${deadline.type}_${deadline.dueDate}`]));
    setSuggestedDeadlines(prev => prev.filter(d => d.id !== deadline.id));
  };

  const validateEventOrder = (events: TimelineEvent[]): string | null => {
    // Check for logical event sequence using actual dates (not array indices)
    const getEventDate = (type: TimelineEvent['type']): number | null => {
      const event = events.find(e => e.type === type);
      return event ? new Date(event.date).getTime() : null;
    };

    const contractDate = getEventDate('contract');
    const serviceDate = getEventDate('service_delivered');
    const invoiceDate = getEventDate('invoice');
    const paymentDueDate = getEventDate('payment_due');
    const lbaDate = getEventDate('lba_sent');

    // Contract should come before service delivery (if both exist)
    if (contractDate !== null && serviceDate !== null && contractDate > serviceDate) {
      return 'Warning: Contract date is after service delivery - contracts are typically signed before work begins';
    }

    // Service should come before invoice (if both exist)
    if (serviceDate !== null && invoiceDate !== null && serviceDate > invoiceDate) {
      return 'Warning: Service delivery date is after invoice date - invoices are typically issued after work is completed';
    }

    // Contract should come before invoice (if both exist)
    if (contractDate !== null && invoiceDate !== null && contractDate > invoiceDate) {
      return 'Warning: Contract date is after invoice date - this is unusual and may weaken your claim';
    }

    // Invoice should come before payment due (if both exist)
    if (invoiceDate !== null && paymentDueDate !== null && invoiceDate > paymentDueDate) {
      return 'Warning: Invoice date is after payment due date. The invoice should be dated before the payment due date.';
    }

    // LBA should come after payment due (if both exist)
    if (lbaDate !== null && paymentDueDate !== null && lbaDate < paymentDueDate) {
      return 'Warning: Letter Before Action is dated before payment due - LBA should only be sent after payment becomes overdue';
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
      case 'contract': return <FileText className="w-4 h-4 text-teal-600"/>;
      case 'service_delivered': return <Truck className="w-4 h-4 text-green-500"/>;
      case 'invoice': return <FileText className="w-4 h-4 text-green-500"/>;
      case 'payment_due': return <PoundSterling className="w-4 h-4 text-red-500"/>;
      case 'part_payment': return <CreditCard className="w-4 h-4 text-teal-500"/>;
      case 'chaser': return <Mail className="w-4 h-4 text-amber-500"/>;
      case 'lba_sent': return <Scale className="w-4 h-4 text-red-500"/>;
      case 'acknowledgment': return <CheckCircle className="w-4 h-4 text-teal-500"/>;
      case 'payment_reminder': return <Bell className="w-4 h-4 text-blue-500"/>;
      case 'promise_to_pay': return <HandCoins className="w-4 h-4 text-green-600"/>;
      default: return <MessageCircle className="w-4 h-4 text-slate-500"/>;
    }
  };

  const isValidInvoiceDate = isValidDate(invoiceDate);

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
       <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-teal-100 rounded-xl">
            <Calendar className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 font-display">Chronology of Events</h2>
            <p className="text-sm text-slate-500">Build the dispute timeline. This is critical evidence for the court.</p>
          </div>
       </div>

       {/* Quick Actions */}
       {isValidInvoiceDate ? (
         <div className="mb-4 mt-4 bg-teal-50 p-4 rounded-xl border border-teal-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-teal-700 uppercase tracking-wider flex items-center gap-2">
                  <Zap className="w-4 h-4" /> Quick Add Timeline Events
              </p>
              <span className="text-xs text-teal-600 bg-white px-2 py-1 rounded-lg border border-teal-200 font-mono">
                Invoice: {safeFormatDate(invoiceDate, { format: 'short', fallback: 'Not set' })}
              </span>
            </div>
            <p className="text-xs text-slate-600 mb-3">Add common debt recovery events based on your invoice date:</p>
            <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => addQuickEvent(30, 'payment_due', 'Payment Due Date (30 Days)')}
                  className="flex-1 min-w-[200px] px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700 transition-all duration-200 flex flex-col items-start gap-1 group shadow-sm"
                >
                   <div className="flex items-center gap-2 w-full">
                     <Clock className="w-4 h-4 text-teal-600" />
                     <span>Payment Due Date</span>
                   </div>
                   <span className="text-[10px] text-slate-500 font-normal group-hover:text-teal-600">
                     {(() => {
                       if (!isValidDate(invoiceDate)) return '(+30 days)';
                       const date = new Date(invoiceDate!);
                       date.setDate(date.getDate() + 30);
                       return safeFormatDate(date, { format: 'short' });
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
                       if (!isValidDate(invoiceDate)) return '(+7 days overdue)';
                       const date = new Date(invoiceDate!);
                       date.setDate(date.getDate() + 37);
                       return safeFormatDate(date, { format: 'short' });
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
                       if (!isValidDate(invoiceDate)) return '(+14 days overdue)';
                       const date = new Date(invoiceDate!);
                       date.setDate(date.getDate() + 44);
                       return safeFormatDate(date, { format: 'short' });
                     })()}
                     {' '}(+14 days overdue)
                   </span>
                </button>
                <Tooltip content="A Letter Before Action (LBA) is a formal legal notice required under the Pre-Action Protocol before court proceedings. It gives the debtor 30 days to respond." position="top">
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
                         if (!isValidDate(invoiceDate)) return '(+28 days overdue)';
                         const date = new Date(invoiceDate!);
                         date.setDate(date.getDate() + 58);
                         return safeFormatDate(date, { format: 'short' });
                       })()}
                       {' '}(+28 days overdue)
                     </span>
                     <span className="text-[10px] text-red-500 font-bold">REQUIRED before court</span>
                  </button>
                </Tooltip>
                <button
                  onClick={() => addQuickEvent(35, 'payment_reminder', 'Payment Reminder sent via Email')}
                  className="flex-1 min-w-[200px] px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 flex flex-col items-start gap-1 group shadow-sm"
                >
                   <div className="flex items-center gap-2 w-full">
                     <Bell className="w-4 h-4 text-blue-500" />
                     <span>Payment Reminder Sent</span>
                   </div>
                   <span className="text-[10px] text-slate-500 font-normal group-hover:text-blue-500">
                     {(() => {
                       if (!isValidDate(invoiceDate)) return '(+5 days overdue)';
                       const date = new Date(invoiceDate!);
                       date.setDate(date.getDate() + 35);
                       return safeFormatDate(date, { format: 'short' });
                     })()}
                     {' '}(+5 days overdue)
                   </span>
                </button>
                <button
                  onClick={() => addQuickEvent(40, 'promise_to_pay', 'Debtor promised to pay by [DATE]')}
                  className="flex-1 min-w-[200px] px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:border-green-400 hover:bg-green-50 hover:text-green-600 transition-all duration-200 flex flex-col items-start gap-1 group shadow-sm"
                >
                   <div className="flex items-center gap-2 w-full">
                     <HandCoins className="w-4 h-4 text-green-600" />
                     <span>Promise to Pay Received</span>
                   </div>
                   <span className="text-[10px] text-slate-500 font-normal group-hover:text-green-500">
                     {(() => {
                       if (!isValidDate(invoiceDate)) return '(+10 days overdue)';
                       const date = new Date(invoiceDate!);
                       date.setDate(date.getDate() + 40);
                       return safeFormatDate(date, { format: 'short' });
                     })()}
                     {' '}(+10 days overdue)
                   </span>
                   <span className="text-[10px] text-green-600 font-medium">Record debtor's promise</span>
                </button>
            </div>
            <div className="mt-2 text-[10px] text-slate-500 bg-white p-2 rounded-lg border border-slate-200">
              <strong className="text-slate-700">Tip:</strong> These are typical timings for UK debt recovery. You can edit event descriptions after adding them.
            </div>
         </div>
       ) : (
          <div className="mb-4 mt-4 flex items-start gap-3 text-xs text-amber-700 bg-amber-50 p-4 rounded-xl border border-amber-200">
             <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
             <div className="flex-1">
               <p className="font-bold mb-1 text-amber-800">Invoice Date Required</p>
               <p className="text-amber-600 mb-2">Set an Invoice Date in the Invoice tab to enable Quick Add timeline events based on standard payment terms.</p>
               {onGoToInvoice && (
                 <button
                   onClick={onGoToInvoice}
                   className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 font-medium rounded-lg transition-colors text-xs"
                 >
                   <Calendar className="w-3.5 h-3.5" />
                   Set Invoice Date
                 </button>
               )}
             </div>
          </div>
       )}

      {/* Input Area */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6 grid grid-cols-1 md:grid-cols-12 gap-3 items-end shadow-sm">
        <div className="md:col-span-3">
          <DateInput
            label="Date"
            value={newEvent.date}
            onChange={value => setNewEvent({...newEvent, date: value})}
            noMargin
            maxToday
          />
        </div>
        <div className="md:col-span-3">
          <Select
            label="Event Type"
            value={newEvent.type}
            onChange={e => setNewEvent({...newEvent, type: e.target.value as any})}
            options={[
              { value: 'contract', label: 'Contract Signed' },
              { value: 'service_delivered', label: 'Service/Goods Delivered' },
              { value: 'invoice', label: 'Invoice Sent' },
              { value: 'payment_due', label: 'Payment Due' },
              { value: 'part_payment', label: 'Part Payment Received' },
              { value: 'payment_reminder', label: 'Payment Reminder Sent' },
              { value: 'chaser', label: 'Chaser / Reminder' },
              { value: 'promise_to_pay', label: 'Promise to Pay Received' },
              { value: 'lba_sent', label: 'Letter Before Action' },
              { value: 'acknowledgment', label: 'Debtor Acknowledged' },
              { value: 'communication', label: 'Other Comms' },
            ]}
            noMargin
          />
        </div>
        <div className="md:col-span-5">
          <Input
            label="Description"
            placeholder="e.g. Called debtor, they promised payment by Friday"
            value={newEvent.description}
            onChange={e => setNewEvent({...newEvent, description: e.target.value})}
            noMargin
          />
        </div>
        <div className="md:col-span-1">
          <Button
            onClick={addEvent}
            disabled={!newEvent.date || !newEvent.description}
            icon={<Plus className="w-5 h-5" />}
            iconOnly
            className="w-full h-[46px]"
          />
        </div>
      </div>

      {/* Event Order Warning */}
      {orderWarning && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
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

      {/* Suggested Deadlines - Auto-generated from timeline events */}
      {suggestedDeadlines.length > 0 && onAddDeadline && (
        <div className="mb-6 bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-200 rounded-xl p-4 animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-teal-100 rounded-lg">
              <CalendarPlus className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h4 className="font-bold text-teal-900 text-sm">Add to Calendar?</h4>
              <p className="text-teal-700 text-xs">Track these important deadlines based on your timeline</p>
            </div>
          </div>

          <div className="space-y-2">
            {suggestedDeadlines.map((deadline) => (
              <div
                key={deadline.id}
                className="bg-white rounded-lg border border-teal-200 p-3 flex items-center justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 text-sm truncate">
                      {deadline.title}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 font-medium whitespace-nowrap">
                      {safeFormatDate(deadline.dueDate, { format: 'short' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                    {deadline.description}
                  </p>
                  {deadline.legalReference && (
                    <p className="text-[10px] text-slate-500 mt-1 italic">
                      Ref: {deadline.legalReference}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleAddDeadline(deadline)}
                    icon={<CalendarPlus className="w-4 h-4" />}
                  >
                    Add
                  </Button>
                  <button
                    onClick={() => handleDismissDeadline(deadline)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Dismiss suggestion"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-teal-600 mt-3">
            <strong>Why these deadlines?</strong> Based on UK Pre-Action Protocol for Debt Claims and CPR Part 7.
          </p>
        </div>
      )}

      {/* Timeline Visual */}
      <div className="relative border-l-2 border-slate-200 ml-4 space-y-3 pb-3">
        {events.length === 0 && (
          <div className="pl-8 py-6 border border-dashed border-slate-300 rounded-xl bg-gradient-to-br from-slate-50 to-white m-3 text-center">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-900 mb-1">No events added yet</p>
            <p className="text-xs text-slate-600 mb-2 max-w-xs mx-auto">
              Build your timeline by adding key dates and correspondence.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mb-3">
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">Invoice Sent</span>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">Payment Chaser</span>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">LBA Sent</span>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">Phone Call</span>
            </div>
            <p className="text-xs text-teal-600 font-medium">
              Use the Quick Add buttons or enter manually above
            </p>
          </div>
        )}

        {events.map((ev, idx) => (
          <div key={idx} className="relative pl-8 group animate-fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
            <div className="absolute -left-[9px] top-4 w-4 h-4 bg-white border-2 border-slate-300 rounded-full group-hover:border-teal-500 group-hover:scale-110 transition-all duration-200 z-10"></div>
            <div className="bg-white p-3 rounded-xl border border-slate-200 hover:border-teal-300 hover:shadow-sm transition-all duration-200 flex justify-between items-start shadow-sm">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1 bg-slate-100 rounded-lg">
                    {getIcon(ev.type)}
                  </div>
                  <span className="text-xs font-bold uppercase text-slate-500 tracking-wider font-mono">{safeFormatDate(ev.date, { format: 'short', fallback: 'No date' })}</span>
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
