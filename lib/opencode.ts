import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'

export interface Account {
  email: string
  key: string
}

export interface UsageWindow {
  status: string
  percent: number
  resetsAt: string
}

export interface Usage {
  rolling: UsageWindow
  weekly: UsageWindow
  monthly: UsageWindow
}

const DATA_DIR = path.join(process.cwd(), 'data')
const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json')
const AUTH_FILE = path.join(os.homedir(), '.local', 'share', 'opencode', 'auth.json')
const USAGE_URL = 'https://opencode.ai/zen/go/v1/usage'

export async function getAccounts(): Promise<Account[]> {
  try {
    const raw = await fs.readFile(ACCOUNTS_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export async function saveAccounts(accounts: Account[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), 'utf8')
}

export function maskKey(key: string): string {
  if (key.length <= 10) return '***'
  return `${key.slice(0, 7)}...${key.slice(-4)}`
}

const usageCache = new Map<string, { at: number; data: Usage | null }>()
const CACHE_MS = 60_000
const FAILURE_CACHE_MS = 15_000

export async function getUsage(key: string, email: string): Promise<Usage | null> {
  const hit = usageCache.get(email)
  if (hit && Date.now() - hit.at < (hit.data ? CACHE_MS : FAILURE_CACHE_MS)) {
    return hit.data
  }
  try {
    const res = await fetch(USAGE_URL, {
      headers: { Authorization: `Bearer ${key}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    })
    let data: Usage | null = null
    if (res.ok) {
      const json = await res.json()
      data = (json?.usage as Usage) ?? null
    }
    usageCache.set(email, { at: Date.now(), data })
    return data
  } catch {
    usageCache.set(email, { at: Date.now(), data: null })
    return null
  }
}

export async function getActiveEmail(accounts: Account[]): Promise<string | null> {
  try {
    const parsed = JSON.parse(await fs.readFile(AUTH_FILE, 'utf8'))
    const key = parsed?.['opencode-go']?.key
    if (typeof key !== 'string') return null
    return accounts.find((a) => a.key === key)?.email ?? null
  } catch {
    return null
  }
}

export async function setActiveAccount(key: string): Promise<void> {
  const existing = JSON.parse(await fs.readFile(AUTH_FILE, 'utf8').catch(() => '{}'))
  existing['opencode-go'] = { type: 'api', key }
  try {
    await fs.copyFile(AUTH_FILE, `${AUTH_FILE}.bak`)
  } catch {
    // no backup needed on first write
  }
  await fs.writeFile(AUTH_FILE, JSON.stringify(existing, null, 2), 'utf8')
}