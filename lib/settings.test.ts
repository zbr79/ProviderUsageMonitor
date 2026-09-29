import { mkdtemp, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getSettings } from '@/lib/settings'

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'usage-settings-'))
  process.env.USAGE_DATA_DIR = dir
})

afterEach(async () => {
  delete process.env.USAGE_DATA_DIR
  await rm(dir, { recursive: true, force: true })
})

describe('getSettings', () => {
  it('returns defaults when the settings file is missing', async () => {
    await expect(getSettings()).resolves.toEqual({
      cursorEnabled: true,
      grokEnabled: true,
      codexEnabled: true,
      claudeEnabled: true,
      showProviderNames: false,
      themeMode: 'auto',
      displayNames: {},
      disabledAccounts: [],
    })
  })

  it('falls back to auto when themeMode is not a known value', async () => {
    await writeFile(
      path.join(dir, 'settings.json'),
      JSON.stringify({ themeMode: 'sepia', cursorEnabled: false }),
    )
    const settings = await getSettings()
    expect(settings.themeMode).toBe('auto')
    expect(settings.cursorEnabled).toBe(false)
  })

  it('lowercases disabled account emails', async () => {
    await writeFile(
      path.join(dir, 'settings.json'),
      JSON.stringify({ disabledAccounts: ['Ada@Example.com', 'bob@example.com'] }),
    )
    const settings = await getSettings()
    expect(settings.disabledAccounts).toEqual(['ada@example.com', 'bob@example.com'])
  })
})
