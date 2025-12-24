
import React, { useState, useMemo, useCallback } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Download,
  Filter,
  AlertCircle,
  Clock,
  CheckCircle2,
  Plus,
  X,
  Bell,
  AlertTriangle,
  Eye,
  MoreHorizontal,
  Trash2
} from 'lucide-react';
import { Deadline, DeadlineStatus, DeadlinePriority, DeadlineType, ClaimState } from '../types';
import { DEADLINE_COLORS, DEADLINE_TYPE_LABELS } from '../constants';
import { getDaysUntilDeadline } from '../services/deadlineService';
import { downloadICalFile, downloadSingleDeadlineIcal } from '../services/icalService';
import { formatDateISO } from '../utils/formatters';

type ViewMode = 'month' | 'week' | 'day';

interface CalendarViewProps {
  deadlines: Deadline[];
  claims: ClaimState[];
  onBack: () => void;
  onDeadlineClick: (deadline: Deadline) => void;
  onCompleteDeadline: (deadline: Deadline) => void;
  onDeleteDeadline?: (deadlineId: string) => void;
  onAddDeadline?: () => void;
}

// Helper to get days in a month
const getDaysInMonth = (year: number, month: number): Date[] => {
  const days: Date[] = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
};

// Helper to get week start (Monday)
const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};

// Helper to get week days
const getWeekDays = (startDate: Date): Date[] => {
  const days: Date[] = [];
  const d = new Date(startDate);
  for (let i = 0; i < 7; i++) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
};

// Format date as YYYY-MM-DD for comparison (using local timezone)
const formatDateKey = (date: Date): string => {
  return formatDateISO(date);
};

