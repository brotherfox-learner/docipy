import { randomUUID } from 'node:crypto'
import { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { pool } from '@/db'
import { hashPassword, comparePassword, hashToken } from '@/utils/hash'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '@/utils/token'
import { sendVerificationEmail, sendPasswordResetEmail } from '@/services/email.service'
import { AuthenticatedRequest } from '@/middlewares/auth.middleware'
import { isAdminEmail } from '@/utils/adminEmails'
import { formatS3ClientError, uploadToS3 } from '@/services/file.service'
import axios from 'axios'

/** Next.js origin for post-OAuth redirect and emails. */
function clientPublicUrl(): string {
  return (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '')
}

/** Profile + usage counters for client (dashboard, /me, login/refresh payloads). */
async function getUserPayloadForClient(userId: string) {
  const { rows } = await pool.query<{
    id: string
    email: string
    name: string
    plan: string
    is_verified: boolean
    avatar_url: string | null
    oauth_provider: string | null
    password_hash: string | null
    ai_queries_today: string | number | null
    flashcards_generated: string | number | null
    documents_count: string | number | null
    quiz_generated: string | number | null
  }>(
    `SELECT u.id, u.email, u.name, u.plan, u.is_verified, u.avatar_url, u.oauth_provider, u.password_hash,
            COALESCE(ul.ai_queries_today, 0) AS ai_queries_today,
            COALESCE(ul.flashcards_generated, 0) AS flashcards_generated,
            COALESCE(ul.documents_count, 0) AS documents_count,
            COALESCE(ul.quiz_generated, 0) AS quiz_generated
     FROM users u
     LEFT JOIN usage_limits ul ON ul.user_id = u.id
     WHERE u.id = $1`,
    [userId]
  )
  const r = rows[0]
  if (!r) return null
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    plan: r.plan,
    is_verified: r.is_verified,
    avatar_url: r.avatar_url,
    oauth_provider: r.oauth_provider,
    has_password: Boolean(r.password_hash),
    ai_queries_today: Number(r.ai_queries_today),
    flashcards_generated: Number(r.flashcards_generated),
    documents_count: Number(r.documents_count),
    quiz_generated: Number(r.quiz_generated),
    is_admin: isAdminEmail(r.email),
  }
}

// ── Register ─────────────────────────────────────────────────
const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
})

export async function register(request: FastifyRequest, reply: FastifyReply) {
  const parsed = registerSchema.safeParse(request.body)
  if (!parsed.success) {
    return reply.status(400).send({ statusCode: 400, message: parsed.error.issues[0].message })
  }

  const { name, email, password } = parsed.data

  // Check duplicate
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email])
  if (existing.rows.length > 0) {
    return reply.status(409).send({ statusCode: 409, message: 'Email already in use' })
  }

  const password_hash = await hashPassword(password)

  const { rows } = await pool.query(
    `INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id, email, name, plan`,
    [email, name, password_hash]
  )

  const userId = rows[0].id as string

  await pool.query('INSERT INTO usage_limits (user_id) VALUES ($1)', [userId])

  const token = randomUUID()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h

  await pool.query(
    `INSERT INTO email_verifications (user_id, token, expires_at) VALUES ($1, $2, $3)`,
    [userId, token, expiresAt]
  )

  await sendVerificationEmail(email, name, token)

  return reply.status(201).send({
    data: { ...rows[0], message: 'Please check your email to verify your account' },
  })
}

