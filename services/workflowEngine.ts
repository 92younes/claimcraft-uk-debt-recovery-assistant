/**
 * Workflow Engine for UK Debt Recovery
 *
 * Implements automated workflow progression based on Pre-Action Protocol
 * and best practices for commercial debt recovery in England & Wales.
 *
 * Workflow Stages:
 * 1. Draft - Claim being prepared
 * 2. Overdue - Payment date passed, no action yet
 * 3. Reminder Sent - Friendly reminder sent (7-14 days overdue)
 * 4. Final Demand - Formal demand sent (14-30 days overdue)
 * 5. LBA Sent - Letter Before Action sent (30+ days overdue)
 * 6. Court Claim - Claim filed with court (60+ days overdue)
 * 7. Judgment Obtained - CCJ/Judgment awarded
 * 8. Enforcement - Bailiff/High Court Enforcement
 * 9. Settled - Debt paid/settled
 * 10. Abandoned - Claim abandoned (uneconomical/unenforceable)
 */

import { ClaimState, ClaimStage, WorkflowState, TimelineEvent } from '../types';
import { DEFAULT_PAYMENT_TERMS_DAYS } from '../constants';

export class WorkflowEngine {
  /**
   * Calculate the current workflow state for a claim
   */
  static calculateWorkflowState(claim: ClaimState): WorkflowState {
    const currentStage = this.determineStage(claim);
    const nextAction = this.getNextAction(currentStage, claim);
    const nextActionDue = this.getNextActionDueDate(currentStage, claim);
    const daysUntilEscalation = this.getDaysUntilEscalation(claim);
    const autoEscalate = this.shouldAutoEscalate(claim);
    const escalationWarning = autoEscalate ? this.getEscalationWarning(claim) : null;

    // Build stage history from timeline events
    const stageHistory = this.buildStageHistory(claim);

    return {
      currentStage,
      nextAction,
      nextActionDue,
      daysUntilEscalation,
      autoEscalate,
      escalationWarning,
      stageHistory
    };
  }

  /**
   * Determine current stage based on timeline events and claim state
   */
  private static determineStage(claim: ClaimState): ClaimStage {
    const timeline = claim.timeline;

    // Check for terminal stages first
    if (this.hasEvent(timeline, 'payment_due') && claim.status === 'paid') {
      return ClaimStage.SETTLED;
    }

    // Check for progression stages (most recent first)
    if (this.hasEvent(timeline, 'enforcement') ||
        claim.generated?.documentType.includes('Warrant') ||
        claim.userNotes.toLowerCase().includes('bailiff') ||
        claim.userNotes.toLowerCase().includes('enforcement')) {
      return ClaimStage.ENFORCEMENT;
    }

    if (this.hasEvent(timeline, 'judgment') ||
        claim.userNotes.toLowerCase().includes('judgment') ||
        claim.userNotes.toLowerCase().includes('ccj')) {
      return ClaimStage.JUDGMENT;
    }

    if (this.hasEvent(timeline, 'court_claim') ||
        claim.selectedDocType === 'Form N1 (Claim Form)' && claim.status === 'sent') {
      return ClaimStage.COURT_CLAIM;
    }

    if (this.hasEvent(timeline, 'lba') ||
        (claim.selectedDocType === 'Letter Before Action' && claim.status === 'sent')) {
      return ClaimStage.LBA_SENT;
    }

    if (this.hasEvent(timeline, 'final_demand')) {
      return ClaimStage.FINAL_DEMAND;
    }

    if (this.hasEvent(timeline, 'reminder') || this.hasEvent(timeline, 'chaser')) {
      return ClaimStage.REMINDER_SENT;
    }

    // If payment is overdue but no action taken
    const daysOverdue = claim.interest.daysOverdue;
    if (daysOverdue > 0) {
      return ClaimStage.OVERDUE;
    }

    // Default to draft
    return ClaimStage.DRAFT;
  }

