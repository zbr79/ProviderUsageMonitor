import { getClaudeUsage } from '@/lib/claude'
import { getSettings } from '@/lib/settings'

export const dynamic = 'force-dynamic'

export async function GET() {
  const settings = await getSettings()
  if (!settings.claudeEnabled) {
    return Response.json({ usage: null, error: null })
  }
  const usage = await getClaudeUsage()
  return Response.json({ usage, error: usage ? null : 'failed' })
}