// ── Login ─────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function login(request: FastifyRequest, reply: FastifyReply) {
  const parsed = loginSchema.safeParse(request.body)
  if (!parsed.success) {
    return reply.status(400).send({ statusCode: 400, message: 'Invalid input' })
  }

  const { email, password } = parsed.data

  const { rows } = await pool.query(
    `SELECT id, email, name, password_hash, plan, is_verified, is_active, avatar_url
     FROM users WHERE email = $1`,
    [email]
  )

  if (rows.length === 0) {
    return reply.status(401).send({ statusCode: 401, message: 'Invalid email or password' })
  }

  const user = rows[0]

  if (!user.is_active) {
    return reply.status(403).send({ statusCode: 403, message: 'Account has been deactivated' })
  }

  if (!user.password_hash) {
    return reply.status(400).send({ statusCode: 400, message: 'This account uses OAuth. Please sign in with Google or GitHub.' })
  }

  const isValid = await comparePassword(password, user.password_hash)
  if (!isValid) {
    return reply.status(401).send({ statusCode: 401, message: 'Invalid email or password' })
  }

  return issueTokens(user, reply)
}

// ── Helper: issue tokens ──────────────────────────────────────
/** OAuth browser redirects must not call `reply.send` JSON — only set cookie then `reply.redirect`. */
async function issueTokens(
  user: any,
  reply: FastifyReply,
  options?: { respondWithJson?: boolean }
) {
  const respondWithJson = options?.respondWithJson !== false

  const refreshToken = randomUUID()
  const refreshTokenHash = hashToken(refreshToken)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [user.id, refreshTokenHash, expiresAt]
  )

  // Lax: required for refresh cookie on top-level OAuth return from Google/GitHub (cross-site navigation).
  reply.setCookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days (seconds)
    path: '/',
  })

  if (!respondWithJson) {
    return
  }

  const accessToken = signAccessToken({
    id: user.id,
    email: user.email,
    plan: user.plan,
    is_verified: user.is_verified,
  })

  const payload = await getUserPayloadForClient(user.id)
  if (!payload) {
    return reply.status(500).send({ statusCode: 500, message: 'User not found' })
  }

  return reply.send({
    data: {
      accessToken,
      user: payload,
    },
  })
}

// ── Refresh Token ─────────────────────────────────────────────
export async function refresh(request: FastifyRequest, reply: FastifyReply) {
  const refreshToken = request.cookies.refresh_token
  if (!refreshToken) {
    return reply.status(401).send({ statusCode: 401, message: 'No refresh token' })
  }

  try {
    // Check token in DB (by hash)
    const tokenHash = hashToken(refreshToken)
    const { rows } = await pool.query(
      `SELECT rt.user_id, u.email, u.name, u.plan, u.is_verified, u.is_active, u.avatar_url
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token_hash = $1 AND rt.expires_at > NOW()`,
      [tokenHash]
    )

    if (rows.length === 0) {
      return reply.status(401).send({ statusCode: 401, message: 'Invalid or expired refresh token' })
    }

    const user = { ...rows[0], id: rows[0].user_id }

    if (!user.is_active) {
      return reply.status(403).send({ statusCode: 403, message: 'Account deactivated' })
    }

    // Rotate: delete old, issue new
    await pool.query('DELETE FROM refresh_tokens WHERE token_hash = $1', [tokenHash])

    return issueTokens(user, reply)
  } catch (err) {
    return reply.status(401).send({ statusCode: 401, message: 'Invalid refresh token' })
  }
}

// ── Logout ────────────────────────────────────────────────────
export async function logout(request: FastifyRequest, reply: FastifyReply) {
  const refreshToken = request.cookies.refresh_token
  if (refreshToken) {
    const tokenHash = hashToken(refreshToken)
    await pool.query('DELETE FROM refresh_tokens WHERE token_hash = $1', [tokenHash])
  }

  reply.clearCookie('refresh_token', { path: '/' })
  return reply.send({ data: { message: 'Logged out successfully' } })
}

// ── Verify Email ──────────────────────────────────────────────
export async function verifyEmail(request: FastifyRequest, reply: FastifyReply) {
  const { token } = request.query as { token: string }
  if (!token) {
    return reply.status(400).send({ statusCode: 400, message: 'Missing token' })
  }

  const { rows } = await pool.query(
    `SELECT * FROM email_verifications
     WHERE token = $1 AND expires_at > NOW() AND used_at IS NULL`,
    [token]
  )

  if (rows.length === 0) {
    return reply.status(400).send({ statusCode: 400, message: 'Invalid or expired token' })
  }

  const verification = rows[0]

  // Mark as used + verify user
  await pool.query(
    'UPDATE email_verifications SET used_at = NOW() WHERE id = $1',
    [verification.id]
  )
  await pool.query('UPDATE users SET is_verified = TRUE WHERE id = $1', [verification.user_id])

  return reply.send({ data: { message: 'Email verified successfully' } })
}

