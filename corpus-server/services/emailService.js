import nodemailer from 'nodemailer'

let transporter = null

function getTransporter() {
  if (transporter) return transporter

  const host = process.env.SMTP_HOST || (process.env.EMAIL_USER && process.env.EMAIL_USER.includes('@gmail.com') ? 'smtp.gmail.com' : null)
  const port = Number(process.env.SMTP_PORT) || 587
  const user = process.env.SMTP_USER || process.env.EMAIL_USER
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS

  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    })
  }

  return transporter
}

export async function sendOtpEmail(email, otp, name) {
  const fromAddress = process.env.SMTP_FROM || process.env.EMAIL_FROM || '"Corpus" <no-reply@corpus.app>'
  const activeTransporter = getTransporter()

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Corpus Verification Code</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #fff8f4;
      margin: 0;
      padding: 30px 12px;
      color: #111111;
      -webkit-font-smoothing: antialiased;
    }
    .card {
      max-width: 480px;
      margin: 0 auto;
      background: #ffffff;
      border: 3px solid #111111;
      border-radius: 14px;
      padding: 32px 28px;
      box-shadow: 6px 6px 0px #111111;
    }
    .header-logo {
      margin-bottom: 24px;
    }
    .logo-text {
      font-size: 32px;
      font-weight: 900;
      color: #111111;
      letter-spacing: -1.2px;
      display: inline-block;
    }
    .logo-dot {
      color: #ff6b2b;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      background: #fff3ec;
      border: 1.5px solid #ff6b2b;
      color: #cc3d00;
      font-size: 11px;
      font-weight: 800;
      border-radius: 20px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 16px;
    }
    .title {
      font-size: 24px;
      font-weight: 900;
      margin-bottom: 10px;
      color: #111111;
      letter-spacing: -0.5px;
      line-height: 1.2;
    }
    .subtitle {
      font-size: 14px;
      color: #555555;
      margin-bottom: 28px;
      line-height: 1.6;
    }
    .otp-card {
      background: #fff8f4;
      border: 2px dashed #111111;
      border-radius: 12px;
      padding: 22px 16px;
      text-align: center;
      margin-bottom: 24px;
    }
    .otp-code {
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
      font-size: 40px;
      font-weight: 900;
      letter-spacing: 12px;
      color: #111111;
    }
    .expiry-text {
      font-size: 12px;
      font-weight: 600;
      color: #777777;
      text-align: center;
      margin-bottom: 24px;
    }
    .footer {
      border-top: 2px solid #f0e8e0;
      padding-top: 20px;
      font-size: 12px;
      color: #888888;
      line-height: 1.5;
    }
    .footer-brand {
      font-weight: 800;
      color: #111111;
      margin-top: 10px;
      font-size: 11px;
    }
  </style>
</head>
<body>
  <div class="card">

    <div class="header-logo">
      <span class="logo-text">corpus<span class="logo-dot">.</span></span>
    </div>

    <div class="badge">Verification Code</div>
    <div class="title">Verify your email address</div>
    <div class="subtitle">
      Hi <strong>${name || 'there'}</strong>,<br>
      Thank you for signing up for Corpus. Use your 6-digit code below to complete registration.
    </div>
    
    <div class="otp-card">
      <div class="otp-code">${otp}</div>
    </div>

    <div class="expiry-text">
      ⏳ This verification code will expire in 10 minutes.
    </div>

    <div class="footer">
      If you did not request this verification code, you can safely ignore this email.
      <div class="footer-brand">© 2026 Corpus Development. All rights reserved.</div>
    </div>
  </div>
</body>
</html>
`

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`[EMAIL SERVICE] Verification OTP for ${email}: ${otp}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  if (activeTransporter) {
    try {
      const info = await activeTransporter.sendMail({
        from: fromAddress,
        to: email,
        subject: `${otp} is your Corpus verification code`,
        text: `Your Corpus verification code is: ${otp}. It will expire in 10 minutes.`,
        html: htmlContent,
      })
      console.log(`[email] OTP email delivered to ${email} (Message ID: ${info.messageId})`)
      return { success: true, delivered: true }
    } catch (err) {
      console.error(`[email] Failed to send email via SMTP to ${email}:`, err.message)
      return { success: true, delivered: false, error: err.message }
    }
  }

  return { success: true, delivered: false, devMode: true }
}

export async function sendWelcomeEmail(email, name) {
  const fromAddress = process.env.SMTP_FROM || process.env.EMAIL_FROM || '"Corpus" <no-reply@corpus.app>'
  const activeTransporter = getTransporter()

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Corpus</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #fff8f4;
      margin: 0;
      padding: 30px 12px;
      color: #111111;
    }
    .card {
      max-width: 480px;
      margin: 0 auto;
      background: #ffffff;
      border: 3px solid #111111;
      border-radius: 14px;
      padding: 32px 28px;
      box-shadow: 6px 6px 0px #111111;
    }
    .header-logo {
      margin-bottom: 24px;
    }
    .logo-text {
      font-size: 32px;
      font-weight: 900;
      color: #111111;
      letter-spacing: -1.2px;
      display: inline-block;
    }
    .logo-dot {
      color: #ff6b2b;
    }
    .title {
      font-size: 24px;
      font-weight: 900;
      margin-bottom: 12px;
      color: #111111;
    }
    .subtitle {
      font-size: 14px;
      color: #555555;
      margin-bottom: 24px;
      line-height: 1.6;
    }
    .footer {
      border-top: 2px solid #f0e8e0;
      padding-top: 16px;
      font-size: 12px;
      color: #888888;
    }
    .footer-brand {
      font-weight: 800;
      color: #111111;
      margin-top: 10px;
      font-size: 11px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header-logo">
      <span class="logo-text">corpus<span class="logo-dot">.</span></span>
    </div>
    <div class="title">Welcome to Corpus!</div>
    <div class="subtitle">
      Hi <strong>${name || 'there'}</strong>,<br><br>
      Welcome to Corpus! Your account has been created successfully. Start organizing and exploring your digital knowledge base with AI.
    </div>
    <div class="footer">
      If you have any questions, reply to this email or contact support.
      <div class="footer-brand">© 2026 Corpus Development. All rights reserved.</div>
    </div>
  </div>
</body>
</html>
`

  console.log(`[EMAIL SERVICE] Sending Welcome email to ${email}`)

  if (activeTransporter) {
    try {
      const info = await activeTransporter.sendMail({
        from: fromAddress,
        to: email,
        subject: `Welcome to Corpus!`,
        text: `Hi ${name || 'there'},\n\nWelcome to Corpus! Your account has been created successfully.`,
        html: htmlContent,
      })
      console.log(`[email] Welcome email delivered to ${email} (Message ID: ${info.messageId})`)
      return { success: true, delivered: true }
    } catch (err) {
      console.error(`[email] Failed to send welcome email to ${email}:`, err.message)
      return { success: true, delivered: false, error: err.message }
    }
  }

  return { success: true, delivered: false, devMode: true }
}
