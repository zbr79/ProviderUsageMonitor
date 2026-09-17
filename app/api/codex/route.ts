import { getCodexUsage } from '@/lib/codex'

export const dynamic = 'force-dynamic'

export async function GET() {
  const usage = await getCodexUsage()
  return Response.json({ usage, error: usage ? null : 'failed' })
}