// ── Forgot Password ───────────────────────────────────────────
export async function forgotPassword(request: FastifyRequest, reply: FastifyReply) {
  const { email } = request.body as { email: string }

  const { rows } = await pool.query('SELECT id, name FROM users WHERE email = $1', [email])

  // Always respond with success (prevent email enumeration)
  if (rows.length === 0) {
    return reply.send({ data: { message: 'If your email exists, you will receive a reset link' } })
  }

  const user = rows[0]
  const rawToken = randomUUID()
  const tokenHash = hashToken(rawToken)
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  // Delete old tokens
  await pool.query('DELETE FROM password_resets WHERE user_id = $1', [user.id])

  await pool.query(
    `INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [user.id, tokenHash, expiresAt]
  )

  await sendPasswordResetEmail(email, user.name, rawToken)

  return reply.send({ data: { message: 'If your email exists, you will receive a reset link' } })
}

// ── Reset Password ────────────────────────────────────────────
const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(100),
})

export async function resetPassword(request: FastifyRequest, reply: FastifyReply) {
  const parsed = resetPasswordSchema.safeParse(request.body)
  if (!parsed.success) {
    return reply.status(400).send({ statusCode: 400, message: 'Invalid input' })
  }

  const { token, password } = parsed.data
  const tokenHash = hashToken(token)

  const { rows } = await pool.query(
    `SELECT * FROM password_resets
     WHERE token_hash = $1 AND expires_at > NOW() AND used_at IS NULL`,
    [tokenHash]
  )

  if (rows.length === 0) {
    return reply.status(400).send({ statusCode: 400, message: 'Invalid or expired token' })
  }

  const reset = rows[0]
  const newHash = await hashPassword(password)

  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, reset.user_id])
  await pool.query('UPDATE password_resets SET used_at = NOW() WHERE id = $1', [reset.id])

  // Revoke all refresh tokens (force re-login)
  await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [reset.user_id])

  return reply.send({ data: { message: 'Password reset successfully' } })
}

// ── Get Me ────────────────────────────────────────────────────
export async function getMe(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as AuthenticatedRequest).user
  const payload = await getUserPayloadForClient(user.id)
  if (!payload) {
    return reply.status(404).send({ statusCode: 404, message: 'User not found' })
  }
  return reply.send({ data: payload })
}

const patchMeSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    avatar_url: z.union([z.string().url().max(2048), z.literal('')]).optional(),
  })
  .refine((b) => b.name !== undefined || b.avatar_url !== undefined, {
    message: 'Provide name and/or avatar_url',
  })

export async function patchMe(request: FastifyRequest, reply: FastifyReply) {
  const authUser = (request as AuthenticatedRequest).user
  const parsed = patchMeSchema.safeParse(request.body)
  if (!parsed.success) {
    return reply.status(400).send({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid input' })
  }

  const { name, avatar_url } = parsed.data
  const sets: string[] = []
  const vals: unknown[] = []
  let n = 1
  if (name !== undefined) {
    sets.push(`name = $${n++}`)
    vals.push(name)
  }
  if (avatar_url !== undefined) {
    sets.push(`avatar_url = $${n++}`)
    vals.push(avatar_url === '' ? null : avatar_url)
  }
  vals.push(authUser.id)

  await pool.query(`UPDATE users SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${n}`, vals)

  const payload = await getUserPayloadForClient(authUser.id)
  if (!payload) {
    return reply.status(404).send({ statusCode: 404, message: 'User not found' })
  }
  return reply.send({ data: payload })
}

const AVATAR_MAX_BYTES = 2 * 1024 * 1024
const AVATAR_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const

/** Multipart field `avatar` — stores public URL in users.avatar_url (S3). Same AWS env as document uploads. */
export async function uploadAvatar(request: FastifyRequest, reply: FastifyReply) {
  const authUser = (request as AuthenticatedRequest).user
  let fileBuffer: Buffer | undefined
  let fileMimetype = ''

  for await (const part of request.parts()) {
    if (part.type === 'file' && part.fieldname === 'avatar' && !fileBuffer) {
      try {
        fileBuffer = await part.toBuffer()
      } catch (err) {
        request.log.error({ err }, 'avatar multipart toBuffer failed')
        return reply.status(400).send({ statusCode: 400, message: 'Could not read the uploaded image.' })
      }
      fileMimetype = (part.mimetype || '').toLowerCase()
    } else if (part.type === 'file') {
      await part.toBuffer().catch(() => undefined)
    }
  }

  if (!fileBuffer) {
    return reply.status(400).send({ statusCode: 400, message: 'No image uploaded (field name: avatar).' })
  }

  if (fileBuffer.length > AVATAR_MAX_BYTES) {
    return reply.status(413).send({ statusCode: 413, message: 'Image must be 2 MB or smaller.' })
  }

  if (!AVATAR_MIMES.includes(fileMimetype as (typeof AVATAR_MIMES)[number])) {
    return reply.status(400).send({
      statusCode: 400,
      message: 'Only JPEG, PNG, or WebP images are allowed.',
    })
  }

  const ext = fileMimetype === 'image/jpeg' ? 'jpg' : fileMimetype === 'image/png' ? 'png' : 'webp'
  const key = `avatars/${authUser.id}/${randomUUID()}.${ext}`

  let publicUrl: string | null
  try {
    publicUrl = await uploadToS3(key, fileBuffer, fileMimetype)
  } catch (err) {
    request.log.error({ err }, 'uploadAvatar uploadToS3 failed')
    const detail = formatS3ClientError(err)
    const hint =
      'Check IAM allows s3:PutObject on this bucket, AWS_REGION matches the bucket region, and bucket name is correct.'
    return reply.status(502).send({
      statusCode: 502,
      message: detail || `Cloud storage upload failed. ${hint}`,
    })
  }

  if (!publicUrl) {
    return reply.status(503).send({
      statusCode: 503,
      message:
        'Avatar storage is not configured. Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET, and AWS_REGION (same as document uploads). Profile photos are stored under avatars/{userId}/ in that bucket.',
    })
  }

  await pool.query('UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2', [
    publicUrl,
    authUser.id,
  ])

  const payload = await getUserPayloadForClient(authUser.id)
  if (!payload) {
    return reply.status(404).send({ statusCode: 404, message: 'User not found' })
  }
  return reply.send({ data: payload })
}

const changePasswordLoggedInSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8).max(100),
})

export async function changePasswordLoggedIn(request: FastifyRequest, reply: FastifyReply) {
  const authUser = (request as AuthenticatedRequest).user
  const parsed = changePasswordLoggedInSchema.safeParse(request.body)
  if (!parsed.success) {
    return reply.status(400).send({ statusCode: 400, message: parsed.error.issues[0]?.message ?? 'Invalid input' })
  }

  const { rows } = await pool.query<{ password_hash: string | null }>(
    'SELECT password_hash FROM users WHERE id = $1',
    [authUser.id]
  )
  const row = rows[0]
  if (!row?.password_hash) {
    return reply.status(400).send({
      statusCode: 400,
      message: 'This account uses OAuth. Password cannot be set here.',
    })
  }

  const match = await comparePassword(parsed.data.currentPassword, row.password_hash)
  if (!match) {
    return reply.status(401).send({ statusCode: 401, message: 'Current password is incorrect' })
  }

  const newHash = await hashPassword(parsed.data.newPassword)
  await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, authUser.id])

  return reply.send({ data: { message: 'Password updated successfully' } })
}

// ── Google OAuth ──────────────────────────────────────────────
export async function googleOAuthRedirect(_request: FastifyRequest, reply: FastifyReply) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${process.env.BACKEND_URL}/api/auth/oauth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
  })

  reply.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}

export async function googleOAuthCallback(request: FastifyRequest, reply: FastifyReply) {
  const { code } = request.query as { code: string }

  // Exchange code for tokens
  const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    code,
    redirect_uri: `${process.env.BACKEND_URL}/api/auth/oauth/google/callback`,
    grant_type: 'authorization_code',
  })

  // Get user info
  const userRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokenRes.data.access_token}` },
  })

  const { sub: oauthId, email, name, picture } = userRes.data

  const user = await findOrCreateOAuthUser({
    email,
    name,
    oauthProvider: 'google',
    oauthId,
    avatarUrl: picture,
  })

  await issueTokens(user, reply, { respondWithJson: false })
  return reply.redirect(`${clientPublicUrl()}/dashboard`)
}

