/**
 * DEMO OWNERSHIP SEED. Not real assignments by a real person.
 *
 * A handful of existing content records are given to the demo Editor account
 * so the ownership workflow can be seen: the Editor opens them, edits live
 * ones as revisions, and submits. Every other record stays unassigned (as all
 * legacy records are) and is invisible to the Editor until an Admin assigns it.
 *
 * Rules (applied in `services/cms.ts` `seedItems`):
 * - Only `ownerId` is set. `createdBy` is never invented: these records were
 *   not created in the CMS by anyone.
 * - It is part of the seed, not a write, so it is deterministic and
 *   idempotent: the same on every load, and it never runs again over a record.
 * - Any stored change wins. If an Admin reassigns or unassigns one of these
 *   (that stores the record), the seed no longer applies to it.
 * - Practitioner content and access are untouched.
 *
 * Delete this list, or assign through the CMS, before launch.
 */
export const DEMO_EDITOR_ACCOUNT_ID = 'u-editor'

/** Record id and what state it demonstrates. */
export const DEMO_OWNED_CONTENT = {
  'exp-1': 'published: Editor edits become a revision',
  'exp-2': 'published: a second live record',
  'exp-5': 'in review (seeded status)',
  'exp-7': 'scheduled (seeded status): also treated as live',
  'med-2': 'published meditation: audio ready',
  'med-8': 'meditation in review (seeded status)',
} as const satisfies Record<string, string>
