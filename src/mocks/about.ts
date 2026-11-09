import type { AboutPage, AboutSlug } from '@/types'

export const ABOUT_TOPICS: Array<{ slug: AboutSlug; label: string }> = [
  { slug: 'who-we-are', label: 'Who we are' },
  { slug: 'what-we-do', label: 'What we do' },
  { slug: 'how-we-do-it', label: 'How we do it' },
]

export const aboutPages: AboutPage[] = [
  {
    slug: 'who-we-are',
    title: 'Who we are',
    eyebrow: 'About',
    lead: 'NeuroFelicitology is a small, independent practice. We write and record gentle, evidence-aware guidance for anyone who wants to understand their mind a little better.',
    updatedAt: '2026-10-14',
    image: {
      src: '/images/about/who-we-are.svg',
      alt: 'An abstract illustration of overlapping warm circles',
      caption: 'Our work begins with attention: to the mind, to the body, and to the ordinary moments between.',
    },
    sections: [
      {
        heading: 'A practice, not a promise',
        paragraphs: [
          'We are not here to sell certainty. The mind is not a machine with a single reset button, and wellbeing is not a destination you arrive at once and keep. What we offer instead is a practice: a set of small, repeatable ways of paying attention that tend to help people live with more steadiness and care.',
          'That distinction matters to us. Promises create pressure. Practice creates room. We would rather you leave a session curious about your own experience than convinced by ours.',
          'Everything on this site is designed to be used. Read an exploration on a difficult afternoon. Listen to a five-minute track before a meeting. Return to the same idea a week later and notice what has changed.',
        ],
      },
      {
        heading: 'Where the name comes from',
        paragraphs: [
          'The word is a deliberate combination rather than a clinical term. “Neuro” points to the mind and the nervous system. “Felicitology” points to the study of wellbeing and human flourishing. Together they describe our subject, not a claim to a new science.',
          'We use the name with humility. Much of what helps us is old, ordinary and already available: rest, relationship, attention, movement, sleep, kindness. Our work is to make those things easier to understand and easier to begin.',
        ],
      },
      {
        heading: 'The people behind it',
        paragraphs: [
          'The practice is made by writers, teachers, clinicians and people with lived experience of their own difficult seasons. We work with a small editorial group so that every piece is read carefully, tested for clarity and checked against what the evidence can and cannot support.',
          'We are not a celebrity-led movement and we do not have a single guru. We think that is a strength. A practice that depends on one voice is fragile; a practice that belongs to its community can keep growing.',
        ],
      },
    ],
  },
  {
    slug: 'what-we-do',
    title: 'What we do',
    eyebrow: 'About',
    lead: 'We turn careful ideas about the mind into explorations you can read, meditations you can listen to, and a six-stage journey you can follow at your own pace.',
    updatedAt: '2026-10-09',
    image: {
      src: '/images/about/what-we-do.svg',
      alt: 'An abstract illustration of a calm grid of dots fading across a blue field',
      caption: 'Small, repeatable practices, arranged so that one leads naturally to the next.',
    },
    sections: [
      {
        heading: 'A guided curriculum',
        paragraphs: [
          'The journey is organised into six stages, from Foundations through to Meaning. Each stage offers a short sequence of reading and listening, with enough context to make sense of the practice and enough space to make it your own.',
          'You do not have to complete a stage before you belong here. Progress is simply a way of keeping your place, not a test of how well you are doing. You can move faster, slow down, or return to something you skipped.',
        ],
      },
      {
        heading: 'Reading and listening',
        paragraphs: [
          'Our explorations are short essays: practical, plain-spoken and honest about uncertainty. Our meditations range from a five-minute pause to a longer sit, with free previews so you can find a voice and a pace that suit you before you sign up.',
          'The two forms are meant to work together. An exploration gives you language for what you are noticing; a meditation gives you a way to stay with it. Neither needs to be finished for the other to be useful.',
        ],
      },
      {
        heading: 'Free to begin',
        paragraphs: [
          'Anyone can browse the library and listen to selected previews without creating an account. A free account adds the full meditation library, saved progress and a short daily email that you can pause or stop at any time.',
          'We do not ask for a card to begin, and we do not make cancellation difficult. If the practice is not for you, you should be able to leave without a conversation.',
        ],
      },
    ],
  },
  {
    slug: 'how-we-do-it',
    title: 'How we do it',
    eyebrow: 'About',
    lead: 'Six stages, one practice at a time. We build the journey around attention, rest and relationship, and we are careful about what we claim.',
    updatedAt: '2026-09-28',
    image: {
      src: '/images/about/how-we-do-it.svg',
      alt: 'An abstract illustration of a winding path through soft green and sand shapes',
      caption: 'A path rather than a ladder: the stages are a route, not a ranking.',
    },
    sections: [
      {
        heading: 'Six stages, one practice at a time',
        paragraphs: [
          'Each stage pairs a small number of ideas with practices that make those ideas tangible. Foundations introduces attention and the body. Understand looks at the mind and at wellbeing without reducing either to a formula. Contemplate offers questions to sit with. Explore takes practice into walking, listening, resting and noticing. Later stages turn towards relationship, care and meaning.',
          'We release content gradually so that the library stays useful rather than overwhelming. The aim is not to consume everything; it is to find the one thing you will actually return to this week.',
        ],
      },
      {
        heading: 'Evidence, held lightly',
        paragraphs: [
          'We read widely across psychology, neuroscience, contemplative traditions and clinical practice, and we distinguish between what is well established, what is promising and what remains uncertain. We avoid turning a single study into a promise.',
          'We also listen to feedback from practitioners. If a phrase lands badly, if an instruction assumes too much, or if a practice is not accessible to a particular body or situation, we revise it. The library is a living document.',
        ],
      },
      {
        heading: 'Care, safety and limits',
        paragraphs: [
          'Meditation is not a substitute for therapy, medical care or crisis support. Some practices can bring difficult material to the surface, and that is not a personal failure. If you are in crisis, please contact a local emergency service or a trusted professional rather than relying on this site.',
          'We write with trauma-aware language where we can, offer alternatives to sitting still, and avoid claims that a practice will cure anything. If something does not feel safe, stopping is the right choice.',
        ],
      },
      {
        heading: 'What we leave out',
        paragraphs: [
          'We leave out urgency, perfectionism and the idea that you are behind. We leave out false certainty, miracle language and the suggestion that a difficult mind is a problem to be fixed before you are allowed to rest.',
          'What remains is modest and, we hope, durable: a few good ideas, a few honest practices, and permission to begin where you are.',
        ],
      },
    ],
  },
]
