import "server-only";
import nodemailer from "nodemailer";

// Gmail SMTP, authenticated as the sender's own account (an "app password",
// not the real Google password — myaccount.google.com/apppasswords).
// Unlike a transactional-email API's shared sandbox domain, this sends as
// an already-trusted address, so there's no separate domain-verification
// step and no restriction on which recipients it can reach.
const transporter =
  process.env.SMTP_USER && process.env.SMTP_PASSWORD
    ? nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
      })
    : null;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// Every caller in this file is best-effort: a notification failing to send
// is never a reason to fail the action that triggered it, so this always
// resolves to { sent } rather than throwing.
async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }): Promise<{ sent: boolean }> {
  if (!transporter) {
    console.warn(`[email] SMTP_USER/SMTP_PASSWORD not set — skipped "${subject}" email to ${to}`);
    return { sent: false };
  }

  try {
    await transporter.sendMail({ from: `MediLab <${process.env.SMTP_USER}>`, to, subject, html });
    return { sent: true };
  } catch (error) {
    console.error(`[email] Failed to send "${subject}" email:`, error);
    return { sent: false };
  }
}

export async function sendStaffAccountCreatedEmail({
  to,
  staffName,
  labName,
  loginEmail,
  temporaryPassword,
}: {
  to: string;
  staffName: string;
  labName: string;
  loginEmail: string;
  temporaryPassword: string;
}) {
  return sendEmail({
    to,
    subject: `Your ${labName} staff account on MediLab`,
    html: `
      <p>Hi ${escapeHtml(staffName)},</p>
      <p>${escapeHtml(labName)} has created a MediLab staff account for you.</p>
      <p>
        <strong>Login email:</strong> ${escapeHtml(loginEmail)}<br />
        <strong>Temporary password:</strong> ${escapeHtml(temporaryPassword)}
      </p>
      <p>Sign in and change this password from your account page whenever you like.</p>
    `,
  });
}

// FR7/FR8 (docs/SRS.md §5): confirms a booking and repeats the prep
// instructions shown on-screen, so a patient still has them without
// needing to log back in before their appointment.
export async function sendAppointmentBookedEmail({
  to,
  patientName,
  labName,
  testName,
  slotDatetime,
  price,
  prepInstructions,
}: {
  to: string;
  patientName: string;
  labName: string;
  testName: string;
  slotDatetime: Date;
  price: string;
  prepInstructions?: string | null;
}) {
  return sendEmail({
    to,
    subject: `Confirmed: your ${testName} appointment at ${labName}`,
    html: `
      <p>Hi ${escapeHtml(patientName)},</p>
      <p>Your appointment is confirmed:</p>
      <p>
        <strong>Test:</strong> ${escapeHtml(testName)}<br />
        <strong>Lab:</strong> ${escapeHtml(labName)}<br />
        <strong>When:</strong> ${escapeHtml(slotDatetime.toLocaleString())}<br />
        <strong>Price:</strong> GHS ${escapeHtml(price)}
      </p>
      ${prepInstructions ? `<p><strong>Before your appointment:</strong> ${escapeHtml(prepInstructions)}</p>` : ""}
      <p>You can view or cancel this appointment any time from your MediLab account.</p>
    `,
  });
}

// FR10: mirrors cancelAppointment — sent on the same event, whether the
// patient cancelled it themselves or (in future) a lab-side action does.
export async function sendAppointmentCancelledEmail({
  to,
  patientName,
  labName,
  testName,
  slotDatetime,
}: {
  to: string;
  patientName: string;
  labName: string;
  testName: string;
  slotDatetime: Date;
}) {
  return sendEmail({
    to,
    subject: `Cancelled: your ${testName} appointment at ${labName}`,
    html: `
      <p>Hi ${escapeHtml(patientName)},</p>
      <p>Your appointment has been cancelled:</p>
      <p>
        <strong>Test:</strong> ${escapeHtml(testName)}<br />
        <strong>Lab:</strong> ${escapeHtml(labName)}<br />
        <strong>Was scheduled for:</strong> ${escapeHtml(slotDatetime.toLocaleString())}
      </p>
      <p>You can book a new appointment any time from MediLab.</p>
    `,
  });
}
