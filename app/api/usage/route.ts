import { getAccounts, getUsage, getLastChange } from '@/lib/opencode'
import { getSettings } from '@/lib/settings'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const all = req.nextUrl.searchParams.get('all') === '1'
  const [allAccounts, settings] = await Promise.all([getAccounts(), getSettings()])
  const accounts = all
    ? allAccounts
    : allAccounts.filter((a) => !settings.disabledAccounts.includes(a.email.toLowerCase()))
  const results = await Promise.all(
    accounts.map(async (acc) => {
      const { usage, prev } = await getUsage(acc.key, acc.email)
      const change = getLastChange(acc.email)
      return {
        email: acc.email,
        usage,
        prev,
        error: usage ? null : 'failed',
        lastChangeAt: change?.at ?? null,
        lastChangeDetail: change?.detail ?? null,
      }
    }),
  )
  return Response.json({ accounts: results })
}