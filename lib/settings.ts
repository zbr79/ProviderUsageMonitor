import { promises as fs } from 'fs'
import path from 'path'

export interface Settings {
  cursorEnabled: boolean
  displayNames: Record<string, string>
}

const FILE = path.join(process.cwd(), 'data', 'settings.json')

export async function getSettings(): Promise<Settings> {
  try {
    const parsed = JSON.parse(await fs.readFile(FILE, 'utf8'))
    return {
      cursorEnabled: parsed?.cursorEnabled !== false,
      displayNames:
        parsed?.displayNames && typeof parsed.displayNames === 'object'
          ? parsed.displayNames
          : {},
    }
  } catch {
    return { cursorEnabled: true, displayNames: {} }
  }
}

export async function saveSettings(s: Settings): Promise<void> {
  await fs.mkdir(path.dirname(FILE), { recursive: true })
  await fs.writeFile(FILE, JSON.stringify(s, null, 2), 'utf8')
}