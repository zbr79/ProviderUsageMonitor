import { getAccounts, getUsage, getLastChange } from '@/lib/opencode'

export const dynamic = 'force-dynamic'

export async function GET() {
  const accounts = await getAccounts()
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