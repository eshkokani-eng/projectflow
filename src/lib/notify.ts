// =============================================================
// FILE: src/lib/notify.ts
// PURPOSE: Sends email notifications to your team when projects
//          are created, updated, or commented on.
//
// USES: Resend (https://resend.com)
//   1. Sign up free at resend.com
//   2. Get your API key from: Dashboard → API Keys
//   3. Add to .env.local:
//
//      RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx
//      NOTIFY_FROM_EMAIL=notifications@yourdomain.com
//
//   NOTE: For testing without a domain, use:
//      NOTIFY_FROM_EMAIL=onboarding@resend.dev
//      (Resend allows this for testing but only sends to your Resend account email)
// =============================================================

// =============================================================
// ✏️  STEP 1 — PUT YOUR TEAM EMAILS HERE
//    Replace the placeholder emails below with your real ones.
//    These people will receive all project notifications.
// =============================================================
const TEAM_NOTIFICATION_EMAILS: string[] = [
  'eyad@aralsane.com',      // ← User 1: replace with real email
  'hartini@aralsane.com',   // ← User 2: replace with real email
  'sabu@aralsane.com',      // ← User 3: replace with real email
]

// =============================================================
// Internal function — sends the actual email via Resend
// =============================================================
async function sendEmail(subject: string, htmlBody: string): Promise<void> {
  const apiKey  = process.env.RESEND_API_KEY
  const fromEmail = process.env.NOTIFY_FROM_EMAIL || 'onboarding@resend.dev'

  // If API key is not set, just log and skip (won't crash the app)
  if (!apiKey || apiKey === 're_xxxxxxxxxxxxxxxxx') {
    console.log('[notify] RESEND_API_KEY not configured — skipping email.')
    console.log('[notify] Subject:', subject)
    return
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to:   TEAM_NOTIFICATION_EMAILS,
      subject,
      html: htmlBody,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('[notify] Resend API error:', error)
  } else {
    console.log('[notify] ✅ Email sent successfully.')
  }
}

// =============================================================
// Email template — wraps content in a styled HTML email
// =============================================================
function buildEmailHtml(title: string, lines: string[]): string {
  const rows = lines.map(line => `
    <tr>
      <td style="padding: 6px 0; color: #374151; font-size: 14px; line-height: 1.6;">
        ${line}
      </td>
    </tr>
  `).join('')

  return `
    <!DOCTYPE html>
    <html>
    <body style="margin:0; padding:0; background:#f3f4f6; font-family:'Segoe UI',sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6; padding:40px 20px;">
        <tr>
          <td align="center">
            <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">
              
              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,#6366F1,#8B5CF6); padding:28px 32px;">
                  <h2 style="margin:0; color:#ffffff; font-size:18px; font-weight:700;">
                    📋 ProjectFlow Notification
                  </h2>
                  <p style="margin:6px 0 0; color:rgba(255,255,255,0.8); font-size:13px;">
                    ${title}
                  </p>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding:28px 32px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    ${rows}
                  </table>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background:#f9fafb; padding:16px 32px; border-top:1px solid #e5e7eb;">
                  <p style="margin:0; color:#9ca3af; font-size:12px;">
                    This is an automated notification from ProjectFlow.
                    Log in to view and respond.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `
}

// =============================================================
// PUBLIC FUNCTIONS — called from the API route
// =============================================================

export async function notifyProjectCreated(
  projectName: string,
  owner: string,
  createdBy: string
): Promise<void> {
  await sendEmail(
    `🆕 New Project Created: ${projectName}`,
    buildEmailHtml('A new project has been created', [
      `<strong>Project:</strong> ${projectName}`,
      `<strong>Assigned To:</strong> ${owner}`,
      `<strong>Created By:</strong> ${createdBy}`,
      `<strong>Time:</strong> ${new Date().toLocaleString()}`,
    ])
  )
}

export async function notifyProjectUpdated(
  projectName: string,
  updatedBy: string,
  changesSummary: string
): Promise<void> {
  await sendEmail(
    `✏️ Project Updated: ${projectName}`,
    buildEmailHtml('A project has been updated', [
      `<strong>Project:</strong> ${projectName}`,
      `<strong>Updated By:</strong> ${updatedBy}`,
      `<strong>Changes:</strong> ${changesSummary}`,
      `<strong>Time:</strong> ${new Date().toLocaleString()}`,
    ])
  )
}

export async function notifyCommentAdded(
  projectName: string,
  commentBy: string,
  commentText: string
): Promise<void> {
  await sendEmail(
    `💬 New Comment on: ${projectName}`,
    buildEmailHtml('A new update was posted on a project', [
      `<strong>Project:</strong> ${projectName}`,
      `<strong>Posted By:</strong> ${commentBy}`,
      `<strong>Comment:</strong>`,
      `<em style="color:#6b7280;">"${commentText}"</em>`,
      `<strong>Time:</strong> ${new Date().toLocaleString()}`,
    ])
  )
}