  /**
   * Get recommended next action based on current stage
   */
  private static getNextAction(stage: ClaimStage, claim: ClaimState): string {
    const daysOverdue = claim.interest.daysOverdue;

    switch (stage) {
      case ClaimStage.DRAFT:
        return 'Complete claim details and send to debtor';

      case ClaimStage.OVERDUE:
        if (daysOverdue < 7) {
          return 'Wait 7 days, then send friendly reminder';
        } else if (daysOverdue < 14) {
          return 'Send friendly payment reminder';
        } else if (daysOverdue < 30) {
          return 'Send formal demand letter';
        } else {
          return 'Send Letter Before Action (Pre-Action Protocol)';
        }

      case ClaimStage.REMINDER_SENT:
        if (daysOverdue < 14) {
          return 'Wait for response (allow 7 days)';
        } else if (daysOverdue < 30) {
          return 'Send formal demand letter';
        } else {
          return 'Send Letter Before Action';
        }

      case ClaimStage.FINAL_DEMAND:
        if (daysOverdue < 30) {
          return 'Wait for response (allow 14 days from demand)';
        } else {
          return 'Send Letter Before Action (Pre-Action Protocol required)';
        }

      case ClaimStage.LBA_SENT:
        const lbaDate = this.getEventDate(claim.timeline, 'lba') ||
                        (claim.selectedDocType === 'Letter Before Action' ? claim.lastModified : null);
        if (lbaDate) {
          const daysSinceLBA = Math.floor((Date.now() - lbaDate) / (1000 * 60 * 60 * 24));
          if (daysSinceLBA < 30) {
            return `Wait for Pre-Action Protocol period (${30 - daysSinceLBA} days remaining)`;
          }
        }
        return 'File court claim (N1 form)';

      case ClaimStage.COURT_CLAIM:
        return 'Await court response or apply for default judgment';

      case ClaimStage.JUDGMENT:
        return 'Request enforcement options (bailiff/attachment of earnings)';

      case ClaimStage.ENFORCEMENT:
        return 'Monitor enforcement progress';

      case ClaimStage.SETTLED:
        return 'Claim complete';

      case ClaimStage.ABANDONED:
        return 'No further action';

      default:
        return 'Review claim status';
    }
  }

  /**
   * Calculate when next action is due
   */
  private static getNextActionDueDate(stage: ClaimStage, claim: ClaimState): string | null {
    const daysOverdue = claim.interest.daysOverdue;

    // Handle missing due date - calculate from invoice date + default terms
    let dueDate: Date;
    if (claim.invoice.dueDate) {
      dueDate = new Date(claim.invoice.dueDate);
    } else if (claim.invoice.dateIssued) {
      dueDate = new Date(claim.invoice.dateIssued);
      dueDate.setDate(dueDate.getDate() + DEFAULT_PAYMENT_TERMS_DAYS);
    } else {
      return null; // Cannot calculate without any date
    }

    switch (stage) {
      case ClaimStage.DRAFT:
        return null; // User-driven

      case ClaimStage.OVERDUE:
        if (daysOverdue < 7) {
          // Reminder due 7 days after payment date
          const reminderDate = new Date(dueDate);
          reminderDate.setDate(reminderDate.getDate() + 7);
          return reminderDate.toISOString().split('T')[0];
        } else if (daysOverdue < 14) {
          // Demand due 14 days after payment date
          const demandDate = new Date(dueDate);
          demandDate.setDate(demandDate.getDate() + 14);
          return demandDate.toISOString().split('T')[0];
        } else if (daysOverdue < 30) {
          // LBA due 30 days after payment date
          const lbaDate = new Date(dueDate);
          lbaDate.setDate(lbaDate.getDate() + 30);
          return lbaDate.toISOString().split('T')[0];
        }
        return null;

      case ClaimStage.REMINDER_SENT:
        // Allow 7 days for response
        const reminderDate = this.getEventDate(claim.timeline, 'reminder') ||
                             this.getEventDate(claim.timeline, 'chaser');
        if (reminderDate) {
          const responseDate = new Date(reminderDate);
          responseDate.setDate(responseDate.getDate() + 7);
          return responseDate.toISOString().split('T')[0];
        }
        return null;

      case ClaimStage.FINAL_DEMAND:
        // Allow 14 days for response
        const demandDate = this.getEventDate(claim.timeline, 'final_demand');
        if (demandDate) {
          const responseDate = new Date(demandDate);
          responseDate.setDate(responseDate.getDate() + 14);
          return responseDate.toISOString().split('T')[0];
        }
        return null;

      case ClaimStage.LBA_SENT:
        // Pre-Action Protocol requires 30 days notice
        const lbaDate = this.getEventDate(claim.timeline, 'lba') ||
                        (claim.selectedDocType === 'Letter Before Action' ? claim.lastModified : null);
        if (lbaDate) {
          const courtDate = new Date(lbaDate);
          courtDate.setDate(courtDate.getDate() + 30);
          return courtDate.toISOString().split('T')[0];
        }
        return null;

      default:
        return null;
    }
  }

