import { promises as fs } from 'fs'
import path from 'path'

export interface Settings {
  cursorEnabled: boolean
  grokEnabled: boolean
  codexEnabled: boolean
  claudeEnabled: boolean
  showProviderNames: boolean
  displayNames: Record<string, string>
  disabledAccounts: string[]
}

const FILE = path.join(process.cwd(), 'data', 'settings.json')

export async function getSettings(): Promise<Settings> {
  try {
    const parsed = JSON.parse(await fs.readFile(FILE, 'utf8'))
    return {
      cursorEnabled: parsed?.cursorEnabled !== false,
      grokEnabled: parsed?.grokEnabled !== false,
      codexEnabled: parsed?.codexEnabled !== false,
      claudeEnabled: parsed?.claudeEnabled !== false,
      showProviderNames: parsed?.showProviderNames === true,
      displayNames:
        parsed?.displayNames && typeof parsed.displayNames === 'object'
          ? parsed.displayNames
          : {},
      disabledAccounts: Array.isArray(parsed?.disabledAccounts)
        ? parsed.disabledAccounts.map((e: unknown) => String(e).toLowerCase())
        : [],
    }
  } catch {
    return {
      cursorEnabled: true,
      grokEnabled: true,
      codexEnabled: true,
      claudeEnabled: true,
      showProviderNames: false,
      displayNames: {},
      disabledAccounts: [],
    }
  }
}

export async function saveSettings(s: Settings): Promise<void> {
  await fs.mkdir(path.dirname(FILE), { recursive: true })
  await fs.writeFile(FILE, JSON.stringify(s, null, 2), 'utf8')
}