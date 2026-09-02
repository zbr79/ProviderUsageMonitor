import { getAccounts, getUsage, maskKey } from '@/lib/opencode'

export const dynamic = 'force-dynamic'

export async function GET() {
  const accounts = await getAccounts()
  const results = await Promise.all(
    accounts.map(async (acc) => {
      const usage = await getUsage(acc.key, acc.email)
      return {
        email: acc.email,
        keyMasked: maskKey(acc.key),
        usage,
        error: usage ? null : 'failed',
      }
    }),
  )
  return Response.json({ accounts: results })
}