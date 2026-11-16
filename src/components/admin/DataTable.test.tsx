import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Inbox } from 'lucide-react'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DataTable, type DataTableColumn } from './DataTable'

// Radix Select uses pointer capture and scrolling that jsdom does not implement.
beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.releasePointerCapture ??= () => {}
  Element.prototype.scrollIntoView ??= () => {}
})

interface Row {
  id: string
  name: string
  kind: 'fruit' | 'veg'
  score: number
  live: boolean
}

const ROWS: Row[] = [
  { id: '1', name: 'Apple', kind: 'fruit', score: 30, live: true },
  { id: '2', name: 'Carrot', kind: 'veg', score: 10, live: false },
  { id: '3', name: 'Banana', kind: 'fruit', score: 20, live: true },
  { id: '4', name: 'Leek', kind: 'veg', score: 40, live: true },
]

const columns: Array<DataTableColumn<Row>> = [
  { id: 'name', header: 'Name', primary: true, sortValue: (row) => row.name, cell: (row) => row.name },
  { id: 'score', header: 'Score', sortValue: (row) => row.score, cell: (row) => String(row.score) },
  { id: 'actions', header: 'Actions', hideHeader: true, cell: (row) => <button type="button">Open {row.name}</button> },
]

function renderTable(rows: Row[] = ROWS, pageSize = 10) {
  return render(
    <DataTable
      caption="Produce"
      noun="item"
      rows={rows}
      columns={columns}
      getRowId={(row) => row.id}
      pageSize={pageSize}
      search={{ placeholder: 'Search', text: (row) => [row.name] }}
      filters={[
        {
          id: 'kind',
          label: 'Kind',
          options: [
            { value: 'fruit', label: 'Fruit' },
            { value: 'veg', label: 'Veg' },
          ],
          predicate: (row, value) => row.kind === value,
        },
      ]}
      views={[
        { id: 'all', label: 'All', predicate: () => true },
        { id: 'live', label: 'Live', predicate: (row) => row.live },
      ]}
      empty={{ icon: Inbox, title: 'Nothing yet', description: 'Add some produce.' }}
    />,
  )
}

const names = () =>
  within(screen.getByRole('table', { name: 'Produce' }))
    .getAllByRole('row')
    .slice(1)
    .map((row) => row.querySelector('td')!.textContent)

beforeEach(() => cleanup())

describe('DataTable', () => {
  it('searches, and says how many rows match', async () => {
    const user = userEvent.setup()
    renderTable()
    expect(names()).toHaveLength(4)
    await user.type(screen.getByRole('searchbox', { name: 'Search produce' }), 'an')
    expect(names()).toEqual(['Banana'])
    expect(screen.getByText('1 of 4 items')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(names()).toHaveLength(4)
  })

  it('filters with a select and clears filters in one go', async () => {
    const user = userEvent.setup()
    renderTable()
    await user.click(screen.getByRole('combobox', { name: 'Kind' }))
    await user.click(await screen.findByRole('option', { name: 'Veg' }))
    expect(names()).toEqual(['Carrot', 'Leek'])
    await user.click(screen.getByRole('button', { name: 'Clear' }))
    expect(names()).toHaveLength(4)
  })

  it('shows views as tabs with live counts that follow the search', async () => {
    const user = userEvent.setup()
    renderTable()
    const live = screen.getByRole('tab', { name: /Live/ })
    expect(live).toHaveTextContent('3')
    await user.click(live)
    expect(live).toHaveAttribute('aria-selected', 'true')
    expect(names()).toEqual(['Apple', 'Banana', 'Leek'])
    // "e" matches Apple and Leek: both tabs count only those.
    await user.type(screen.getByRole('searchbox'), 'e')
    expect(screen.getByRole('tab', { name: /All/ })).toHaveTextContent('2')
    expect(live).toHaveTextContent('2')
  })

  it('sorts by a column, both ways, and marks the sort for assistive technology', async () => {
    const user = userEvent.setup()
    renderTable()
    await user.click(screen.getByRole('button', { name: /^Score/ }))
    expect(names()).toEqual(['Carrot', 'Banana', 'Apple', 'Leek'])
    expect(screen.getByRole('columnheader', { name: /Score/ })).toHaveAttribute('aria-sort', 'ascending')
    await user.click(screen.getByRole('button', { name: /^Score/ }))
    expect(names()).toEqual(['Leek', 'Apple', 'Banana', 'Carrot'])
  })

  it('pages long lists', async () => {
    const user = userEvent.setup()
    renderTable(ROWS, 3)
    expect(names()).toHaveLength(3)
    expect(screen.getByText(/1–3 of 4/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(names()).toHaveLength(1)
  })

  it('tells "no matches" apart from "nothing yet"', async () => {
    const user = userEvent.setup()
    renderTable()
    await user.type(screen.getByRole('searchbox'), 'zzz')
    expect(screen.getByRole('heading', { name: 'No matches' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear search and filters' }))
    expect(names()).toHaveLength(4)

    cleanup()
    renderTable([])
    expect(screen.getByRole('heading', { name: 'Nothing yet' })).toBeInTheDocument()
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
  })

  it('labels each cell for the phone card layout, except the title and actions', () => {
    renderTable()
    const row = within(screen.getByRole('table')).getAllByRole('row')[1]!
    const cells = row.querySelectorAll('td')
    expect(cells[0]).toHaveAttribute('data-primary')
    expect(cells[1]).toHaveAttribute('data-label', 'Score')
    expect(cells[2]).toHaveAttribute('data-actions')
    expect(cells[2]).not.toHaveAttribute('data-label')
  })
})
