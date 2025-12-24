/**
 * DataPreviewPanel Component
 *
 * Live "Captured Data" panel showing extracted claim data during chat.
 * Displays field status, allows editing, and highlights newly extracted fields.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Edit2,
  X,
  User,
  Building,
  FileText,
  Calendar,
  PoundSterling,
  MapPin,
  Phone,
  Mail,
  Clock,
  Sparkles
} from 'lucide-react';
import { ClaimState, TimelineEvent } from '../types';
import { formatMoney, formatDateShort } from '../utils/formatters';

interface DataPreviewPanelProps {
  /** Current extracted claim data */
  data: Partial<ClaimState>;
  /** Fields that were just extracted (for highlighting) */
  newlyExtractedFields?: string[];
  /** Whether the panel is collapsed */
  collapsed?: boolean;
  /** Callback when collapse state changes */
  onCollapseChange?: (collapsed: boolean) => void;
  /** Callback when user edits a field */
  onEdit?: (field: string, value: string) => void;
  /** Whether to show edit buttons */
  editable?: boolean;
}

/**
 * Field status indicator
 */
type FieldStatus = 'extracted' | 'missing' | 'edited' | 'new';

interface FieldDisplayProps {
  label: string;
  value: string | number | undefined;
  icon: React.ReactNode;
  status: FieldStatus;
  fieldKey: string;
  isNew?: boolean;
  onEdit?: () => void;
  editable?: boolean;
}

