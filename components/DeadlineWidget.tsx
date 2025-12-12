
import React from 'react';
import { Deadline, DeadlineStatus, DeadlinePriority, ClaimState } from '../types';
import { Calendar, Clock, AlertCircle, CheckCircle2, ChevronRight, Bell, AlertTriangle } from 'lucide-react';
import { DEADLINE_COLORS } from '../constants';
import { getDaysUntilDeadline } from '../services/deadlineService';

interface DeadlineWidgetProps {
  deadlines: Deadline[];
  claims: ClaimState[];
  onDeadlineClick: (deadline: Deadline) => void;
  onCompleteDeadline: (deadline: Deadline) => void;
  onViewAllClick: () => void;
}

export const DeadlineWidget: React.FC<DeadlineWidgetProps> = ({
  deadlines,
  claims,
  onDeadlineClick,
  onCompleteDeadline,
  onViewAllClick,
}) => {
  // Filter to pending deadlines and sort by due date
  const upcomingDeadlines = deadlines
    .filter(d => d.status === DeadlineStatus.PENDING)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);

  const getClaimName = (claimId: string): string => {
    const claim = claims.find(c => c.id === claimId);
    return claim?.defendant.name || 'Unknown';
  };

  const formatDaysRemaining = (dueDate: string): { text: string; isUrgent: boolean } => {
    const daysUntil = getDaysUntilDeadline(dueDate);

    if (daysUntil < 0) {
      return { text: `${Math.abs(daysUntil)} days overdue`, isUrgent: true };
    }
    if (daysUntil === 0) {
      return { text: 'Today', isUrgent: true };
    }
    if (daysUntil === 1) {
      return { text: 'Tomorrow', isUrgent: true };
    }
    return { text: `${daysUntil} days`, isUrgent: daysUntil <= 3 };
  };

  const getPriorityIcon = (priority: DeadlinePriority, isOverdue: boolean) => {
    if (isOverdue) {
      return <AlertTriangle className="w-5 h-5 text-red-500" />;
    }
    switch (priority) {
      case DeadlinePriority.CRITICAL:
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case DeadlinePriority.HIGH:
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      case DeadlinePriority.MEDIUM:
        return <Clock className="w-5 h-5 text-amber-500" />;
      default:
        return <Clock className="w-5 h-5 text-slate-500" />;
    }
  };

  // Don't render if no deadlines
  if (upcomingDeadlines.length === 0) {
    return null;
  }

  const overdueCount = deadlines.filter(d =>
    d.status === DeadlineStatus.PENDING && getDaysUntilDeadline(d.dueDate) < 0
  ).length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
            <Bell className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Upcoming Deadlines</h3>
            <p className="text-sm text-slate-500">
              {upcomingDeadlines.length} action{upcomingDeadlines.length !== 1 ? 's' : ''} required
              {overdueCount > 0 && (
                <span className="text-red-500 ml-2">({overdueCount} overdue)</span>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={onViewAllClick}
          className="text-sm font-medium text-teal-600 hover:text-teal-500 flex items-center gap-1 transition-colors"
        >
          View Calendar
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Deadline List */}
      <div className="space-y-3">
        {upcomingDeadlines.map((deadline) => {
          const { text: daysText, isUrgent } = formatDaysRemaining(deadline.dueDate);
          const isOverdue = getDaysUntilDeadline(deadline.dueDate) < 0;
          const colors = DEADLINE_COLORS[deadline.priority] || DEADLINE_COLORS.low;

          return (
            <div
              key={deadline.id}
              onClick={() => onDeadlineClick(deadline)}
              className={`flex items-center gap-4 p-4 rounded-xl border-l-4 cursor-pointer transition-all hover:bg-slate-50 ${
                isOverdue
                  ? 'bg-red-50 border-red-500'
                  : `bg-slate-50 ${colors.border}`
              }`}
            >
              {/* Icon */}
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                isOverdue ? 'bg-red-100' : 'bg-slate-100'
              }`}>
                {getPriorityIcon(deadline.priority, isOverdue)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 truncate">{deadline.title}</p>
                <p className="text-sm text-slate-500 truncate">{getClaimName(deadline.claimId)}</p>
              </div>

              {/* Due Date */}
              <div className="text-right flex-shrink-0">
                <p className={`text-sm font-semibold ${
                  isOverdue ? 'text-red-500' : isUrgent ? 'text-orange-500' : 'text-slate-600'
                }`}>
                  {daysText}
                </p>
                <p className="text-xs text-slate-400">
                  {new Date(deadline.dueDate).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short'
                  })}
                </p>
              </div>

              {/* Complete Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCompleteDeadline(deadline);
                }}
                className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors flex-shrink-0"
                title="Mark as complete"
              >
                <CheckCircle2 className="w-5 h-5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Show more indicator if there are more deadlines */}
      {deadlines.filter(d => d.status === DeadlineStatus.PENDING).length > 5 && (
        <div className="mt-4 text-center">
          <button
            onClick={onViewAllClick}
            className="text-sm text-slate-500 hover:text-teal-600 transition-colors"
          >
            View {deadlines.filter(d => d.status === DeadlineStatus.PENDING).length - 5} more deadlines
          </button>
        </div>
      )}
    </div>
  );
};