  /**
   * Calculate days until escalation is needed
   */
  private static getDaysUntilEscalation(claim: ClaimState): number | null {
    const nextActionDue = this.getNextActionDueDate(this.determineStage(claim), claim);
    if (!nextActionDue) return null;

    const dueDate = new Date(nextActionDue);
    const today = new Date();
    const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    return daysUntil > 0 ? daysUntil : 0;
  }

  /**
   * Determine if escalation warning should be shown
   */
  private static shouldAutoEscalate(claim: ClaimState): boolean {
    const daysUntil = this.getDaysUntilEscalation(claim);
    if (daysUntil === null) return false;

    // Show warning if action overdue or due within 3 days
    return daysUntil <= 3;
  }

  /**
   * Get escalation warning message
   */
  private static getEscalationWarning(claim: ClaimState): string {
    const daysUntil = this.getDaysUntilEscalation(claim);
    const nextAction = this.getNextAction(this.determineStage(claim), claim);

    if (daysUntil === null) return '';

    if (daysUntil < 0) {
      return `⚠️ OVERDUE: ${nextAction} was due ${Math.abs(daysUntil)} days ago. Take action now to avoid further delays.`;
    } else if (daysUntil === 0) {
      return `⚠️ URGENT: ${nextAction} is due TODAY.`;
    } else if (daysUntil <= 3) {
      return `⚡ UPCOMING: ${nextAction} due in ${daysUntil} day${daysUntil === 1 ? '' : 's'}.`;
    }

    return '';
  }

  /**
   * Build stage history from timeline events
   */
  private static buildStageHistory(claim: ClaimState): WorkflowState['stageHistory'] {
    const history: WorkflowState['stageHistory'] = [];

    // Map timeline events to stages
    const eventToStageMap: Record<string, ClaimStage> = {
      'contract': ClaimStage.DRAFT,
      'invoice': ClaimStage.DRAFT,
      'payment_due': ClaimStage.OVERDUE,
      'chaser': ClaimStage.REMINDER_SENT,
      'reminder': ClaimStage.REMINDER_SENT,
      'final_demand': ClaimStage.FINAL_DEMAND,
      'lba': ClaimStage.LBA_SENT,
      'court_claim': ClaimStage.COURT_CLAIM,
      'judgment': ClaimStage.JUDGMENT,
      'enforcement': ClaimStage.ENFORCEMENT
    };

    claim.timeline.forEach(event => {
      const stage = eventToStageMap[event.type];
      if (stage) {
        history.push({
          stage,
          enteredAt: event.date,
          notes: event.description
        });
      }
    });

    // Add current stage if not in history
    const currentStage = this.determineStage(claim);
    if (!history.some(h => h.stage === currentStage)) {
      history.push({
        stage: currentStage,
        enteredAt: new Date().toISOString().split('T')[0],
        notes: 'Current stage'
      });
    }

    return history.sort((a, b) => new Date(a.enteredAt).getTime() - new Date(b.enteredAt).getTime());
  }

