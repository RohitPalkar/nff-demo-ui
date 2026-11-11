import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { RequireLessonAccess } from '@/app/RequireLessonAccess'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { getItemById } from '@/services/content'
import { lessonIdForItem } from '@/services/learning/catalogue'
import { stages } from '@/mocks/db'
import { assignPath, withdrawAssignment, defaultAssignmentId } from '@/services/learning/assignments'
import { MEADOW_JOURNEY_ID } from '@/services/learning/catalogue'

const FUTURE = { v7_startTransition: true, v7_relativeSplatPath: true }

function session(email: string, role: string, id: string) {
  window.localStorage.setItem(
    'nff.session',
    JSON.stringify({ token: 't', user: { id, name: 'T', email, role, verified: true } }),
  )
}

function open(lessonId: string) {
  return render(
    <AuthProvider>
      <MemoryRouter future={FUTURE}>
        <RequireLessonAccess lessonId={lessonId}>
          <p>LESSON OPEN</p>
        </RequireLessonAccess>
      </MemoryRouter>
    </AuthProvider>,
  )
}

const firstOf = (stageIndex: number) => {
  const stage = stages[stageIndex]!
  const id = stage.itemIds.find((itemId) => getItemById(itemId)?.type === 'exploration')!
  return lessonIdForItem(id)
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('route-level lesson access', () => {
  it('opens a lesson in an unlocked stage for the demo practitioner', () => {
    session('practitioner@nff.demo', 'practitioner', 'u-demo')
    open(firstOf(1))
    expect(screen.getByText('LESSON OPEN')).toBeInTheDocument()
  })

  it('closes a lesson in a locked stage even when the URL is typed directly', () => {
    session('practitioner@nff.demo', 'practitioner', 'u-demo')
    open(firstOf(4))
    expect(screen.queryByText('LESSON OPEN')).not.toBeInTheDocument()
    expect(screen.getByText('This stage is not open yet')).toBeInTheDocument()
  })

  it('closes a locked module of another path by URL, in that path\'s words', () => {
    session('practitioner@nff.demo', 'practitioner', 'u-demo')
    open('lesson-med-9@rest-and-sleep')
    expect(screen.queryByText('LESSON OPEN')).not.toBeInTheDocument()
    expect(screen.getByText('This module is not open yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to Rest and sleep' })).toHaveAttribute('href', '/learn/paths/rest-and-sleep')
  })

  it('opens a lesson in an open module of another path', () => {
    session('practitioner@nff.demo', 'practitioner', 'u-demo')
    open('lesson-exp-22@attention-in-daily-life')
    expect(screen.getByText('LESSON OPEN')).toBeInTheDocument()
  })

  it('closes everything once the assignment is withdrawn', () => {
    session('practitioner@nff.demo', 'practitioner', 'u-demo')
    assignPath({
      id: defaultAssignmentId('u-demo'),
      pathId: MEADOW_JOURNEY_ID,
      target: { type: 'user', userId: 'u-demo' },
      assignedBy: 'system:migration',
    })
    withdrawAssignment(defaultAssignmentId('u-demo'))
    open(firstOf(0))
    expect(screen.queryByText('LESSON OPEN')).not.toBeInTheDocument()
    expect(screen.getByText('This has not been assigned to you')).toBeInTheDocument()
  })

  it('lets an editor preview a locked lesson, without becoming a practitioner', () => {
    session('editor@nff.demo', 'editor', 'u-editor')
    open(firstOf(4))
    expect(screen.getByText('LESSON OPEN')).toBeInTheDocument()
  })

  it('reports an unknown lesson as not found, inside the app', () => {
    session('practitioner@nff.demo', 'practitioner', 'u-demo')
    open('lesson-does-not-exist')
    expect(screen.getByText('We could not find that')).toBeInTheDocument()
  })
})
