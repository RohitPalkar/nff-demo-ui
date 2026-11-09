import type {
  Campaign,
  Category,
  ContentItem,
  EmailLog,
  EmailTemplate,
  Event,
  Exploration,
  Meditation,
  Progress,
  RoleDefinition,
  Stage,
  UnderstandTopic,
  User,
} from '@/types'

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const random = mulberry32(20261109)
const pick = <T,>(list: readonly T[]): T => list[Math.floor(random() * list.length)]
const int = (min: number, max: number) =>
  Math.floor(random() * (max - min + 1)) + min

const daysAgo = (days: number) =>
  new Date(Date.now() - days * 86_400_000).toISOString()

const TONES = ['brand', 'accent', 'info', 'warning', 'success', 'neutral'] as const

const CATEGORY_TONE: Record<Category, (typeof TONES)[number]> = {
  foundations: 'brand',
  understand: 'info',
  contemplate: 'accent',
  explore: 'success',
}

export const stages: Stage[] = [
  {
    id: 'stage-1',
    number: 1,
    title: 'Arriving',
    description: 'Settle in, slow down and meet the practice.',
    intro:
      'Before we change anything, we make room to notice what is already here. This first stage is about arriving — in your day, in your body and in the practice.',
    itemIds: [],
    published: true,
  },
  {
    id: 'stage-2',
    number: 2,
    title: 'Attention',
    description: 'Work gently with a wandering mind.',
    intro:
      'Attention is a skill, not a talent. Here you learn to notice when the mind has drifted and to return without judgement — again and again.',
    itemIds: [],
    published: true,
  },
  {
    id: 'stage-3',
    number: 3,
    title: 'Emotion',
    description: 'Meet difficult feelings with steadiness.',
    intro:
      'Feelings are information, not instructions. This stage offers simple ways to stay with what arises without being swept away by it.',
    itemIds: [],
    published: true,
  },
  {
    id: 'stage-4',
    number: 4,
    title: 'Connection',
    description: 'Relate to yourself and others with kindness.',
    intro:
      'We are not practising alone. These explorations and meditations turn attention towards relationship, care and the quiet strength of kindness.',
    itemIds: [],
    published: true,
  },
  {
    id: 'stage-5',
    number: 5,
    title: 'Meaning',
    description: 'Live with intention and clarity.',
    intro:
      'When the mind settles, values come into focus. This stage asks what matters, what can wait, and how to move through the day on purpose.',
    itemIds: [],
    published: true,
  },
  {
    id: 'stage-6',
    number: 6,
    title: 'Integration',
    description: 'Carry the practice into ordinary life.',
    intro:
      'The practice is not what happens on the cushion. This final stage is about weaving what you have learned into work, rest and relationships.',
    itemIds: [],
    published: true,
  },
]

const EXPLORATION_TITLES: Record<Category, string[]> = {
  foundations: [
    'What is NeuroFelicitology?',
    'The three pillars of practice',
    'How the journey unfolds',
    'A gentle introduction to attention',
    'Why small steps matter',
    'The science of lasting calm',
    'Beginning where you are',
    'Making time for practice',
    'What progress really looks like',
    'Staying with it on busy days',
  ],
  understand: [
    'How the mind meets the moment',
    'The wandering mind, kindly explained',
    'Working with difficult emotions',
    'Why rest is part of the work',
    'Sleep and the restful mind',
    'Stress, the body and the breath',
    'The stories we tell ourselves',
    'Attention, distraction and choice',
    'What loneliness is asking for',
    'The quiet mechanics of habit',
  ],
  contemplate: [
    'A pause before reacting',
    'The space between thoughts',
    'Noticing without fixing',
    'Questions worth sitting with',
    'The value of an unfinished day',
    'Curiosity as a daily practice',
    'When nothing seems to change',
    'The art of returning',
    'Sitting with uncertainty',
    'A slower kind of progress',
  ],
  explore: [
    'Walking as practice',
    'Listening as meditation',
    'Eating with attention',
    'The practice of noticing beauty',
    'Movement and the settled mind',
    'Time outdoors, time inward',
    'Conversation with attention',
    'Rest without guilt',
    'Small rituals that hold a day',
    'Practice in the middle of things',
  ],
}

const MEDITATION_TITLES = [
  'Morning grounding',
  'Body scan for rest',
  'Breath and steady attention',
  'A short pause at midday',
  'Loving-kindness for a difficult day',
  'Evening wind-down',
  'Noticing what is here',
  'Widening attention',
  'Meeting worry with space',
  'Gratitude at the end of the day',
  'Returning after distraction',
  'A practice for restless nights',
  'Softening the shoulders',
  'Listening to the body',
  'Kindness towards yourself',
  'Staying with the breath',
  'A pause between tasks',
  'Grounding before a hard conversation',
  'Resting in awareness',
  'A gentle reset',
]

