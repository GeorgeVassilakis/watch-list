import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fold, buildIndex, search, highlight } from './search.js'

const MODES = [{ id: 'films' }, { id: 'books' }, { id: 'music' }]

const film = (title, meta = {}) => ({ title, meta })
const piped = (title, by, year = '', meta = {}) => ({ title, by, year, meta })

const DATA = {
  films: {
    sections: [
      { year: '2024', items: [
        film('Interstellar', { year: '2014', directors: ['Christopher Nolan'], genres: ['science fiction film'] }),
        film('The Wolf of Wall Street', { year: '2013', directors: ['Martin Scorsese'] }),
        film('Wolfs', { year: '2024', directors: ['Jon Watts'] }),
      ] },
      { year: '2026', items: [
        film("L'Étranger", { year: '2025', directors: ['François Ozon'] }),
        film('Spider-Man: Brand New Day', { year: '2026' }),
        film('The Man from U.N.C.L.E.', { year: '2015', directors: ['Guy Ritchie'] }),
        film('Romance'),
        film('Oppenheimer', { year: '2023', directors: ['Christopher Nolan'] }),
        film('No Other Choice (어쩔수가없다)'),
      ] },
    ],
  },
  books: {
    sections: [
      { year: '2026', items: [
        piped('The Sirens of Titan', 'Kurt Vonnegut', '1959'),
        piped('Slaughterhouse-Five', 'Kurt Vonnegut', '1969'),
      ] },
    ],
  },
  music: {
    sections: [
      { year: '2026', items: [piped('Grace', 'Jeff Buckley', '1994', { genre: 'Rock' })] },
    ],
  },
}

const index = buildIndex(DATA, MODES)
const titles = query => search(index, query).map(e => e.item.title)
const marked = (text, query) => highlight(text, query).filter(s => s.hit).map(s => s.text)

test('fold drops case, accents and punctuation', () => {
  assert.equal(fold("L'Étranger"), 'l etranger')
  assert.equal(fold('Spider-Man: Brand New Day'), 'spider man brand new day')
  assert.equal(fold('Y tu mamá también'), 'y tu mama tambien')
  assert.equal(fold('  U.N.C.L.E.  '), 'u n c l e')
  assert.equal(fold(null), '')
})

test('empty and punctuation-only queries match nothing', () => {
  assert.deepEqual(titles(''), [])
  assert.deepEqual(titles('   '), [])
  assert.deepEqual(titles('?!'), [])
})

test('accents and punctuation in titles do not block a match', () => {
  assert.deepEqual(titles('etranger'), ["L'Étranger"])
  assert.deepEqual(titles('spiderman'), ['Spider-Man: Brand New Day'])
  assert.deepEqual(titles('uncle'), ['The Man from U.N.C.L.E.'])
})

test('non-Latin titles are searchable', () => {
  assert.deepEqual(titles('어쩔수가없다'), ['No Other Choice (어쩔수가없다)'])
})

test('matches directors, authors, artists, years and genres', () => {
  assert.deepEqual(titles('nolan'), ['Oppenheimer', 'Interstellar'])
  assert.deepEqual(titles('vonnegut'), ['Slaughterhouse-Five', 'The Sirens of Titan'])
  assert.deepEqual(titles('buckley'), ['Grace'])
  assert.deepEqual(titles('2013'), ['The Wolf of Wall Street'])
  assert.deepEqual(titles('rock'), ['Grace'])
  assert.deepEqual(titles('science fiction'), ['Interstellar'])
})

test('every query word must match, across fields', () => {
  assert.deepEqual(titles('vonnegut sirens'), ['The Sirens of Titan'])
  assert.deepEqual(titles('nolan oppen'), ['Oppenheimer'])
  assert.deepEqual(titles('nolan wolf'), [])
})

test('title matches outrank matches in other fields', () => {
  assert.deepEqual(titles('wolf'), ['Wolfs', 'The Wolf of Wall Street'])
  assert.deepEqual(titles('the wolf'), ['The Wolf of Wall Street'])
})

test('short queries match word starts only', () => {
  assert.deepEqual(titles('man'), ['The Man from U.N.C.L.E.', 'Spider-Man: Brand New Day'])
  assert.ok(!titles('man').includes('Romance'))
})

test('ranks title start, then word start, then other fields; ties go to the most recent', () => {
  const films = search(index, 'o').filter(e => e.mode === 'films').map(e => e.item.title)
  assert.deepEqual(films, ['Oppenheimer', 'No Other Choice (어쩔수가없다)', 'The Wolf of Wall Street', "L'Étranger"])
})

test('results carry their mode', () => {
  assert.deepEqual(search(index, 'vonnegut').map(e => e.mode), ['books', 'books'])
})

test('highlight marks word starts in the original text', () => {
  assert.deepEqual(marked('Spider-Man: Brand New Day', 'spider man'), ['Spider', 'Man'])
  assert.deepEqual(marked('The Wolf of Wall Street', 'wolf st'), ['Wolf', 'St'])
  assert.deepEqual(marked("L'Étranger", 'etr'), ['Étr'])
  assert.deepEqual(marked('2013 · Martin Scorsese · 180 min', 'scor'), ['Scor'])
})

test('highlight falls back to the squashed query', () => {
  assert.deepEqual(marked('Spider-Man: Brand New Day', 'spiderman'), ['Spider-Man'])
  assert.deepEqual(marked('The Man from U.N.C.L.E.', 'uncle'), ['U.N.C.L.E'])
})

test('highlight keeps the full text intact', () => {
  const text = 'Y tu mamá también'
  for (const q of ['', 'mama', 'zzz', 'tu tambien']) {
    assert.equal(highlight(text, q).map(s => s.text).join(''), text)
  }
})
