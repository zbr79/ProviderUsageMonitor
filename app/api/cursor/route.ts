import { getCursorUsage } from '@/lib/cursor'
import { getSettings } from '@/lib/settings'

export const dynamic = 'force-dynamic'

export async function GET() {
  const [usage, settings] = await Promise.all([getCursorUsage(), getSettings()])
  const filtered =
    usage && !settings.grokEnabled
      ? { ...usage, grokPercentUsed: null, grokResetAt: null }
      : usage
  return Response.json({ usage: filtered, error: usage ? null : 'failed' })
}