const UNDERSTAND_TOPICS: UnderstandTopic[] = ['mind', 'wellbeing']

const SLUGS = new Map<string, number>()

function slugify(title: string) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  const count = SLUGS.get(base) ?? 0
  SLUGS.set(base, count + 1)
  return count === 0 ? base : `${base}-${count + 1}`
}

const PARAGRAPHS = [
  'There is nothing to fix in this moment. The invitation is simply to notice what is already happening — the breath moving, the weight of the body, the sound of the room.',
  'Attention is not a muscle to force. It is more like a window that can be opened a little wider, gently, and then left open.',
  'When the mind wanders, that is not a failure. The wandering is the practice: each return is a small act of care.',
  'It can help to begin with something ordinary. A cup of tea, a walk to the door, the first minute after waking. The everyday is where the practice lives.',
  'Progress here is rarely dramatic. It looks more like a slightly longer pause, a kinder word, a night of sleep that arrives a little sooner.',
  'You do not need to feel calm to begin. You only need to be willing to sit with things as they are, for a moment, without turning away.',
]

const EXCERPTS = [
  'A calm introduction to the ideas behind the practice, with a simple way to begin today.',
  'A short, practical reflection on attention, rest and the small choices that shape a day.',
  'What the research suggests, and what it leaves open — explained without overclaiming.',
  'A gentle exploration of a familiar experience, with space to notice what is true for you.',
]

function buildExplorations(): Exploration[] {
  const categories: Category[] = [
    'foundations',
    'understand',
    'contemplate',
    'explore',
  ]
  const items: Exploration[] = []
  let titleIndex = 0
  for (const category of categories) {
    const titles = EXPLORATION_TITLES[category]
    for (const title of titles) {
      const stage = stages[titleIndex % stages.length]!
      const id = `exp-${titleIndex + 1}`
      items.push({
        id,
        slug: slugify(title),
        type: 'exploration',
        title,
        excerpt: EXCERPTS[titleIndex % EXCERPTS.length]!,
        category,
        understandTopic:
          category === 'understand'
            ? UNDERSTAND_TOPICS[titleIndex % UNDERSTAND_TOPICS.length]
            : undefined,
        stageId: stage.id,
        artwork: {
          tone: CATEGORY_TONE[category],
          label: title.slice(0, 2).toUpperCase(),
        },
        published: true,
        featured: titleIndex % 7 === 0,
        updatedAt: daysAgo(int(1, 120)),
        readingTimeMin: int(4, 14),
        body: [
          PARAGRAPHS[titleIndex % PARAGRAPHS.length]!,
          PARAGRAPHS[(titleIndex + 2) % PARAGRAPHS.length]!,
          PARAGRAPHS[(titleIndex + 4) % PARAGRAPHS.length]!,
        ],
      })
      stage.itemIds.push(id)
      titleIndex += 1
    }
  }
  return items
}

function buildMeditations(): Meditation[] {
  const items: Meditation[] = []
  const categories: Category[] = [
    'foundations',
    'understand',
    'contemplate',
    'explore',
  ]
  for (let index = 0; index < 60; index += 1) {
    const baseTitle = MEDITATION_TITLES[index % MEDITATION_TITLES.length]!
    const title = index < MEDITATION_TITLES.length ? baseTitle : `${baseTitle} ${Math.floor(index / MEDITATION_TITLES.length) + 1}`
    const category = categories[index % categories.length]!
    const stage = stages[index % stages.length]!
    const id = `med-${index + 1}`
    items.push({
      id,
      slug: slugify(title),
      type: 'meditation',
      title,
      excerpt: EXCERPTS[(index + 1) % EXCERPTS.length]!,
      category,
      understandTopic:
        category === 'understand'
          ? UNDERSTAND_TOPICS[Math.floor(index / 4) % UNDERSTAND_TOPICS.length]
          : undefined,
      stageId: stage.id,
      artwork: {
        tone: CATEGORY_TONE[category],
        label: title.slice(0, 2).toUpperCase(),
      },
      published: true,
      featured: index % 11 === 0,
      updatedAt: daysAgo(int(1, 120)),
      durationSec: int(5, 30) * 60,
      preview: index % 4 === 0,
      audioUrl: `/audio/mock-${(index % 6) + 1}.mp3`,
      transcode: index % 19 === 0 ? 'transcoding' : 'ready',
    })
    stage.itemIds.push(id)
  }
  return items
}

