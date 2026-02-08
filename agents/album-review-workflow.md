# Album Review Update Workflow

Use this when adding or updating a reviewed album from notes.

## 1. Paste This Input Template

```text
Album: <title>
Artist: <artist>
Rating: <x.x>/10
Top 3 songs (ranked):
1. <song 1>
2. <song 2>
3. <song 3>
Review: <review text>
```

## 2. Find Metadata (Web)

Use this source order so metadata is consistent:

1. Apple Music / iTunes album page (primary source)
2. Wikipedia album page (fallback)
3. Discogs or MusicBrainz (final fallback)

Look up and capture:

- `releaseYear`
- `genre` (1-3 genres)
- `length` (album runtime, e.g. `51:52`)
- optional `sourceUrl` (album page link)

Do not use or store `label`.

Genre policy:

- Prefer the exact genre listed on the primary source.
- If multiple sources disagree, keep at most 2-3 broad genres.
- Do not invent custom micro-genres unless a source explicitly uses them.

## 3. Update `data/albums.txt`

1. Find album row by title + artist.
2. If it exists as unreviewed (`- [ ]`), change to reviewed (`- [x]`).
3. Ensure the row ends with rating: `| <x.x>/10`.

Target format:

```text
- [x] Title | Artist | Year | file: cover.jpg | 9.4/10
```

If the album does not exist, add it under the current year section (`## YYYY`).

## 4. Upsert `data/album-reviews.json`

Add/update one object matching `title` + `artist`:

```json
{
  "title": "Grace",
  "artist": "Jeff Buckley",
  "summary": "Your natural review text.",
  "topSongs": [
    "Song #1",
    "Song #2",
    "Song #3"
  ],
  "rating": 9.4,
  "metadata": {
    "genre": ["Alternative Rock", "Folk Rock"],
    "releaseYear": 1994,
    "length": "51:52",
    "sourceUrl": "https://..."
  },
  "updatedAt": "<ISO-8601 timestamp>"
}
```

Rules:

- `topSongs` order is the ranking (`#1`, `#2`, `#3`).
- Keep `summary` as the user's natural review text (no sentence-count requirement).
- Correct obvious spelling mistakes in the review text before saving, while preserving the original tone/voice.
- Only reviewed albums should have entries here.

## 5. Validate

```bash
node -e "JSON.parse(require('fs').readFileSync('data/album-reviews.json','utf8')); console.log('album-reviews.json ok')"
rg -n "<Album Title>|<Artist>" data/albums.txt data/album-reviews.json
```

## 6. Preview UI

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000`, go to `Music`, and verify:

- Clicking a reviewed album opens a popup review card.
- Top songs appear as ranked `1`, `2`, `3`.
- Metadata shows year/genre/length.

## 7. Commit (Optional)

```bash
git add data/albums.txt data/album-reviews.json
git commit -m "Add album review: <Title> - <Artist>"
git push
```