const FieldDisplay: React.FC<FieldDisplayProps> = ({
  label,
  value,
  icon,
  status,
  isNew,
  onEdit,
  editable
}) => {
  const hasValue = value !== undefined && value !== null && value !== '';

  return (
    <div
      className={`flex items-start gap-2 py-1.5 px-2 rounded-lg transition-all ${
        isNew ? 'bg-teal-50 ring-1 ring-teal-200 animate-pulse-once' : ''
      }`}
    >
      <div className={`w-4 h-4 flex-shrink-0 mt-0.5 ${hasValue ? 'text-teal-500' : 'text-slate-300'}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-xs text-slate-500">{label}</span>
        {hasValue ? (
          <p className="text-sm text-slate-900 font-medium truncate">{String(value)}</p>
        ) : (
          <p className="text-sm text-slate-400 italic">Not captured</p>
        )}
      </div>
      <div className="flex items-center gap-1">
        {hasValue ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" />
        ) : (
          <AlertCircle className="w-3.5 h-3.5 text-slate-300" />
        )}
        {editable && hasValue && onEdit && (
          <button
            onClick={onEdit}
            className="p-0.5 hover:bg-slate-100 rounded transition-colors"
            title="Edit"
          >
            <Edit2 className="w-3 h-3 text-slate-400 hover:text-slate-600" />
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Section header with collapse toggle
 */
interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  fieldCount?: { filled: number; total: number };
}

const Section: React.FC<SectionProps> = ({
  title,
  icon,
  children,
  defaultExpanded = true,
  fieldCount
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 py-2 px-1 hover:bg-slate-50 transition-colors"
      >
        <div className="w-5 h-5 text-slate-400">{icon}</div>
        <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide flex-1 text-left">
          {title}
        </span>
        {fieldCount && (
          <span className="text-xs text-slate-400">
            {fieldCount.filled}/{fieldCount.total}
          </span>
        )}
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>
      {expanded && <div className="pb-2">{children}</div>}
    </div>
  );
};

export const DataPreviewPanel: React.FC<DataPreviewPanelProps> = ({
  data,
  newlyExtractedFields = [],
  collapsed = false,
  onCollapseChange,
  onEdit,
  editable = false
}) => {
  const [isCollapsed, setIsCollapsed] = useState(collapsed);
  const prevDataRef = useRef<Partial<ClaimState>>(data);
  const [highlightedFields, setHighlightedFields] = useState<Set<string>>(new Set());

  // Track newly extracted fields for highlighting
  useEffect(() => {
    if (newlyExtractedFields.length > 0) {
      setHighlightedFields(new Set(newlyExtractedFields));
      // Clear highlights after animation
      const timer = setTimeout(() => {
        setHighlightedFields(new Set());
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [newlyExtractedFields]);

  // Sync collapsed state with prop
  useEffect(() => {
    setIsCollapsed(collapsed);
  }, [collapsed]);

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    onCollapseChange?.(newState);
  };

  // Count filled fields
  const countDefendantFields = () => {
    const fields = ['name', 'address', 'city', 'county', 'postcode', 'email', 'phone'];
    const filled = fields.filter(f => data.defendant?.[f as keyof typeof data.defendant]).length;
    return { filled, total: fields.length };
  };

  const countInvoiceFields = () => {
    const fields = ['invoiceNumber', 'totalAmount', 'dateIssued', 'dueDate'];
    const filled = fields.filter(f => data.invoice?.[f as keyof typeof data.invoice]).length;
    return { filled, total: fields.length };
  };

  const isFieldNew = (fieldPath: string) => highlightedFields.has(fieldPath);

  // Calculate overall progress
  const calculateProgress = (): number => {
    let filled = 0;
    let total = 0;

    // Defendant fields (required)
    total += 3; // name, address, postcode
    if (data.defendant?.name) filled++;
    if (data.defendant?.address) filled++;
    if (data.defendant?.postcode) filled++;

    // Invoice fields (required)
    total += 2; // amount, due date
    if (data.invoice?.totalAmount) filled++;
    if (data.invoice?.dueDate || data.invoice?.dateIssued) filled++;

    return Math.round((filled / total) * 100);
  };

  const progress = calculateProgress();

  if (isCollapsed) {
    return (
      <div
        onClick={toggleCollapse}
        className="bg-white border border-slate-200 rounded-xl shadow-sm p-3 cursor-pointer hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-500" />
            <span className="text-sm font-medium text-slate-700">Captured Data</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-slate-500">{progress}%</span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div
        onClick={toggleCollapse}
        className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-teal-500" />
          <span className="text-sm font-semibold text-slate-700">Captured Data</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs font-medium text-slate-600">{progress}%</span>
          </div>
          <ChevronUp className="w-4 h-4 text-slate-400" />
        </div>
      </div>

      {/* Content */}
      <div className="px-3 py-2 max-h-[400px] overflow-y-auto">
        {/* Defendant Section */}
        <Section
          title="Debtor"
          icon={<User className="w-4 h-4" />}
          fieldCount={countDefendantFields()}
        >
          <FieldDisplay
            label="Name"
            value={data.defendant?.name}
            icon={<User className="w-3.5 h-3.5" />}
            status={data.defendant?.name ? 'extracted' : 'missing'}
            fieldKey="defendant.name"
            isNew={isFieldNew('defendant.name')}
            editable={editable}
            onEdit={() => onEdit?.('defendant.name', data.defendant?.name || '')}
          />
          <FieldDisplay
            label="Address"
            value={data.defendant?.address}
            icon={<MapPin className="w-3.5 h-3.5" />}
            status={data.defendant?.address ? 'extracted' : 'missing'}
            fieldKey="defendant.address"
            isNew={isFieldNew('defendant.address')}
            editable={editable}
            onEdit={() => onEdit?.('defendant.address', data.defendant?.address || '')}
          />
          <FieldDisplay
            label="City"
            value={data.defendant?.city}
            icon={<Building className="w-3.5 h-3.5" />}
            status={data.defendant?.city ? 'extracted' : 'missing'}
            fieldKey="defendant.city"
            isNew={isFieldNew('defendant.city')}
            editable={editable}
          />
          <FieldDisplay
            label="Postcode"
            value={data.defendant?.postcode}
            icon={<MapPin className="w-3.5 h-3.5" />}
            status={data.defendant?.postcode ? 'extracted' : 'missing'}
            fieldKey="defendant.postcode"
            isNew={isFieldNew('defendant.postcode')}
            editable={editable}
          />
          <FieldDisplay
            label="Email"
            value={data.defendant?.email}
            icon={<Mail className="w-3.5 h-3.5" />}
            status={data.defendant?.email ? 'extracted' : 'missing'}
            fieldKey="defendant.email"
            isNew={isFieldNew('defendant.email')}
            editable={editable}
          />
          <FieldDisplay
            label="Phone"
            value={data.defendant?.phone}
            icon={<Phone className="w-3.5 h-3.5" />}
            status={data.defendant?.phone ? 'extracted' : 'missing'}
            fieldKey="defendant.phone"
            isNew={isFieldNew('defendant.phone')}
            editable={editable}
          />
        </Section>

        {/* Invoice Section */}
        <Section
          title="Invoice"
          icon={<FileText className="w-4 h-4" />}
          fieldCount={countInvoiceFields()}
        >
          <FieldDisplay
            label="Amount"
            value={data.invoice?.totalAmount ? `£${formatMoney(data.invoice.totalAmount)}` : undefined}
            icon={<PoundSterling className="w-3.5 h-3.5" />}
            status={data.invoice?.totalAmount ? 'extracted' : 'missing'}
            fieldKey="invoice.totalAmount"
            isNew={isFieldNew('invoice.totalAmount')}
            editable={editable}
          />
          <FieldDisplay
            label="Invoice Number"
            value={data.invoice?.invoiceNumber}
            icon={<FileText className="w-3.5 h-3.5" />}
            status={data.invoice?.invoiceNumber ? 'extracted' : 'missing'}
            fieldKey="invoice.invoiceNumber"
            isNew={isFieldNew('invoice.invoiceNumber')}
            editable={editable}
          />
          <FieldDisplay
            label="Date Issued"
            value={data.invoice?.dateIssued ? formatDateShort(data.invoice.dateIssued) : undefined}
            icon={<Calendar className="w-3.5 h-3.5" />}
            status={data.invoice?.dateIssued ? 'extracted' : 'missing'}
            fieldKey="invoice.dateIssued"
            isNew={isFieldNew('invoice.dateIssued')}
            editable={editable}
          />
          <FieldDisplay
            label="Due Date"
            value={data.invoice?.dueDate ? formatDateShort(data.invoice.dueDate) : undefined}
            icon={<Clock className="w-3.5 h-3.5" />}
            status={data.invoice?.dueDate ? 'extracted' : 'missing'}
            fieldKey="invoice.dueDate"
            isNew={isFieldNew('invoice.dueDate')}
            editable={editable}
          />
        </Section>

        {/* Timeline Section (if events exist) */}
        {data.timeline && data.timeline.length > 0 && (
          <Section
            title="Timeline"
            icon={<Calendar className="w-4 h-4" />}
            defaultExpanded={false}
            fieldCount={{ filled: data.timeline.length, total: data.timeline.length }}
          >
            <div className="space-y-1">
              {data.timeline.slice(0, 5).map((event, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-2 py-1 px-2 rounded text-xs ${
                    isFieldNew(`timeline.${idx}`) ? 'bg-teal-50' : ''
                  }`}
                >
                  <span className="text-slate-500 w-20 flex-shrink-0">
                    {formatDateShort(event.date)}
                  </span>
                  <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] uppercase">
                    {event.type.replace('_', ' ')}
                  </span>
                  <span className="text-slate-700 truncate flex-1">
                    {event.description}
                  </span>
                </div>
              ))}
              {data.timeline.length > 5 && (
                <p className="text-xs text-slate-400 px-2">
                  +{data.timeline.length - 5} more events
                </p>
              )}
            </div>
          </Section>
        )}
      </div>

      {/* Footer with summary */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-100">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">
            {progress < 50 ? 'Keep chatting to capture more details' :
             progress < 100 ? 'Almost there! A few more details needed' :
             'All key information captured'}
          </span>
          {progress >= 80 && (
            <span className="text-teal-600 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Ready
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// Add custom animation for new field highlight
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse-once {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
  }
  .animate-pulse-once {
    animation: pulse-once 0.5s ease-in-out 2;
  }
`;
if (typeof document !== 'undefined' && !document.getElementById('data-preview-styles')) {
  style.id = 'data-preview-styles';
  document.head.appendChild(style);
}

export default DataPreviewPanel;