export const explorations = buildExplorations()
export const meditations = buildMeditations()
export const content: ContentItem[] = [...explorations, ...meditations]

export const contentById = new Map(content.map((item) => [item.id, item]))

const FIRST_NAMES = [
  'Amara', 'Ben', 'Chloe', 'Dev', 'Elena', 'Finn', 'Grace', 'Hana', 'Isaac',
  'Jade', 'Kai', 'Lena', 'Milo', 'Nadia', 'Owen', 'Priya', 'Quinn', 'Rosa',
  'Sam', 'Tara', 'Uma', 'Vik', 'Wren', 'Yusuf', 'Zoe',
]
const LAST_NAMES = [
  'Adeyemi', 'Bennett', 'Chen', 'Doyle', 'Evans', 'Fischer', 'Gupta', 'Hughes',
  'Ibrahim', 'Jensen', 'Kaur', 'Lopez', 'Morgan', 'Novak', 'Okafor', 'Patel',
  'Quinn', 'Rahman', 'Silva', 'Turner', 'Ueda', 'Vargas', 'Walsh', 'Young', 'Zhang',
]

function buildUsers(): User[] {
  const users: User[] = []
  for (let index = 0; index < 25; index += 1) {
    const first = FIRST_NAMES[index]!
    const last = LAST_NAMES[(index * 7) % LAST_NAMES.length]!
    const name = `${first} ${last}`
    const status =
      index === 3 ? 'pending_deletion' : index === 7 ? 'unverified' : 'active'
    users.push({
      id: `u-${index + 1}`,
      name,
      email: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
      role: 'practitioner',
      status,
      verified: status !== 'unverified',
      currentStageId: stages[index % stages.length]!.id,
      joinedAt: daysAgo(int(10, 400)),
      lastActiveAt: daysAgo(int(0, 30)),
      engagementScore: int(20, 98),
      minutesListened: int(30, 3400),
    })
  }
  users.push(
    {
      id: 'u-demo',
      name: 'Maya Patel',
      email: 'practitioner@nff.demo',
      role: 'practitioner',
      status: 'active',
      verified: true,
      currentStageId: 'stage-2',
      joinedAt: daysAgo(96),
      lastActiveAt: daysAgo(0),
      engagementScore: 82,
      minutesListened: 940,
    },
    {
      id: 'u-editor',
      name: 'Rowan Ellis',
      email: 'editor@nff.demo',
      role: 'editor',
      status: 'active',
      verified: true,
      currentStageId: 'stage-6',
      joinedAt: daysAgo(300),
      lastActiveAt: daysAgo(0),
      engagementScore: 91,
      minutesListened: 2100,
    },
    {
      id: 'u-campaign',
      name: 'Sofia Marchetti',
      email: 'campaign@nff.demo',
      role: 'campaign',
      status: 'active',
      verified: true,
      currentStageId: 'stage-4',
      joinedAt: daysAgo(220),
      lastActiveAt: daysAgo(1),
      engagementScore: 74,
      minutesListened: 640,
    },
    {
      id: 'u-admin',
      name: 'Adeola Bankole',
      email: 'admin@nff.demo',
      role: 'admin',
      status: 'active',
      verified: true,
      currentStageId: 'stage-5',
      joinedAt: daysAgo(500),
      lastActiveAt: daysAgo(0),
      engagementScore: 88,
      minutesListened: 1500,
    },
  )
  return users
}

export const users = buildUsers()
export const userById = new Map(users.map((user) => [user.id, user]))
export const userByEmail = new Map(
  users.map((user) => [user.email.toLowerCase(), user]),
)

const stageOneItems = stages[0]!.itemIds
const stageTwoItems = stages[1]!.itemIds

export const demoProgress: Progress = {
  userId: 'u-demo',
  completedItemIds: [...stageOneItems, ...stageTwoItems.slice(0, 3)],
  inProgressItemId: stageTwoItems[3],
  positionsSec: {
    [stageTwoItems[0] ?? 'med-2']: 312,
    [stageTwoItems[3] ?? 'med-8']: 145,
  },
  updatedAt: daysAgo(0),
}

export const progressByUser: Progress[] = users.map((user) => {
  if (user.id === demoProgress.userId) return demoProgress
  const completed = content
    .filter((item) => item.stageId === user.currentStageId)
    .slice(0, int(0, 5))
    .map((item) => item.id)
  return {
    userId: user.id,
    completedItemIds: completed,
    positionsSec: {},
    updatedAt: daysAgo(int(0, 14)),
  }
})

