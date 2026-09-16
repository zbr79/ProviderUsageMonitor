import { getCursorUsage } from '@/lib/cursor'
import { getSettings } from '@/lib/settings'

export const dynamic = 'force-dynamic'

export async function GET() {
  const settings = await getSettings()
  if (!settings.cursorEnabled && !settings.grokEnabled) {
    return Response.json({ usage: null, error: null })
  }
  const usage = await getCursorUsage()
  if (!usage) {
    return Response.json({ usage: null, error: 'failed' })
  }
  const filtered = !settings.grokEnabled
    ? { ...usage, grokPercentUsed: null, grokResetAt: null }
    : usage
  return Response.json({ usage: filtered, error: null })
}
