import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'

const CLAUDE_JSON = path.join(os.homedir(), '.claude.json')
const CREDENTIALS = path.join(os.homedir(), '.claude', '.credentials.json')

export interface ClaudeUsage {
  email: string | null
  displayName: string | null
  signedIn: boolean
  subscribed: boolean
  subscriptionType: string | null
  billingType: string | null
  rateLimitTier: string | null
  orgUuid: string | null
}

let cache: { at: number; data: ClaudeUsage | null } | null = null

export async function getClaudeUsage(): Promise<ClaudeUsage | null> {
  if (cache && Date.now() - cache.at < 60_000) return cache.data
  try {
    let oauth: Record<string, unknown> | null = null
    try {
      const main = JSON.parse(await fs.readFile(CLAUDE_JSON, 'utf8'))
      oauth = main?.oauthAccount ?? null
    } catch {
      oauth = null
    }
    let subType: string | null = null
    let tier: string | null = null
    let signedIn = false
    try {
      const creds = JSON.parse(await fs.readFile(CREDENTIALS, 'utf8'))
      subType = creds?.claudeAiOauth?.subscriptionType ?? null
      tier = creds?.claudeAiOauth?.rateLimitTier ?? null
      signedIn = !!creds?.claudeAiOauth?.accessToken
    } catch {
      signedIn = false
    }
    const billingType = typeof oauth?.billingType === 'string' ? oauth.billingType : null
    const seatTier = oauth?.seatTier ?? null
    const subscribed = subType != null || (billingType != null && billingType !== 'none') || seatTier != null
    const data: ClaudeUsage = {
      email: typeof oauth?.emailAddress === 'string' ? oauth.emailAddress : null,
      displayName: typeof oauth?.displayName === 'string' ? oauth.displayName : null,
      signedIn: signedIn || oauth != null,
      subscribed,
      subscriptionType: subType,
      billingType,
      rateLimitTier: tier,
      orgUuid: typeof oauth?.organizationUuid === 'string' ? oauth.organizationUuid : null,
    }
    cache = { at: Date.now(), data }
    return data
  } catch {
    cache = { at: Date.now(), data: null }
    return null
  }
}