import { getAccounts, getUsage, getLastChange } from '@/lib/opencode'
import { getSettings } from '@/lib/settings'

export const dynamic = 'force-dynamic'

export async function GET() {
  const [accounts, settings] = await Promise.all([getAccounts(), getSettings()])
  const results = await Promise.all(
    accounts.map(async (acc) => {
      const { usage, prev } = await getUsage(acc.key, acc.email)
      const change = getLastChange(acc.email)
      return {
        email: acc.email,
        usage,
        prev,
        enabled: !settings.disabledAccounts.includes(acc.email.toLowerCase()),
        error: usage ? null : 'failed',
        lastChangeAt: change?.at ?? null,
        lastChangeDetail: change?.detail ?? null,
      }
    }),
  )
  return Response.json({ accounts: results })
}