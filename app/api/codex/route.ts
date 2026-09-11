import { getCodexUsage } from '@/lib/codex'
import { getSettings } from '@/lib/settings'

export const dynamic = 'force-dynamic'

export async function GET() {
  const settings = await getSettings()
  if (!settings.codexEnabled) {
    return Response.json({ usage: null, error: null })
  }
  const usage = await getCodexUsage()
  return Response.json({ usage, error: usage ? null : 'failed' })
}