export const CalendarView: React.FC<CalendarViewProps> = ({
  deadlines,
  claims,
  onBack,
  onDeadlineClick,
  onCompleteDeadline,
  onDeleteDeadline,
  onAddDeadline,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedClaimId, setSelectedClaimId] = useState<string>('all');
  const [selectedDeadline, setSelectedDeadline] = useState<Deadline | null>(null);
  const [showPriorityLegend, setShowPriorityLegend] = useState(false);

  // Filter deadlines by claim
  const filteredDeadlines = useMemo(() => {
    if (selectedClaimId === 'all') return deadlines;
    return deadlines.filter(d => d.claimId === selectedClaimId);
  }, [deadlines, selectedClaimId]);

  // Group deadlines by date
  const deadlinesByDate = useMemo(() => {
    const map = new Map<string, Deadline[]>();
    filteredDeadlines.forEach(d => {
      const key = d.dueDate.split('T')[0];
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(d);
    });
    return map;
  }, [filteredDeadlines]);

  // Navigation
  const goToToday = () => setCurrentDate(new Date());

  const goToPrevious = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() - 1);
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() - 7);
    } else {
      d.setDate(d.getDate() - 1);
    }
    setCurrentDate(d);
  };

  const goToNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() + 1);
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() + 7);
    } else {
      d.setDate(d.getDate() + 1);
    }
    setCurrentDate(d);
  };

  // Get claim name helper
  const getClaimName = (claimId: string): string => {
    const claim = claims.find(c => c.id === claimId);
    return claim?.defendant.name || 'Unknown';
  };

  // Export all visible deadlines
  const handleExportAll = () => {
    const relevantClaims = selectedClaimId === 'all'
      ? claims
      : claims.filter(c => c.id === selectedClaimId);
    downloadICalFile(filteredDeadlines, relevantClaims, 'claimcraft-deadlines.ics');
  };

  // Export single deadline
  const handleExportSingle = (deadline: Deadline) => {
    const claim = claims.find(c => c.id === deadline.claimId);
    downloadSingleDeadlineIcal(deadline, claim);
  };

  // Priority styling (light theme)
  const getPriorityStyles = (priority: DeadlinePriority, status: DeadlineStatus) => {
    if (status === DeadlineStatus.COMPLETED) {
      return {
        bg: 'bg-slate-100',
        border: 'border-slate-300',
        text: 'text-slate-500',
        dot: 'bg-slate-400',
      };
    }
    return DEADLINE_COLORS[priority] || DEADLINE_COLORS.low;
  };

  const getPriorityIcon = (priority: DeadlinePriority, isOverdue: boolean) => {
    if (isOverdue) return <AlertTriangle className="w-4 h-4 text-red-400" />;
    switch (priority) {
      case DeadlinePriority.CRITICAL: return <AlertCircle className="w-4 h-4 text-red-400" />;
      case DeadlinePriority.HIGH: return <AlertCircle className="w-4 h-4 text-orange-400" />;
      case DeadlinePriority.MEDIUM: return <Clock className="w-4 h-4 text-amber-400" />;
      default: return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  // Render month view
  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Monday start
    const today = formatDateKey(new Date());

    // Pad start with previous month days
    const prevMonthDays: Date[] = [];
    if (adjustedFirstDay > 0) {
      const prevMonth = new Date(year, month, 0);
      for (let i = adjustedFirstDay - 1; i >= 0; i--) {
        prevMonthDays.push(new Date(year, month - 1, prevMonth.getDate() - i));
      }
    }

    // Pad end with next month days
    const totalCells = Math.ceil((prevMonthDays.length + daysInMonth.length) / 7) * 7;
    const nextMonthDays: Date[] = [];
    for (let i = 1; nextMonthDays.length < totalCells - prevMonthDays.length - daysInMonth.length; i++) {
      nextMonthDays.push(new Date(year, month + 1, i));
    }

    const allDays = [...prevMonthDays, ...daysInMonth, ...nextMonthDays];
    const weeks: Date[][] = [];
    for (let i = 0; i < allDays.length; i += 7) {
      weeks.push(allDays.slice(i, i + 7));
    }

    return (
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-slate-50">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div key={day} className="px-2 py-3 text-center text-xs font-semibold text-slate-500 uppercase">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="divide-y divide-slate-200">
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className="grid grid-cols-7 divide-x divide-slate-200">
              {week.map((day, dayIdx) => {
                const dateKey = formatDateKey(day);
                const isCurrentMonth = day.getMonth() === month;
                const isToday = dateKey === today;
                const dayDeadlines = deadlinesByDate.get(dateKey) || [];

                return (
                  <div
                    key={dayIdx}
                    className={`min-h-[100px] p-2 ${
                      isCurrentMonth ? 'bg-white' : 'bg-slate-50'
                    } ${isToday ? 'ring-2 ring-inset ring-teal-500' : ''}`}
                  >
                    {/* Day number */}
                    <div className={`text-sm font-medium mb-1 ${
                      isToday
                        ? 'w-7 h-7 bg-teal-500 text-white rounded-full flex items-center justify-center'
                        : isCurrentMonth
                          ? 'text-slate-700'
                          : 'text-slate-400'
                    }`}>
                      {isToday ? (
                        day.getDate()
                      ) : (
                        day.getDate()
                      )}
                    </div>

                    {/* Deadlines for this day */}
                    <div className="space-y-1">
                      {dayDeadlines.slice(0, 3).map(deadline => {
                        const isOverdue = getDaysUntilDeadline(deadline.dueDate) < 0 && deadline.status === DeadlineStatus.PENDING;
                        const styles = getPriorityStyles(deadline.priority, deadline.status);

                        return (
                          <button
                            key={deadline.id}
                            onClick={() => setSelectedDeadline(deadline)}
                            className={`w-full text-left px-2 py-1 rounded text-xs truncate ${
                              isOverdue
                                ? 'bg-red-50 text-red-700 border-l-2 border-red-500'
                                : deadline.status === DeadlineStatus.COMPLETED
                                  ? 'bg-slate-100 text-slate-500 line-through'
                                  : `${styles.bg} ${styles.text} border-l-2 ${styles.border}`
                            }`}
                          >
                            {deadline.title}
                          </button>
                        );
                      })}
                      {dayDeadlines.length > 3 && (
                        <button
                          onClick={() => {
                            setCurrentDate(day);
                            setViewMode('day');
                          }}
                          className="text-xs text-teal-600 hover:text-teal-700 pl-2"
                        >
                          +{dayDeadlines.length - 3} more
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render week view
  const renderWeekView = () => {
    const weekStart = getWeekStart(currentDate);
    const weekDays = getWeekDays(weekStart);
    const today = formatDateKey(new Date());

    return (
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-7 divide-x divide-slate-200">
          {weekDays.map((day, idx) => {
            const dateKey = formatDateKey(day);
            const isToday = dateKey === today;
            const dayDeadlines = deadlinesByDate.get(dateKey) || [];

            return (
              <div key={idx} className={`min-h-[400px] ${isToday ? 'bg-teal-50/50' : ''}`}>
                {/* Day header */}
                <div className={`px-3 py-4 border-b border-slate-200 text-center ${
                  isToday ? 'bg-teal-50' : 'bg-slate-50'
                }`}>
                  <p className="text-xs text-slate-500 uppercase">
                    {day.toLocaleDateString('en-GB', { weekday: 'short' })}
                  </p>
                  <p className={`text-lg font-semibold ${
                    isToday ? 'text-teal-600' : 'text-slate-900'
                  }`}>
                    {day.getDate()}
                  </p>
                </div>

                {/* Deadlines */}
                <div className="p-2 space-y-2">
                  {dayDeadlines.map(deadline => {
                    const isOverdue = getDaysUntilDeadline(deadline.dueDate) < 0 && deadline.status === DeadlineStatus.PENDING;
                    const styles = getPriorityStyles(deadline.priority, deadline.status);

                    return (
                      <button
                        key={deadline.id}
                        onClick={() => setSelectedDeadline(deadline)}
                        className={`w-full text-left p-2 rounded-lg text-sm ${
                          isOverdue
                            ? 'bg-red-50 border border-red-200'
                            : deadline.status === DeadlineStatus.COMPLETED
                              ? 'bg-slate-50 border border-slate-200'
                              : `bg-slate-50 border-l-4 ${styles.border}`
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {getPriorityIcon(deadline.priority, isOverdue)}
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium truncate ${
                              deadline.status === DeadlineStatus.COMPLETED ? 'text-slate-400 line-through' : 'text-slate-900'
                            }`}>
                              {deadline.title}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              {getClaimName(deadline.claimId)}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render day view
  const renderDayView = () => {
    const dateKey = formatDateKey(currentDate);
    const dayDeadlines = deadlinesByDate.get(dateKey) || [];
    const today = formatDateKey(new Date());
    const isToday = dateKey === today;

    return (
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Day header */}
        <div className={`px-6 py-4 border-b border-slate-200 ${isToday ? 'bg-teal-50' : 'bg-slate-50'}`}>
          <p className="text-lg font-semibold text-slate-900">
            {currentDate.toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </p>
          {isToday && (
            <span className="inline-block mt-1 px-2 py-0.5 bg-teal-500 text-white text-xs font-medium rounded">
              Today
            </span>
          )}
        </div>

        {/* Deadlines */}
        <div className="p-4">
          {dayDeadlines.length === 0 ? (
            <div className="text-center py-12">
              <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No deadlines for this day</p>
            </div>
          ) : (
            <div className="space-y-3">
              {dayDeadlines.map(deadline => {
                const isOverdue = getDaysUntilDeadline(deadline.dueDate) < 0 && deadline.status === DeadlineStatus.PENDING;
                const styles = getPriorityStyles(deadline.priority, deadline.status);

                return (
                  <div
                    key={deadline.id}
                    onClick={() => setSelectedDeadline(deadline)}
                    className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all hover:bg-slate-50 ${
                      isOverdue
                        ? 'bg-red-50 border border-red-200'
                        : deadline.status === DeadlineStatus.COMPLETED
                          ? 'bg-slate-50 border border-slate-200'
                          : `bg-white border border-slate-200 border-l-4 ${styles.border}`
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      isOverdue ? 'bg-red-100' : 'bg-slate-100'
                    }`}>
                      {getPriorityIcon(deadline.priority, isOverdue)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${
                        deadline.status === DeadlineStatus.COMPLETED ? 'text-slate-400 line-through' : 'text-slate-900'
                      }`}>
                        {deadline.title}
                      </p>
                      <p className="text-sm text-slate-500">{getClaimName(deadline.claimId)}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {DEADLINE_TYPE_LABELS[deadline.type] || deadline.type}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {deadline.status !== DeadlineStatus.COMPLETED && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onCompleteDeadline(deadline);
                          }}
                          className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                          title="Mark as complete"
                        >
                          <CheckCircle2 className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExportSingle(deadline);
                        }}
                        className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                        title="Export to calendar"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Deadline detail modal
  const renderDeadlineModal = () => {
    if (!selectedDeadline) return null;

    const isOverdue = getDaysUntilDeadline(selectedDeadline.dueDate) < 0 && selectedDeadline.status === DeadlineStatus.PENDING;
    const daysUntil = getDaysUntilDeadline(selectedDeadline.dueDate);
    const claim = claims.find(c => c.id === selectedDeadline.claimId);

    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-lg shadow-2xl">
          {/* Header */}
          <div className={`px-6 py-4 border-b border-slate-200 rounded-t-2xl ${
            isOverdue ? 'bg-red-50' : 'bg-slate-50'
          }`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {getPriorityIcon(selectedDeadline.priority, isOverdue)}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{selectedDeadline.title}</h3>
                  <p className="text-sm text-slate-500">
                    {DEADLINE_TYPE_LABELS[selectedDeadline.type] || selectedDeadline.type}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDeadline(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Close deadline details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Status</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                selectedDeadline.status === DeadlineStatus.COMPLETED
                  ? 'bg-teal-100 text-teal-700'
                  : isOverdue
                    ? 'bg-red-100 text-red-700'
                    : 'bg-amber-100 text-amber-700'
              }`}>
                {selectedDeadline.status === DeadlineStatus.COMPLETED
                  ? 'Completed'
                  : isOverdue
                    ? `${Math.abs(daysUntil)} days overdue`
                    : daysUntil === 0
                      ? 'Due today'
                      : daysUntil === 1
                        ? 'Due tomorrow'
                        : `${daysUntil} days remaining`}
              </span>
            </div>

            {/* Due Date */}
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Due Date</span>
              <span className="text-slate-900 font-medium">
                {new Date(selectedDeadline.dueDate).toLocaleDateString('en-GB', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </span>
            </div>

            {/* Claim */}
            {claim && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Claim</span>
                <span className="text-slate-900 font-medium">{claim.defendant.name}</span>
              </div>
            )}

            {/* Description */}
            <div className="pt-2">
              <span className="text-slate-500 block mb-2">Description</span>
              <p className="text-slate-700 text-sm leading-relaxed">
                {selectedDeadline.description}
              </p>
            </div>

            {/* Legal Reference */}
            {selectedDeadline.legalReference && (
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                <span className="text-xs text-slate-500 block mb-1">Legal Reference</span>
                <p className="text-sm text-slate-700">{selectedDeadline.legalReference}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 flex items-center gap-3">
            {selectedDeadline.status !== DeadlineStatus.COMPLETED && (
              <button
                onClick={() => {
                  onCompleteDeadline(selectedDeadline);
                  setSelectedDeadline(null);
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-500 text-white font-medium rounded-lg hover:bg-teal-600 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                Mark Complete
              </button>
            )}
            <button
              onClick={() => handleExportSingle(selectedDeadline)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={() => {
                onDeadlineClick(selectedDeadline);
                setSelectedDeadline(null);
              }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors"
            >
              <Eye className="w-4 h-4" />
              View
            </button>
            {onDeleteDeadline && (
              <button
                onClick={() => {
                  onDeleteDeadline(selectedDeadline.id);
                  setSelectedDeadline(null);
                }}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 font-medium rounded-lg hover:bg-red-100 transition-colors"
                title="Delete deadline"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Stats summary
  const stats = useMemo(() => {
    const pending = filteredDeadlines.filter(d => d.status === DeadlineStatus.PENDING);
    const overdue = pending.filter(d => getDaysUntilDeadline(d.dueDate) < 0);
    const dueThisWeek = pending.filter(d => {
      const days = getDaysUntilDeadline(d.dueDate);
      return days >= 0 && days <= 7;
    });
    const completed = filteredDeadlines.filter(d => d.status === DeadlineStatus.COMPLETED);

    return { pending: pending.length, overdue: overdue.length, dueThisWeek: dueThisWeek.length, completed: completed.length };
  }, [filteredDeadlines]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </button>

        <div className="flex items-center gap-3">
          {/* Export button */}
          <button
            onClick={handleExportAll}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export iCal</span>
          </button>

          {/* Add deadline button */}
          {onAddDeadline && (
            <button
              onClick={onAddDeadline}
              className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white font-medium rounded-lg hover:bg-teal-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Deadline</span>
            </button>
          )}
        </div>
      </div>

      <div>
        {/* Page title and stats */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center">
              <CalendarIcon className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Deadline Calendar</h1>
              <p className="text-slate-500">Manage and track your claim deadlines</p>
            </div>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <p className="text-slate-500 text-sm">Pending</p>
              <p className="text-2xl font-bold text-slate-900">{stats.pending}</p>
            </div>
            <div className={`rounded-xl p-4 border ${stats.overdue > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
              <p className={`text-sm ${stats.overdue > 0 ? 'text-red-600' : 'text-slate-500'}`}>Overdue</p>
              <p className={`text-2xl font-bold ${stats.overdue > 0 ? 'text-red-600' : 'text-slate-900'}`}>{stats.overdue}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <p className="text-slate-500 text-sm">Due This Week</p>
              <p className="text-2xl font-bold text-slate-900">{stats.dueThisWeek}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <p className="text-slate-500 text-sm">Completed</p>
              <p className="text-2xl font-bold text-teal-600">{stats.completed}</p>
            </div>
          </div>
        </div>

        {/* Calendar controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          {/* Left: Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={goToPrevious}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              onClick={goToNext}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <span className="text-lg font-semibold text-slate-900 ml-2">
              {viewMode === 'day'
                ? currentDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                : currentDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
            </span>
          </div>

          {/* Right: View mode and filters */}
          <div className="flex items-center gap-3">
            {/* Claim filter */}
            <div className="relative">
              <select
                value={selectedClaimId}
                onChange={(e) => setSelectedClaimId(e.target.value)}
                className="appearance-none pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="all">All Claims</option>
                {claims.map(claim => (
                  <option key={claim.id} value={claim.id}>
                    {claim.defendant.name}
                  </option>
                ))}
              </select>
              <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            {/* View mode toggle */}
            <div className="flex bg-slate-100 rounded-lg p-1">
              {(['month', 'week', 'day'] as ViewMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    viewMode === mode
                      ? 'bg-teal-500 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>

            {/* Legend toggle */}
            <button
              onClick={() => setShowPriorityLegend(!showPriorityLegend)}
              className={`p-2 rounded-lg transition-colors ${
                showPriorityLegend ? 'bg-teal-50 text-teal-600' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Show priority legend"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Priority legend */}
        {showPriorityLegend && (
          <div className="flex flex-wrap items-center gap-4 mb-4 p-3 bg-white rounded-lg border border-slate-200">
            <span className="text-sm text-slate-500">Priority:</span>
            {[
              { priority: DeadlinePriority.CRITICAL, label: 'Critical' },
              { priority: DeadlinePriority.HIGH, label: 'High' },
              { priority: DeadlinePriority.MEDIUM, label: 'Medium' },
              { priority: DeadlinePriority.LOW, label: 'Low' },
            ].map(({ priority, label }) => {
              const colors = DEADLINE_COLORS[priority];
              return (
                <div key={priority} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${colors.dot}`} />
                  <span className="text-sm text-slate-600">{label}</span>
                </div>
              );
            })}
            <div className="flex items-center gap-2 ml-4 border-l border-slate-200 pl-4">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-sm text-slate-600">Overdue</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-400" />
              <span className="text-sm text-slate-600">Completed</span>
            </div>
          </div>
        )}

        {/* Calendar view */}
        {viewMode === 'month' && renderMonthView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'day' && renderDayView()}

        {/* Empty state */}
        {filteredDeadlines.length === 0 && (
          <div className="text-center py-20 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 relative overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-teal-50 rounded-full -ml-12 -mb-12 opacity-50"></div>

            {/* Content */}
            <div className="relative z-10">
              <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CalendarIcon className="w-8 h-8 text-teal-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No Deadlines Yet</h3>
              <p className="text-slate-500 mb-3 max-w-md mx-auto">
                {selectedClaimId === 'all'
                  ? 'Start a claim to automatically track important deadlines like response dates and court hearing dates.'
                  : 'This claim has no associated deadlines yet. Add deadlines to track important dates and stay on top of your case.'}
              </p>
              <p className="text-sm text-slate-600 mb-6 max-w-md mx-auto">
                Track deadlines for responses, court hearings, compliance dates, and other time-sensitive tasks.
              </p>
              {onAddDeadline && (
                <button
                  onClick={onAddDeadline}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-teal-500 text-white font-semibold rounded-lg hover:bg-teal-600 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  <Plus className="w-4 h-4" />
                  Add Your First Deadline
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Deadline detail modal */}
      {renderDeadlineModal()}
    </div>
  );
};