// ── GitHub OAuth ──────────────────────────────────────────────
export async function githubOAuthRedirect(_request: FastifyRequest, reply: FastifyReply) {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID!,
    redirect_uri: `${process.env.BACKEND_URL}/api/auth/oauth/github/callback`,
    scope: 'user:email',
  })

  reply.redirect(`https://github.com/login/oauth/authorize?${params}`)
}

export async function githubOAuthCallback(request: FastifyRequest, reply: FastifyReply) {
  const { code } = request.query as { code: string }

  const tokenRes = await axios.post(
    'https://github.com/login/oauth/access_token',
    {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${process.env.BACKEND_URL}/api/auth/oauth/github/callback`,
    },
    { headers: { Accept: 'application/json' } }
  )

  const userRes = await axios.get('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${tokenRes.data.access_token}` },
  })

  const emailRes = await axios.get('https://api.github.com/user/emails', {
    headers: { Authorization: `Bearer ${tokenRes.data.access_token}` },
  })

  const primaryEmail = emailRes.data.find((e: any) => e.primary)?.email
  const { id: oauthId, name, avatar_url } = userRes.data

  const user = await findOrCreateOAuthUser({
    email: primaryEmail,
    name: name || primaryEmail,
    oauthProvider: 'github',
    oauthId: String(oauthId),
    avatarUrl: avatar_url,
  })

  await issueTokens(user, reply, { respondWithJson: false })
  return reply.redirect(`${clientPublicUrl()}/dashboard`)
}