  /**
   * Helper: Check if timeline has event of specific type
   */
  private static hasEvent(timeline: TimelineEvent[], type: string): boolean {
    return timeline.some(event =>
      event.type === type ||
      event.description.toLowerCase().includes(type.replace('_', ' '))
    );
  }

  /**
   * Helper: Get date of first event of specific type
   */
  private static getEventDate(timeline: TimelineEvent[], type: string): number | null {
    const event = timeline.find(e =>
      e.type === type ||
      e.description.toLowerCase().includes(type.replace('_', ' '))
    );
    return event ? new Date(event.date).getTime() : null;
  }

  /**
   * Update workflow state when user takes action
   * (Call this when user sends document, marks as paid, etc.)
   */
  static updateWorkflowOnAction(
    claim: ClaimState,
    action: 'reminder_sent' | 'demand_sent' | 'lba_sent' | 'claim_filed' | 'judgment_obtained' | 'settled' | 'abandoned'
  ): WorkflowState {
    // Add timeline event for the action
    const now = new Date().toISOString().split('T')[0];
    const eventMap: Record<typeof action, { type: TimelineEvent['type'], description: string }> = {
      'reminder_sent': { type: 'chaser', description: 'Payment reminder sent' },
      'demand_sent': { type: 'communication', description: 'Final demand sent' },
      'lba_sent': { type: 'communication', description: 'Letter Before Action sent' },
      'claim_filed': { type: 'communication', description: 'Court claim filed (N1)' },
      'judgment_obtained': { type: 'communication', description: 'Judgment obtained' },
      'settled': { type: 'payment_due', description: 'Debt settled/paid' },
      'abandoned': { type: 'communication', description: 'Claim abandoned' }
    };

    const eventData = eventMap[action];
    claim.timeline.push({
      date: now,
      description: eventData.description,
      type: eventData.type
    });

    // Recalculate workflow state
    return this.calculateWorkflowState(claim);
  }

  /**
   * Get stage badge color for UI
   */
  static getStageBadgeColor(stage: ClaimStage): string {
    switch (stage) {
      case ClaimStage.DRAFT:
        return 'bg-gray-100 text-gray-700 border-gray-300';
      case ClaimStage.OVERDUE:
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case ClaimStage.REMINDER_SENT:
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case ClaimStage.FINAL_DEMAND:
        return 'bg-orange-100 text-orange-700 border-orange-300';
      case ClaimStage.LBA_SENT:
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case ClaimStage.COURT_CLAIM:
        return 'bg-red-100 text-red-700 border-red-300';
      case ClaimStage.JUDGMENT:
        return 'bg-pink-100 text-pink-700 border-pink-300';
      case ClaimStage.ENFORCEMENT:
        return 'bg-indigo-100 text-indigo-700 border-indigo-300';
      case ClaimStage.SETTLED:
        return 'bg-green-100 text-green-700 border-green-300';
      case ClaimStage.ABANDONED:
        return 'bg-gray-100 text-gray-500 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  }

  /**
   * Get urgency level for sorting/filtering
   */
  static getUrgencyLevel(workflow: WorkflowState): 'critical' | 'high' | 'medium' | 'low' {
    if (workflow.autoEscalate && workflow.daysUntilEscalation !== null) {
      if (workflow.daysUntilEscalation < 0) return 'critical';
      if (workflow.daysUntilEscalation === 0) return 'critical';
      if (workflow.daysUntilEscalation <= 3) return 'high';
    }

    switch (workflow.currentStage) {
      case ClaimStage.COURT_CLAIM:
      case ClaimStage.JUDGMENT:
      case ClaimStage.ENFORCEMENT:
        return 'high';
      case ClaimStage.LBA_SENT:
      case ClaimStage.FINAL_DEMAND:
        return 'medium';
      default:
        return 'low';
    }
  }
}
