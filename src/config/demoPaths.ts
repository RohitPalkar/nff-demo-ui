import type { ModuleUnlock } from '@/types'

/**
 * Extra learning paths, so the app can be seen with more than one.
 *
 * >>> DEMO ENTRIES. NO SUCH PATHS HAVE BEEN AUTHORED. <<<
 * Each one only regroups existing library items under plain descriptive
 * titles; no new content, claims or outcomes are added. They are assigned to
 * every practitioner as a `system:demo` assignment (see
 * `ensureDemoAssignments`). Delete this list, or replace it with paths from
 * the CMS, before launch. Meadow Journey is not here: it is built from the
 * six stages.
 *
 * Completion is shared by item: finishing an item anywhere counts in every
 * path that uses it (see `isLessonComplete`).
 */
export interface DemoPathConfig {
  /** Short key, used in ids: `path-demo-{key}`, `module-demo-{key}-{n}`. */
  key: string
  slug: string
  title: string
  summary: string
  unlock: ModuleUnlock
  modules: Array<{ title: string; summary: string; itemIds: string[] }>
}

export const DEMO_PATHS: readonly DemoPathConfig[] = [
  {
    key: 'first-steps',
    slug: 'first-steps',
    title: 'First steps',
    summary: 'A short introduction, taken from the first stage of Meadow Journey.',
    unlock: 'open',
    modules: [
      {
        title: 'Getting oriented',
        summary: 'What Meadow is and where to begin.',
        itemIds: ['exp-1', 'exp-7', 'med-7'],
      },
      {
        title: 'Working with what comes up',
        summary: 'Two readings about difficult moments.',
        itemIds: ['exp-13', 'exp-19'],
      },
    ],
  },
  {
    key: 'rest-and-sleep',
    slug: 'rest-and-sleep',
    title: 'Rest and sleep',
    summary: 'Readings and a practice about rest, gathered from across the library.',
    unlock: 'sequential',
    modules: [
      {
        title: 'Why rest matters',
        summary: 'Two readings on rest and sleep.',
        itemIds: ['exp-14', 'exp-15'],
      },
      {
        title: 'Settling at the end of the day',
        summary: 'A reading and a practice for the evening.',
        itemIds: ['exp-16', 'med-9'],
      },
    ],
  },
  {
    key: 'attention-in-daily-life',
    slug: 'attention-in-daily-life',
    title: 'Attention in daily life',
    summary: 'Three readings about noticing, from the Connection stage.',
    unlock: 'open',
    modules: [
      {
        title: 'Noticing',
        summary: 'Short readings to return to.',
        itemIds: ['exp-22', 'exp-28', 'exp-34'],
      },
    ],
  },
]