// ── Helper: findOrCreateOAuthUser ─────────────────────────────
async function findOrCreateOAuthUser({
  email,
  name,
  oauthProvider,
  oauthId,
  avatarUrl,
}: {
  email: string
  name: string
  oauthProvider: string
  oauthId: string
  avatarUrl?: string
}) {
  // Find by oauth_id + provider
  let { rows } = await pool.query(
    `SELECT * FROM users WHERE oauth_provider = $1 AND oauth_id = $2`,
    [oauthProvider, oauthId]
  )

  if (rows.length > 0) return rows[0]

  // Find by email (might exist as email user)
  const byEmail = await pool.query('SELECT * FROM users WHERE email = $1', [email])
  if (byEmail.rows.length > 0) {
    // Link OAuth to existing account
    await pool.query(
      `UPDATE users SET oauth_provider = $1, oauth_id = $2, avatar_url = $3, is_verified = TRUE
       WHERE id = $4`,
      [oauthProvider, oauthId, avatarUrl, byEmail.rows[0].id]
    )
    return { ...byEmail.rows[0], oauth_provider: oauthProvider, oauth_id: oauthId }
  }

  const { rows: newUser } = await pool.query(
    `INSERT INTO users (email, name, oauth_provider, oauth_id, avatar_url, is_verified)
     VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING *`,
    [email, name, oauthProvider, oauthId, avatarUrl]
  )

  const created = newUser[0]
  await pool.query('INSERT INTO usage_limits (user_id) VALUES ($1)', [created.id])

  return created
}
