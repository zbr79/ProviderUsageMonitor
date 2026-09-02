import { getAccounts, getActiveEmail, setActiveAccount } from '@/lib/opencode'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const accounts = await getAccounts()
  const email = await getActiveEmail(accounts)
  return Response.json({ email })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const email = String(body?.email ?? '').trim()
  const accounts = await getAccounts()
  const account = accounts.find((a) => a.email.toLowerCase() === email.toLowerCase())
  if (!account) {
    return Response.json({ error: 'unknown account' }, { status: 404 })
  }
  await setActiveAccount(account.key)
  return Response.json({ email })
}