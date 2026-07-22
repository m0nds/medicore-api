import { Resend } from "resend"
import { env } from "../../config/env"

const resend = new Resend(env.RESEND_API_KEY)

export const sendVerificationEmail = async (
  email: string,
  name: string,
  token: string
): Promise<void> => {
  const verificationUrl = `${env.BASE_URL}/api/auth/verify?token=${token}`

  await resend.emails.send({
    from: "onboarding@resend.dev",
    to: email,
    subject: "Verify your email — MediCore",
    html: `
      <h2>Welcome to MediCore, ${name}!</h2>
      <p>Please verify your email by clicking the link below:</p>
      <a href="${verificationUrl}">Verify Email</a>
      <p>This link expires in 24 hours.</p>
      <p>If you didn't create an account, ignore this email.</p>
    `
  })
}

export const sendResetEmail = async (
  email: string,
  name: string,
  token: string
): Promise<void> => {
  const resetUrl = `${env.BASE_URL}/reset-password?token=${token}`

  await resend.emails.send({
    from: "onboarding@resend.dev",
    to: email,
    subject: "Reset your password — MediCore",
    html: `
      <h2>Hi ${name},</h2>
      <p>You requested a password reset. Click the link below:</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request this, ignore this email.</p>
    `
  })
}

export const sendAppointmentReminderEmail = async (
  email: string,
  name: string,
  doctorName: string,
  scheduledAt: string,
  reason: string
): Promise<void> => {
  await resend.emails.send({
    from: "noreply@monds.xyz",
    to: email,
    subject: "Appointment Reminder — MediCore",
    html: `
      <h2>Hi ${name},</h2>
      <p>This is a reminder that you have an appointment tomorrow.</p>
      <p><strong>Doctor:</strong> ${doctorName}</p>
      <p><strong>Time:</strong> ${new Date(scheduledAt).toLocaleString()}</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p>Please arrive 10 minutes early.</p>
    `
  })
}