export const events: Event[] = Array.from({ length: 160 }, (_, index) => {
  const user = users[index % users.length]!
  const item = content[index % content.length]!
  const type: Event['type'] =
    index % 5 === 0
      ? 'login'
      : index % 5 === 1
        ? 'play'
        : index % 5 === 2
          ? 'complete'
          : index % 5 === 3
            ? 'email_open'
            : 'play'
  return {
    id: `evt-${index + 1}`,
    userId: user.id,
    type,
    contentId: type === 'play' || type === 'complete' ? item.id : undefined,
    at: daysAgo(int(0, 60)),
  }
})

export const campaigns: Campaign[] = [
  {
    id: 'cmp-1',
    name: 'Daily practice',
    state: 'running',
    schedule: 'Nightly · user local hour',
    audience: 'Active practitioners',
    lastRunAt: daysAgo(0),
    sent: 4820,
    delivered: 4712,
    bounced: 62,
    complained: 9,
    failed: 37,
  },
  {
    id: 'cmp-2',
    name: 'Weekly reflection',
    state: 'paused',
    schedule: 'Sundays · user local hour',
    audience: 'Active practitioners',
    lastRunAt: daysAgo(9),
    sent: 3910,
    delivered: 3844,
    bounced: 41,
    complained: 6,
    failed: 19,
  },
  {
    id: 'cmp-3',
    name: 'Foundations welcome',
    state: 'scheduled',
    schedule: 'On sign-up',
    audience: 'New practitioners',
    sent: 0,
    delivered: 0,
    bounced: 0,
    complained: 0,
    failed: 0,
  },
  {
    id: 'cmp-4',
    name: 'Re-engagement',
    state: 'draft',
    schedule: 'Not scheduled',
    audience: 'Inactive 30+ days',
    sent: 0,
    delivered: 0,
    bounced: 0,
    complained: 0,
    failed: 0,
  },
]

export const emailTemplates: EmailTemplate[] = [
  {
    id: 'tpl-1',
    name: 'Daily practice email',
    variantCount: 6,
    stagesCovered: 6,
    status: 'active',
    updatedAt: daysAgo(2),
  },
  {
    id: 'tpl-2',
    name: 'Foundations welcome',
    variantCount: 1,
    stagesCovered: 1,
    status: 'active',
    updatedAt: daysAgo(18),
  },
  {
    id: 'tpl-3',
    name: 'Weekly reflection',
    variantCount: 3,
    stagesCovered: 3,
    status: 'draft',
    updatedAt: daysAgo(7),
  },
  {
    id: 'tpl-4',
    name: 'Re-engagement',
    variantCount: 2,
    stagesCovered: 2,
    status: 'draft',
    updatedAt: daysAgo(26),
  },
  {
    id: 'tpl-5',
    name: 'Stage completion',
    variantCount: 6,
    stagesCovered: 6,
    status: 'archived',
    updatedAt: daysAgo(88),
  },
]

export const emailLogs: EmailLog[] = Array.from({ length: 90 }, (_, index) => {
  const statuses: EmailLog['status'][] = [
    'delivered', 'delivered', 'delivered', 'delivered', 'sent', 'bounced',
    'complained', 'failed',
  ]
  return {
    id: `log-${index + 1}`,
    userId: users[index % users.length]!.id,
    campaignId: campaigns[index % campaigns.length]!.id,
    status: pick(statuses),
    at: daysAgo(int(0, 30)),
  }
})

export const roles: RoleDefinition[] = [
  {
    id: 'visitor',
    label: 'Visitor',
    description: 'Browses the public web and plays free previews.',
    capabilities: ['View public pages', 'Preview playback', 'Manage consent'],
  },
  {
    id: 'practitioner',
    label: 'Practitioner',
    description: 'Full curriculum and personal progress.',
    capabilities: ['Full content', 'Progress', 'Email preferences', 'Export data'],
  },
  {
    id: 'editor',
    label: 'Editor',
    description: 'Creates and arranges content.',
    capabilities: ['Create/edit content', 'Upload media', 'Submit for review'],
  },
  {
    id: 'campaign',
    label: 'Campaign manager',
    description: 'Runs the daily email programme.',
    capabilities: ['Campaigns', 'Templates', 'Delivery reports'],
  },
  {
    id: 'admin',
    label: 'Super admin',
    description: 'Full oversight and administration.',
    capabilities: ['Everything', 'Users', 'Analytics', 'Roles', 'Publish'],
  },
]

export const scoreWeightsSeed = {
  loginRecency: 20,
  minutesListened: 25,
  completion: 25,
  progression: 20,
  email: 10,
}

export const demoCode = '123456'

export function addMockUser(user: User) {
  users.push(user)
  userById.set(user.id, user)
  userByEmail.set(user.email.toLowerCase(), user)
  return user
}
