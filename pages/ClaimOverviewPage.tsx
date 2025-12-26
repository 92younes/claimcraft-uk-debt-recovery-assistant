import React, { useMemo, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useClaimStore } from '../store/claimStore';
import { Step, DocumentType, DeadlineStatus } from '../types';
import { BreadcrumbItem } from '../components/Header';
import {
  ArrowLeft,
  FileText,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Download,
  Send,
  Clock,
  User,
  Building2,
  PoundSterling,
  FileCheck,
  ChevronRight,
  AlertTriangle,
  Check,
  Trash2
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { getTodayISO, safeFormatDate } from '../utils/formatters';
import { getDaysUntilDeadline } from '../services/deadlineService';

/** Sanitize null-like strings for display */
const sanitizeDisplayValue = (value: string | undefined | null): string => {
  if (!value) return '';
  const lower = value.trim().toLowerCase();
  if (lower === 'null' || lower === 'undefined' || lower === 'n/a' || lower === 'none') return '';
  return value.trim();
};

/**
 * ClaimOverviewPage - Shows a comprehensive summary of a claim
 * Displays claim status, key details, documents generated, timeline, and next actions
 * This is the default view when clicking a claim from the dashboard
 */
export const ClaimOverviewPage = () => {
  const navigate = useNavigate();
  const { claimData, deadlines, setStep, completeDeadline, deleteDeadline } = useClaimStore();
  const { setHeaderConfig } = useOutletContext<{ setHeaderConfig?: (config: { breadcrumbs?: BreadcrumbItem[] }) => void }>() || {};

  // Build claim title for breadcrumb
  const claimTitle = useMemo(() => {
    if (claimData.defendant?.name) {
      return `vs ${claimData.defendant.name}`;
    }
    return claimData.id ? `Claim ${claimData.id.slice(0, 8).toUpperCase()}` : 'Claim Overview';
  }, [claimData.defendant?.name, claimData.id]);

  // Configure breadcrumbs
  const breadcrumbItems: BreadcrumbItem[] = useMemo(() => [
    {
      label: 'Dashboard',
      onClick: () => navigate('/dashboard')
    },
    {
      label: claimTitle.length > 25 ? `${claimTitle.slice(0, 25)}...` : claimTitle,
      isCurrentPage: true
    }
  ], [navigate, claimTitle]);

  // Set breadcrumbs in header
  useEffect(() => {
    if (setHeaderConfig) {
      setHeaderConfig({ breadcrumbs: breadcrumbItems });
      return () => setHeaderConfig({});
    }
  }, [setHeaderConfig, breadcrumbItems]);

  // If no claim is loaded, redirect to dashboard
  useEffect(() => {
    if (!claimData.id) {
      navigate('/dashboard');
    }
  }, [claimData.id, navigate]);

  // Get deadlines for this claim
  const claimDeadlines = deadlines.filter(d => d.claimId === claimData.id);
  const upcomingDeadlines = claimDeadlines
    .filter(d => d.status === DeadlineStatus.PENDING)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 3);

  // Calculate claim value
  const totalClaimValue = claimData.invoice.totalAmount + claimData.interest.totalInterest + claimData.compensation;

  // Determine next recommended actions based on claim state
  const getNextActions = () => {
    const actions = [];

    // If no document generated yet
    if (!claimData.generated) {
      actions.push({
        title: 'Generate Document',
        description: 'Create your legal document to advance the claim',
        icon: FileText,
        color: 'teal',
        onClick: () => {
          setStep(claimData.selectedDocType ? Step.DRAFT : Step.STRATEGY);
          navigate('/wizard');
        }
      });
    } else {
      // If document generated but not sent
      if (claimData.status === 'draft' || claimData.status === 'review') {
        actions.push({
          title: 'Review & Send Document',
          description: 'Review and send your generated document to the defendant',
          icon: Send,
          color: 'teal',
          onClick: () => {
            setStep(Step.REVIEW);
            navigate('/wizard');
          }
        });
      }
    }

    // If claim is in early stages, suggest timeline building
    if (claimData.timeline.length < 3) {
      actions.push({
        title: 'Build Timeline',
        description: 'Add important dates and events to strengthen your claim',
        icon: Calendar,
        color: 'blue',
        onClick: () => {
          setStep(Step.VERIFY);
          navigate('/wizard');
        }
      });
    }

    // If assessment hasn't been run
    if (!claimData.assessment) {
      actions.push({
        title: 'Assess Claim Viability',
        description: 'Check if your claim meets legal requirements',
        icon: FileCheck,
        color: 'amber',
        onClick: () => {
          setStep(Step.VERIFY);
          navigate('/wizard');
        }
      });
    }

    return actions;
  };

  const nextActions = getNextActions();

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string; icon: any }> = {
      draft: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Draft', icon: Edit3 },
      review: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'In Review', icon: FileCheck },
      sent: { bg: 'bg-green-50', text: 'text-green-700', label: 'Sent', icon: Send },
      overdue: { bg: 'bg-orange-50', text: 'text-orange-700', label: 'Overdue', icon: AlertTriangle },
      court: { bg: 'bg-purple-50', text: 'text-purple-700', label: 'Court Proceedings', icon: Building2 },
      judgment: { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'Judgment', icon: CheckCircle2 },
      paid: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Paid', icon: CheckCircle2 }
    };

    return badges[status] || badges.draft;
  };

  const statusBadge = getStatusBadge(claimData.status);
  const StatusIcon = statusBadge.icon;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in py-4">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          icon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => navigate('/dashboard')}
          className="mb-4"
        >
          Back to Dashboard
        </Button>

        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-900 font-display mb-2">
              Claim Overview
            </h1>
            <div className="flex items-center gap-3">
              <p className="text-slate-500">
                Claim ID: <span className="font-mono text-slate-700">{claimData.id.toUpperCase().slice(0, 8)}</span>
              </p>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold ${statusBadge.bg} ${statusBadge.text} cursor-default select-none`}
                title="Claim status (view only)"
              >
                <StatusIcon className="w-4 h-4" />
                {statusBadge.label}
              </span>
            </div>
          </div>

          <Button
            variant="primary"
            onClick={() => {
              setStep(Step.VERIFY);
              navigate('/wizard');
            }}
            icon={<Edit3 className="w-4 h-4" />}
          >
            Edit Claim
          </Button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Key Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Parties Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Parties</h2>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Claimant */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center">
                    <User className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Claimant</p>
                    <p className="font-semibold text-slate-900">{claimData.claimant.name || 'Not set'}</p>
                  </div>
                </div>
                {claimData.claimant.address && (
                  <div className="text-sm text-slate-600 space-y-0.5 ml-12">
                    <p>{claimData.claimant.address}</p>
                    {(claimData.claimant.city || claimData.claimant.postcode) &&
                     !claimData.claimant.address.includes(claimData.claimant.postcode || '') && (
                      <p>
                        {claimData.claimant.city}
                        {claimData.claimant.city && claimData.claimant.postcode && ', '}
                        {claimData.claimant.postcode}
                      </p>
                    )}
                    {claimData.claimant.email && <p className="text-slate-500">{claimData.claimant.email}</p>}
                  </div>
                )}
              </div>

              {/* Defendant */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Defendant</p>
                    <p className="font-semibold text-slate-900">{claimData.defendant.name || 'Not set'}</p>
                  </div>
                </div>
                {claimData.defendant.address && (
                  <div className="text-sm text-slate-600 space-y-0.5 ml-12">
                    <p>{claimData.defendant.address}</p>
                    {(claimData.defendant.city || claimData.defendant.postcode) &&
                     !claimData.defendant.address.includes(claimData.defendant.postcode || '') && (
                      <p>
                        {claimData.defendant.city}
                        {claimData.defendant.city && claimData.defendant.postcode && ', '}
                        {claimData.defendant.postcode}
                      </p>
                    )}
                    {claimData.defendant.email && <p className="text-slate-500">{claimData.defendant.email}</p>}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Claim Value Card */}
          <div className="bg-gradient-to-br from-teal-50 to-white rounded-xl border border-teal-100 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-100/30 rounded-full -mr-12 -mt-12"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                  <PoundSterling className="w-6 h-6 text-teal-600" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Claim Value</h2>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Principal</p>
                  <p className="text-xl font-bold text-slate-900">
                    £{claimData.invoice.totalAmount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                {claimData.interest.totalInterest > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Interest</p>
                    <p className="text-xl font-bold text-slate-900">
                      £{claimData.interest.totalInterest.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
                {claimData.compensation > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Compensation</p>
                    <p className="text-xl font-bold text-slate-900">
                      £{claimData.compensation.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-slate-500 mb-1">Total</p>
                  <p className="text-2xl font-bold text-teal-600">
                    £{totalClaimValue.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-teal-100/50">
                <p className="text-sm text-slate-600">
                  {sanitizeDisplayValue(claimData.invoice.invoiceNumber) ? (
                    <span className="font-medium">Invoice #{sanitizeDisplayValue(claimData.invoice.invoiceNumber)}</span>
                  ) : (
                    <span className="font-medium text-slate-400">No invoice number</span>
                  )}
                  {claimData.invoice.dateIssued && (
                    <span className="text-slate-500"> • Issued {safeFormatDate(claimData.invoice.dateIssued, { fallback: '' })}</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Documents Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Generated Documents</h2>
              {claimData.generated && (
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Download className="w-4 h-4" />}
                  onClick={() => {
                    setStep(Step.REVIEW);
                    navigate('/wizard');
                  }}
                >
                  Download
                </Button>
              )}
            </div>

            {claimData.generated ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-slate-200">
                    <FileText className="w-5 h-5 text-slate-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900">{claimData.generated.documentType}</p>
                    <p className="text-sm text-slate-500">
                      {safeFormatDate(claimData.generated.validation?.generatedAt, { fallback: 'Generated' })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    rightIcon={<ChevronRight className="w-4 h-4" />}
                    onClick={() => {
                      setStep(Step.REVIEW);
                      navigate('/wizard');
                    }}
                  >
                    View
                  </Button>
                </div>

                {claimData.evidence.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-2">Evidence Files ({claimData.evidence.length})</p>
                    <div className="space-y-2">
                      {claimData.evidence.slice(0, 3).map((file, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                          <FileCheck className="w-4 h-4 text-slate-400" />
                          <span className="truncate">{file.name}</span>
                        </div>
                      ))}
                      {claimData.evidence.length > 3 && (
                        <p className="text-sm text-slate-500 ml-6">+{claimData.evidence.length - 3} more files</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 bg-gradient-to-br from-slate-50 to-white rounded-lg border-2 border-dashed border-slate-200">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">No documents generated yet</h3>
                <p className="text-sm text-slate-600 mb-4 max-w-md mx-auto">
                  Generate court-ready documents like Letters Before Action or Form N1 court claims with accurate interest calculations.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center items-center">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setStep(claimData.selectedDocType ? Step.DRAFT : Step.STRATEGY);
                      navigate('/wizard');
                    }}
                  >
                    Generate Document
                  </Button>
                  <p className="text-xs text-slate-500">
                    Start by selecting a document type
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Timeline Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-teal-600" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Timeline of Events</h2>
              </div>
              <Button
                variant="outline"
                size="sm"
                icon={<Edit3 className="w-4 h-4" />}
                onClick={() => {
                  setStep(Step.VERIFY);
                  navigate('/wizard');
                }}
              >
                Edit Timeline
              </Button>
            </div>

            {claimData.timeline.length > 0 ? (
              <div className="space-y-3">
                {claimData.timeline
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, 5)
                  .map((event, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 bg-teal-500 rounded-full mt-2"></div>
                        {idx < Math.min(4, claimData.timeline.length - 1) && (
                          <div className="w-0.5 flex-1 bg-slate-200 my-1"></div>
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="text-sm font-medium text-slate-900">{event.description}</p>
                        <p className="text-xs text-slate-500">
                          {safeFormatDate(event.date, { format: 'short', fallback: 'No date' })}
                        </p>
                      </div>
                    </div>
                  ))}
                {claimData.timeline.length > 5 && (
                  <Button
                    variant="link"
                    size="sm"
                    className="ml-5"
                    onClick={() => {
                      setStep(Step.VERIFY);
                      navigate('/wizard');
                    }}
                  >
                    View all {claimData.timeline.length} events
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-6 bg-gradient-to-br from-slate-50 to-white rounded-lg border-2 border-dashed border-slate-200">
                <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Calendar className="w-7 h-7 text-slate-400" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">No timeline events yet</h3>
                <p className="text-sm text-slate-600 mb-4 max-w-sm mx-auto">
                  Add key dates and events (invoice dates, payment requests, correspondence) to build a chronological record that strengthens your case.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStep(Step.VERIFY);
                    navigate('/wizard');
                  }}
                >
                  Add Timeline Events
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Next Actions & Deadlines */}
        <div className="space-y-6">
          {/* Next Actions Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Next Actions</h2>

            {nextActions.length > 0 ? (
              <div className="space-y-3">
                {nextActions.map((action, idx) => {
                  const ActionIcon = action.icon;
                  return (
                    <button
                      key={idx}
                      onClick={action.onClick}
                      className={`w-full text-left p-4 rounded-lg border border-slate-200 ${
                        action.color === 'teal' ? 'border-l-4 border-l-teal-500 bg-teal-50/30 hover:bg-teal-50/50' :
                        action.color === 'blue' ? 'border-l-4 border-l-blue-500 bg-blue-50/30 hover:bg-blue-50/50' :
                        action.color === 'amber' ? 'border-l-4 border-l-amber-500 bg-amber-50/30 hover:bg-amber-50/50' :
                        'border-l-4 border-l-slate-300 bg-slate-50/30 hover:bg-slate-50/50'
                      } transition-all group`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0 border border-slate-100`}>
                          <ActionIcon className={`w-5 h-5 ${
                            action.color === 'teal' ? 'text-teal-600' :
                            action.color === 'blue' ? 'text-blue-600' :
                            action.color === 'amber' ? 'text-amber-600' :
                            'text-slate-600'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 mb-1">{action.title}</p>
                          <p className="text-sm text-slate-600">{action.description}</p>
                        </div>
                        <ChevronRight className={`w-5 h-5 text-slate-400 ${
                          action.color === 'teal' ? 'group-hover:text-teal-600' :
                          action.color === 'blue' ? 'group-hover:text-blue-600' :
                          action.color === 'amber' ? 'group-hover:text-amber-600' :
                          'group-hover:text-slate-600'
                        } transition-colors flex-shrink-0`} />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 bg-slate-50 rounded-lg">
                <CheckCircle2 className="w-10 h-10 text-teal-500 mx-auto mb-2" />
                <p className="text-sm text-slate-600 font-medium">All caught up!</p>
                <p className="text-xs text-slate-500 mt-1">No immediate actions needed</p>
              </div>
            )}
          </div>

          {/* Upcoming Deadlines Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Upcoming Deadlines</h2>
              <Button
                variant="link"
                size="sm"
                onClick={() => navigate('/calendar')}
                rightIcon={<ChevronRight className="w-4 h-4" />}
                className="p-0 h-auto"
              >
                View All
              </Button>
            </div>

            {upcomingDeadlines.length > 0 ? (
              <div className="space-y-3">
                {upcomingDeadlines.map((deadline) => {
                  const daysUntil = getDaysUntilDeadline(deadline.dueDate);
                  const isOverdue = daysUntil < 0;
                  const isUrgent = daysUntil <= 3;

                  return (
                    <div
                      key={deadline.id}
                      className={`p-3 rounded-lg border border-slate-200 ${
                        isOverdue
                          ? 'border-l-4 border-l-red-500 bg-red-50/30'
                          : isUrgent
                            ? 'border-l-4 border-l-amber-500 bg-amber-50/30'
                            : 'border-l-4 border-l-slate-300 bg-slate-50/30'
                      }`}
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <Clock className={`w-4 h-4 mt-0.5 ${
                          isOverdue ? 'text-red-500' : isUrgent ? 'text-amber-500' : 'text-slate-500'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 text-sm truncate">{deadline.title}</p>
                          <p className="text-xs text-slate-500">
                            {new Date(deadline.dueDate).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short'
                            })}
                          </p>
                        </div>
                        {/* Action Buttons */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => completeDeadline(deadline)}
                            className="p-1.5 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                            title="Mark as complete"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteDeadline(deadline.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete deadline"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${
                        isOverdue
                          ? 'bg-red-100 text-red-700'
                          : isUrgent
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-700'
                      }`}>
                        {isOverdue
                          ? `${Math.abs(daysUntil)} days overdue`
                          : daysUntil === 0
                            ? 'Due today'
                            : `${daysUntil} days left`}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 bg-slate-50 rounded-lg">
                <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No upcoming deadlines</p>
              </div>
            )}
          </div>

          {/* Assessment Card */}
          {claimData.assessment && (
            <div className={`rounded-xl border border-slate-200 p-6 ${
              claimData.assessment.isViable
                ? 'border-l-4 border-l-green-500 bg-green-50/30'
                : 'border-l-4 border-l-amber-500 bg-amber-50/30'
            }`}>
              <div className="flex items-start gap-3 mb-3">
                {claimData.assessment.isViable ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
                )}
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">Claim Assessment</h3>
                  <p className="text-sm text-slate-700">{claimData.assessment.recommendation}</p>
                </div>
              </div>

              {claimData.assessment.weaknesses && claimData.assessment.weaknesses.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-200/50">
                  <p className="text-xs font-semibold text-slate-700 mb-2">Considerations:</p>
                  <ul className="text-xs text-slate-600 space-y-1">
                    {claimData.assessment.weaknesses.slice(0, 3).map((weakness, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-slate-400">•</span>
                        <span>{weakness}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
