import nodemailer from 'nodemailer'
import { env } from '../../config/env.js'

const smtpConfigured = Boolean(env.smtpHost && env.smtpFrom && env.smtpUser && env.smtpPassword)
const gmailSmtp = env.smtpHost.toLowerCase() === 'smtp.gmail.com'
const transporterOptions = {
  host: env.smtpHost,
  port: env.smtpPort,
  secure: env.smtpSecure,
  connectionTimeout: 15_000,
  greetingTimeout: 10_000,
  socketTimeout: 30_000,
  auth: { user: env.smtpUser, pass: env.smtpPassword },
}
const transporter = smtpConfigured
  ? nodemailer.createTransport(transporterOptions)
  : null
const gmailFallbackTransporter = smtpConfigured && gmailSmtp && env.smtpPort === 587 && !env.smtpSecure
  ? nodemailer.createTransport({
    ...transporterOptions,
    port: 465,
    secure: true,
  })
  : null

function isConnectionFailure(error) {
  return ['ETIMEDOUT', 'ECONNECTION', 'ECONNREFUSED', 'ESOCKET'].includes(error.code)
    || /connect ETIMEDOUT|ECONNREFUSED/i.test(error.message || '')
}

async function sendMail(message) {
  if (!transporter) {
    const error = new Error('SMTP is not configured; set SMTP_HOST, SMTP_USER, SMTP_PASSWORD, and SMTP_FROM')
    error.statusCode = 503
    error.code = 'SMTP_NOT_CONFIGURED'
    throw error
  }
  try {
    await transporter.sendMail(message)
  } catch (error) {
    if (!gmailFallbackTransporter || !isConnectionFailure(error)) throw error
    await gmailFallbackTransporter.sendMail(message)
  }
}

export function isSmtpConfigured() {
  return Boolean(transporter)
}

export async function sendDeadlineReminder({ to, taskTitle, workspaceName, deadline }) {
  await sendMail({
    from: env.smtpFrom,
    to,
    subject: `NEXUS STUDY deadline reminder: ${taskTitle}`,
    text: `Reminder for "${taskTitle}" in ${workspaceName}. The deadline is ${new Date(deadline).toLocaleString()}.`,
  })
}

export async function sendEmailVerification({ to, code }) {
  if (!transporter) {
    const error = new Error('Email verification is unavailable because SMTP is not configured')
    error.statusCode = 503
    error.code = 'SMTP_NOT_CONFIGURED'
    throw error
  }
  await sendMail({
    from: env.smtpFrom,
    to,
    subject: 'Verify your NEXUS STUDY email',
    text: `Your NEXUS STUDY verification code is ${code}. It expires in 15 minutes.`,
  })
}
