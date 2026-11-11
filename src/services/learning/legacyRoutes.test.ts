import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  LEARN_PATH_BASE,
  LEGACY_ROUTE_PATTERNS,
  mapLegacyRoute,
} from '@/services/learning/legacyRoutes'

describe('legacy route mapping', () => {
  it('maps every registered /journey route', () => {
    expect(mapLegacyRoute('/journey')).toBe('/learn')
    expect(mapLegacyRoute('/my-journey')).toBe('/learn/progress')
    expect(mapLegacyRoute('/journey/stages/stage-3')).toBe(
      `${LEARN_PATH_BASE}?module=module-stage-3`,
    )
    expect(mapLegacyRoute('/journey/stages/stage-2/read/exp-7')).toBe(
      `${LEARN_PATH_BASE}/lessons/lesson-exp-7`,
    )
    expect(mapLegacyRoute('/journey/stages/stage-2/listen/med-4')).toBe(
      `${LEARN_PATH_BASE}/lessons/lesson-med-4`,
    )
  })

  it('tolerates a trailing slash and leaves other routes alone', () => {
    expect(mapLegacyRoute('/journey/')).toBe('/learn')
    expect(mapLegacyRoute('/account/profile')).toBeNull()
    expect(mapLegacyRoute('/meditations')).toBeNull()
    expect(mapLegacyRoute('/')).toBeNull()
  })

  it('registers exactly the patterns the router defines', () => {
    const router = readFileSync(join(process.cwd(), 'src/app/router.tsx'), 'utf8')
    const defined = [...router.matchAll(/path: '(\/(?:journey|my-journey)[^']*)'/g)].map(
      (match) => match[1]!,
    )
    expect(defined.sort()).toEqual([...LEGACY_ROUTE_PATTERNS].sort())
  })

  it('has a mapping for every link to an old route anywhere in src', () => {
    const files: string[] = []
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name)
        if (statSync(full).isDirectory()) walk(full)
        else if (/\.(tsx?|ts)$/.test(name) && !/\.test\./.test(name)) files.push(full)
      }
    }
    walk(join(process.cwd(), 'src'))

    const found = new Set<string>()
    for (const file of files) {
      if (file.endsWith('legacyRoutes.ts') || file.endsWith('router.tsx')) continue
      // Comments describe routes; only real string literals are links.
      const text = readFileSync(file, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '')
      for (const match of text.matchAll(/['"`](\/(?:journey|my-journey)[^'"`\s]*)['"`]/g)) {
        // Turn `${expr}` placeholders into a sample segment.
        found.add(match[1]!.replace(/\$\{[^}]*\}/g, 'x'))
      }
    }

    expect(found.size).toBeGreaterThan(0)
    for (const link of found) {
      expect(mapLegacyRoute(link), `unmapped legacy link: ${link}`).not.toBeNull()
    }
  })
})
