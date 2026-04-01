import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM || 'noreply@yourdomain.com'
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000'

export async function sendVerificationEmail(email: string, name: string, token: string) {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Verify your Docipy account',
    html: `
      <h2>Hello ${name}!</h2>
      <p>Click the link below to verify your email:</p>
      <a href="${CLIENT_URL}/verify-email?token=${token}" style="background:#6366f1;color:white;padding:12px 24px;border-radius:6px;text-decoration:none">
        Verify Email
      </a>
      <p>This link expires in 24 hours.</p>
    `,
  })
}

export async function sendPasswordResetEmail(email: string, name: string, token: string) {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Reset your Docipy password',
    html: `
      <h2>Hello ${name}!</h2>
      <p>Click the link below to reset your password:</p>
      <a href="${CLIENT_URL}/reset-password?token=${token}" style="background:#6366f1;color:white;padding:12px 24px;border-radius:6px;text-decoration:none">
        Reset Password
      </a>
      <p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
    `,
  })
}
