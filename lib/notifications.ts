import nodemailer from "nodemailer";
import { differenceInDays } from "date-fns";

const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || "";
const SMTP_FROM = process.env.SMTP_FROM || ""

export const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

export async function processAlerts(
  domainName: string,
  userEmail: string,
  expirationDate: Date | null,
  sslValidTo: string | null
) {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
    console.warn("SMTP credentials missing. Notifications skipped.");
    return;
  }

  const milestones = [60, 30, 14, 3, 2, 1];
  const now = new Date();

  // 1. Check Domain Expiration
  if (expirationDate) {
    const domainDaysLeft = differenceInDays(expirationDate, now);

    // We only alert EXACTLY on the milestone days when the cron job runs
    if (milestones.includes(domainDaysLeft)) {
      await sendDomainAlert(userEmail, domainName, domainDaysLeft, "Domain Registration");
    }
  }

  // 2. Check SSL Certificate Expiration
  if (sslValidTo) {
    const sslDate = new Date(sslValidTo);
    const sslDaysLeft = differenceInDays(sslDate, now);

    if (milestones.includes(sslDaysLeft)) {
      await sendDomainAlert(userEmail, domainName, sslDaysLeft, "SSL Certificate");
    }
  }
}

async function sendDomainAlert(
  to: string,
  domainName: string,
  daysLeft: number,
  type: "Domain Registration" | "SSL Certificate"
) {
  const subject = `Urgent: ${domainName} ${type} expires in ${daysLeft} days!`;

  const alertColor = daysLeft <= 3 ? '#ef4444' : '#f59e0b';

  const html = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: ${alertColor}; padding: 20px; text-align: center;">
        <h2 style="color: white; margin: 0;">Expiration Warning</h2>
      </div>
      <div style="padding: 20px;">
        <p>Hello,</p>
        <p>This is an automated alert from <strong>TLDsync</strong>. Your tracked domain <strong>${domainName}</strong> has a critical expiration approaching.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 20px;">
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 0; color: #64748b;">Resource Type</td>
            <td style="padding: 10px 0; font-weight: bold;">${type}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 0; color: #64748b;">Days Remaining</td>
            <td style="padding: 10px 0; font-weight: bold; color: ${alertColor};">${daysLeft} days</td>
          </tr>
        </table>
        
        <p>Please log in to your registrar and renew this resource to avoid service interruption and potential hijacking.</p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"TLDsync Alerts" <${SMTP_FROM}>`,
      to,
      subject,
      html,
    });
    console.log(`Alert sent for ${domainName} - ${type} (${daysLeft} days)`);
  } catch (err) {
    console.error(`Failed to send alert for ${domainName}:`, err);
  }
}
