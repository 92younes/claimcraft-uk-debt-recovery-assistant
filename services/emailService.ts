
import { Deadline, DeadlineReminder, ClaimState, DeadlinePriority } from '../types';
import { getDaysUntilDeadline } from './deadlineService';

// ==========================================
// Email Notification Service
// ==========================================

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Generate email content for a deadline reminder
 */
export const generateReminderEmailContent = (
  deadline: Deadline,
  claim: ClaimState,
  daysUntilDue: number
): { subject: string; html: string; text: string } => {
  const isUrgent = daysUntilDue <= 1;
  const urgencyText = daysUntilDue === 0 ? 'TODAY' :
                      daysUntilDue === 1 ? 'TOMORROW' :
                      daysUntilDue < 0 ? `${Math.abs(daysUntilDue)} days OVERDUE` :
                      `in ${daysUntilDue} days`;

  const subject = `[ClaimCraft] ${isUrgent ? 'URGENT: ' : ''}${deadline.title} - Due ${urgencyText}`;

  const priorityColor = {
    [DeadlinePriority.CRITICAL]: '#dc2626',
    [DeadlinePriority.HIGH]: '#ea580c',
    [DeadlinePriority.MEDIUM]: '#d97706',
    [DeadlinePriority.LOW]: '#2563eb',
  }[deadline.priority] || '#0d9488';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="background: ${isUrgent || daysUntilDue < 0 ? '#fef2f2' : '#f0fdfa'}; padding: 24px; border-radius: 12px 12px 0 0; border-left: 4px solid ${priorityColor};">
          <h2 style="color: ${priorityColor}; margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">
            Deadline ${urgencyText}
          </h2>
          <p style="font-size: 20px; font-weight: bold; margin: 0; color: #111827;">${deadline.title}</p>
        </div>

        <!-- Body -->
        <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="color: #374151; margin: 0 0 20px 0; line-height: 1.6;">${deadline.description}</p>

          <!-- Claim Details -->
          <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Claim:</td>
                <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right;">${claim.defendant.name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Amount:</td>
                <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right;">£${claim.invoice.totalAmount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Due Date:</td>
                <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right;">${new Date(deadline.dueDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</td>
              </tr>
            </table>
          </div>

          ${deadline.legalReference ? `
            <p style="font-style: italic; color: #6b7280; font-size: 14px; margin-top: 16px;">
              <strong>Legal Reference:</strong> ${deadline.legalReference}
            </p>
          ` : ''}
        </div>

        <!-- Footer -->
        <div style="background: #f9fafb; padding: 16px 24px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none; text-align: center;">
          <p style="font-size: 12px; color: #9ca3af; margin: 0;">
            This reminder was sent by ClaimCraft UK - Debt Recovery Assistant.
          </p>
        </div>
      </div>
    </body>
    </html>
  `.trim();

  const text = `
DEADLINE ${urgencyText.toUpperCase()}: ${deadline.title}

${deadline.description}

Claim Details:
- Debtor: ${claim.defendant.name}
- Amount: £${claim.invoice.totalAmount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
- Due Date: ${new Date(deadline.dueDate).toLocaleDateString('en-GB')}

${deadline.legalReference ? `Legal Reference: ${deadline.legalReference}` : ''}

---
This reminder was sent by ClaimCraft UK - Debt Recovery Assistant.
  `.trim();

  return { subject, html, text };
};

/**
 * Send deadline reminder email via backend API
 */
export const sendDeadlineReminder = async (
  reminder: DeadlineReminder,
  deadline: Deadline,
  claim: ClaimState
): Promise<boolean> => {
  if (!reminder.emailAddress) {
    console.error('No email address provided for reminder');
    return false;
  }

  const daysUntilDue = getDaysUntilDeadline(deadline.dueDate);
  const { subject, html, text } = generateReminderEmailContent(deadline, claim, daysUntilDue);

  try {
    const response = await fetch(`${API_URL}/api/notifications/send-reminder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: reminder.emailAddress,
        subject,
        html,
        text,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to send reminder:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to send reminder:', error);
    return false;
  }
};

/**
 * Send test email to verify configuration
 */
export const sendTestEmail = async (email: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch(`${API_URL}/api/notifications/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || 'Failed to send test email' };
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to send test email:', error);
    return { success: false, error: 'Network error. Please check your connection.' };
  }
};

/**
 * Check if email service is configured
 */
export const isEmailServiceConfigured = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_URL}/api/notifications/status`, {
      method: 'GET',
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.configured === true;
  } catch {
    return false;
  }
};

/**
 * Generate reminders for a deadline based on reminder days
 * @param deadline The deadline to generate reminders for
 * @param emailAddress Email address to send reminders to
 * @returns Array of DeadlineReminder objects
 */
export const generateRemindersForDeadline = (
  deadline: Deadline,
  emailAddress: string
): DeadlineReminder[] => {
  const reminders: DeadlineReminder[] = [];
  const dueDate = new Date(deadline.dueDate);

  for (const daysBefore of deadline.reminderDays) {
    const reminderDate = new Date(dueDate);
    reminderDate.setDate(reminderDate.getDate() - daysBefore);

    // Only create reminder if it's in the future
    if (reminderDate > new Date()) {
      reminders.push({
        id: `rem_${deadline.id}_${daysBefore}`,
        deadlineId: deadline.id,
        claimId: deadline.claimId,
        reminderDate: reminderDate.toISOString().split('T')[0],
        sent: false,
        channel: 'email',
        emailAddress,
      });
    }
  }

  return reminders;
};
