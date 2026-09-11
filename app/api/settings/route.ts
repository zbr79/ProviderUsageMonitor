import { getSettings, saveSettings } from '@/lib/settings'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const settings = await getSettings()
  return Response.json({ settings })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const current = await getSettings()
  const cursorEnabled =
    typeof body?.cursorEnabled === 'boolean' ? body.cursorEnabled : current.cursorEnabled
  const grokEnabled =
    typeof body?.grokEnabled === 'boolean' ? body.grokEnabled : current.grokEnabled
  const codexEnabled =
    typeof body?.codexEnabled === 'boolean' ? body.codexEnabled : current.codexEnabled
  const claudeEnabled =
    typeof body?.claudeEnabled === 'boolean' ? body.claudeEnabled : current.claudeEnabled
  const showProviderNames =
    typeof body?.showProviderNames === 'boolean'
      ? body.showProviderNames
      : current.showProviderNames
  const displayNames =
    body?.displayNames && typeof body.displayNames === 'object'
      ? body.displayNames
      : current.displayNames
  const disabledAccounts = Array.isArray(body?.disabledAccounts)
    ? body.disabledAccounts.map((e: unknown) => String(e).toLowerCase())
    : current.disabledAccounts
  await saveSettings({
    cursorEnabled,
    grokEnabled,
    codexEnabled,
    claudeEnabled,
    showProviderNames,
    displayNames,
    disabledAccounts,
  })
  return Response.json({ ok: true })
}