import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../../config/env.js';

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;

  const host = env.SMTP_HOST.replace(/['"]/g, '').trim();
  const user = env.SMTP_USER.replace(/['"]/g, '').trim();
  const pass = env.SMTP_PASS.replace(/['"]/g, '').trim();
  const port = env.SMTP_PORT || 587;

  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });
  }
  return transporter;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendNotificationEmail(options: SendEmailOptions): Promise<void> {
  const mailTransporter = getTransporter();

  if (!mailTransporter) {
    console.log('\n📧 [EMAIL SIMULATION (Configure SMTP in .env for real delivery)]');
    console.log(`   To: ${options.to}`);
    console.log(`   Subject: ${options.subject}`);
    console.log(`   Body:\n${options.text.split('\n').map((l) => '     ' + l).join('\n')}\n`);
    return;
  }

  const fromAddress = env.SMTP_USER
    ? `"Inventory Management System" <${env.SMTP_USER.replace(/['"]/g, '').trim()}>`
    : env.EMAIL_FROM;

  try {
    const info = await mailTransporter.sendMail({
      from: fromAddress,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    console.log(`✅ [EMAIL SENT] To: ${options.to} | Subject: "${options.subject}" | MessageID: ${info.messageId}`);
  } catch (error) {
    console.error(`❌ [EMAIL ERROR] Failed sending to ${options.to}:`, error);
  }
}

// ---------------------------------------------------------------------------
// High-Level notification triggers
// ---------------------------------------------------------------------------

export async function notifyRequestSubmitted(details: {
  to: string;
  requesterName: string;
  requestId: string;
  category: string;
  description: string;
}): Promise<void> {
  const subject = `[Device Request Received] #${details.requestId.slice(0, 8)} - ${details.category}`;
  const text = `Hello ${details.requesterName},\n\nYour equipment request has been successfully submitted and is awaiting approval by Admin / Team Lead.\n\nDetails:\n- Request ID: ${details.requestId}\n- Category: ${details.category}\n- Description: ${details.description}\n\nYou will be notified via email when your request is reviewed.\n\nBest regards,\nIT & Equipment Inventory Team`;

  await sendNotificationEmail({
    to: details.to,
    subject,
    text,
  });
}

export async function notifyDeviceAssigned(details: {
  to: string;
  employeeName: string;
  itemName: string;
  itemId: string;
  assignedAt: string;
  notes?: string;
}): Promise<void> {
  const subject = `[Equipment Assigned] ${details.itemName} has been assigned to you`;
  const text = `Hello ${details.employeeName},\n\nThe following equipment has been formally assigned to you in the inventory system:\n\n- Item: ${details.itemName}\n- Identifier (IMEI/Serial): ${details.itemId}\n- Assigned Date: ${details.assignedAt}\n${details.notes ? `- Notes: ${details.notes}\n` : ''}\nPlease ensure proper care and return the device in good working order when no longer needed.\n\nBest regards,\nIT & Equipment Inventory Team`;

  await sendNotificationEmail({
    to: details.to,
    subject,
    text,
  });
}

export async function notifyDeviceReturned(details: {
  to: string;
  employeeName: string;
  itemName: string;
  returnedAt: string;
  notes?: string;
}): Promise<void> {
  const subject = `[Equipment Return Confirmation] ${details.itemName} returned`;
  const text = `Hello ${details.employeeName},\n\nThis is confirmation that the following equipment has been returned and checked back into inventory:\n\n- Item: ${details.itemName}\n- Return Date: ${details.returnedAt}\n${details.notes ? `- Return Notes: ${details.notes}\n` : ''}\nThank you!\n\nBest regards,\nIT & Equipment Inventory Team`;

  await sendNotificationEmail({
    to: details.to,
    subject,
    text,
  });
}

export async function notifyRequestStatusChanged(details: {
  to: string;
  requesterName: string;
  category: string;
  status: string;
  notes?: string;
  deviceDetails?: string;
  remarks?: string;
}): Promise<void> {
  const device = details.deviceDetails || details.category;
  let subject = `[Device Request Update] Your request is now ${details.status}`;
  let text = `Hello ${details.requesterName},\n\nYour equipment request for "${details.category}" has been updated to: ${details.status}.\n${details.notes ? `\nReviewer Notes: ${details.notes}\n` : ''}\nBest regards,\nIT & Equipment Inventory Team`;

  if (details.status === 'Approved') {
    subject = `[Request Approved & Assigned] ${device}`;
    text = `Hello ${details.requesterName},\n\nYour request for ${device} has been approved and assigned.\n${details.notes || details.remarks ? `\nRemarks: ${details.notes || details.remarks}\n` : ''}\nPlease collect or check the device in your assigned equipment portal.\n\nBest regards,\nIT & Equipment Inventory Team`;
  } else if (details.status === 'Rejected') {
    const reason = details.remarks || details.notes || 'No specific reason provided';
    subject = `[Request Rejected] ${device}`;
    text = `Hello ${details.requesterName},\n\nYour request for ${device} has been rejected. Reason: ${reason}.\n\nIf you have any questions, please contact your Team Lead or IT Operations.\n\nBest regards,\nIT & Equipment Inventory Team`;
  }

  await sendNotificationEmail({
    to: details.to,
    subject,
    text,
  });
}
