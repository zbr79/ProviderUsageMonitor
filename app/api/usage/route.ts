import { getAccounts, getUsage, getLastChange } from '@/lib/opencode'
import { getSettings } from '@/lib/settings'

export const dynamic = 'force-dynamic'

export async function GET() {
  const [accounts, settings] = await Promise.all([getAccounts(), getSettings()])
  const results = await Promise.all(
    accounts.map(async (acc) => {
      const enabled = !settings.disabledAccounts.includes(acc.email.toLowerCase())
      if (!enabled) {
        return {
          email: acc.email,
          usage: null,
          prev: null,
          enabled: false,
          error: null,
          lastChangeAt: null,
          lastChangeDetail: null,
        }
      }
      const { usage, prev } = await getUsage(acc.key, acc.email)
      const change = getLastChange(acc.email)
      return {
        email: acc.email,
        usage,
        prev,
        enabled: true,
        error: usage ? null : 'failed',
        lastChangeAt: change?.at ?? null,
        lastChangeDetail: change?.detail ?? null,
      }
    }),
  )
  return Response.json({ accounts: results })
}