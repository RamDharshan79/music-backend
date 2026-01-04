# Level-2 Recommendation Features

## Overview
Three Spotify-level recommendation features built with pure logic (no ML):
1. "Because you played X" - Similar song recommendations
2. Smart Shuffle - Weighted queue reordering
3. Auto-Generated Playlists - Virtual playlists (not saved in DB)

## Architecture

```
Routes (routes/recommendations.js)
    ↓
Controllers (controllers/recommendationController.js)
    ↓
Services (services/recommendationService.js)
    ↓
Database (MySQL via db.js)
```

---

## 1. "Because You Played X"

### Endpoint
```
GET /api/recommendations/because/:songId?limit=10
```

### Logic Priority
1. **Same Artist + Same Album** (score: 150)
2. **Same Artist** (score: 100)
3. **Same Album** (score: 50)
4. **Popular Songs** (score: play count)

### Example Request
```bash
curl http://localhost:3000/api/recommendations/because/42?limit=10
```

### Example Response
```json
{
  "songId": 42,
  "recommendations": [
    {
      "id": 43,
      "title": "We Will Rock You",
      "artist": "Queen",
      "album": "News of the World",
      "audioUrl": "https://...",
      "artworkUrl": "https://...",
      "duration": 122,
      "score": 158
    }
  ],
  "count": 10
}
```

### SQL Query
```sql
SELECT 
    s.id,
    s.title,
    s.artist,
    s.album,
    s.audioUrl,
    s.artworkUrl,
    s.duration,
    CASE
        WHEN s.artist = ? AND s.album = ? THEN 150
        WHEN s.artist = ? THEN 100
        WHEN s.album = ? AND s.album IS NOT NULL THEN 50
        ELSE 0
    END + COALESCE(COUNT(h.id), 0) as score
FROM songs s
LEFT JOIN history h ON h.songId = s.id
WHERE s.id != ?
GROUP BY s.id
HAVING score > 0
ORDER BY score DESC, s.id DESC
LIMIT ?
```

### Use Cases
- "More like this" feature
- Song radio functionality
- Related songs section
- Artist deep-dive

---

## 2. Smart Shuffle

### Endpoint
```
POST /api/shuffle/smart
Content-Type: application/json
```

### Request Body
```json
{
  "queue": [42, 87, 123, 456, 789]
}
```

### Logic

**Weight Calculation:**
```javascript
baseWeight = 10

// Boosts
+ frequentlyPlayed (min: 0, max: +20)
+ recentArtist (min: 0, max: +15)
+ randomness (±5 for variety)

// Penalties
- recentlyPlayed (-30 if in last 10 plays)

finalWeight = max(calculatedWeight, 1)
```

**Sorting:** Descending by weight

### Example Request
```bash
curl -X POST http://localhost:3000/api/recommendations/shuffle/smart \
  -H "Content-Type: application/json" \
  -d '{"queue": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}'
```

### Example Response
```json
{
  "queue": [3, 7, 1, 9, 5, 2, 8, 4, 10, 6],
  "originalCount": 10,
  "shuffledCount": 10
}
```

### Weight Examples

**Song A:**
- Play count: 15 → +15
- Artist recently played 3 times → +15
- Not in last 10 → 0
- Random: +2
- **Total: 42**

**Song B:**
- Play count: 5 → +5
- Artist not recent → 0
- In last 10 plays → -30
- Random: -3
- **Total: 1 (clamped)**

**Result:** Song A plays before Song B

### Use Cases
- Smart playlist shuffle
- Queue optimization
- Personalized playback order
- Avoid repetition

---

## 3. Auto-Generated Playlists

### 3.1 Top Songs Playlist

**Endpoint:**
```
GET /api/playlists/auto/top?limit=50
```

**Logic:**
- Most played songs overall
- Sorted by play count (descending)
- Virtual playlist (not saved in DB)

**Example Request:**
```bash
curl http://localhost:3000/api/recommendations/playlists/auto/top?limit=20
```

**Example Response:**
```json
{
  "playlist": {
    "id": "auto-top",
    "name": "Top Songs",
    "description": "Your most played songs",
    "type": "auto-generated",
    "virtual": true
  },
  "songs": [
    {
      "id": 42,
      "title": "Bohemian Rhapsody",
      "artist": "Queen",
      "album": "A Night at the Opera",
      "audioUrl": "https://...",
      "artworkUrl": "https://...",
      "duration": 354,
      "playCount": 47
    }
  ],
  "count": 20
}
```

**SQL Query:**
```sql
SELECT 
    s.id,
    s.title,
    s.artist,
    s.album,
    s.audioUrl,
    s.artworkUrl,
    s.duration,
    COUNT(h.id) as playCount
FROM songs s
INNER JOIN history h ON h.songId = s.id
GROUP BY s.id
ORDER BY playCount DESC, s.id DESC
LIMIT ?
```

### 3.2 Recent Songs Playlist

**Endpoint:**
```
GET /api/playlists/auto/recent?limit=50
```

**Logic:**
- Songs played in last 7 days
- Sorted by last played time (descending)
- Virtual playlist (not saved in DB)

**Example Request:**
```bash
curl http://localhost:3000/api/recommendations/playlists/auto/recent?limit=20
```

**Example Response:**
```json
{
  "playlist": {
    "id": "auto-recent",
    "name": "Recently Played",
    "description": "Songs you played in the last 7 days",
    "type": "auto-generated",
    "virtual": true
  },
  "songs": [
    {
      "id": 87,
      "title": "Don't Stop Me Now",
      "artist": "Queen",
      "album": "Jazz",
      "audioUrl": "https://...",
      "artworkUrl": "https://...",
      "duration": 211,
      "playCount": 3,
      "lastPlayed": "2026-01-04T10:30:00.000Z"
    }
  ],
  "count": 20
}
```

**SQL Query:**
```sql
SELECT 
    s.id,
    s.title,
    s.artist,
    s.album,
    s.audioUrl,
    s.artworkUrl,
    s.duration,
    COUNT(h.id) as playCount,
    MAX(h.playedAt) as lastPlayed
FROM songs s
INNER JOIN history h ON h.songId = s.id
WHERE h.playedAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY s.id
ORDER BY lastPlayed DESC, playCount DESC
LIMIT ?
```

---

## Error Handling

### 400 Bad Request
```json
{
  "error": "Invalid song ID"
}
```

### 404 Not Found
```json
{
  "error": "Song not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to get recommendations"
}
```

---

## Testing

### Test Script
```bash
# Test "Because you played"
curl http://localhost:3000/api/recommendations/because/1

# Test smart shuffle
curl -X POST http://localhost:3000/api/recommendations/shuffle/smart \
  -H "Content-Type: application/json" \
  -d '{"queue": [1, 2, 3, 4, 5]}'

# Test top playlist
curl http://localhost:3000/api/recommendations/playlists/auto/top

# Test recent playlist
curl http://localhost:3000/api/recommendations/playlists/auto/recent
```

---

## Performance

### Expected Response Times
- "Because you played": <100ms
- Smart shuffle: <150ms (depends on queue size)
- Auto playlists: <100ms

### Optimization Tips
1. Ensure indexes exist (see add_indexes.sql)
2. Limit queue size for smart shuffle (<100 songs)
3. Cache auto-playlists for high traffic
4. Use connection pooling (already configured)

---

## Integration Examples

### Frontend (React/Vue)

```javascript
// "Because you played" feature
async function loadSimilarSongs(songId) {
  const response = await fetch(
    `http://localhost:3000/api/recommendations/because/${songId}?limit=10`
  );
  const data = await response.json();
  return data.recommendations;
}

// Smart shuffle
async function smartShuffleQueue(songIds) {
  const response = await fetch(
    'http://localhost:3000/api/recommendations/shuffle/smart',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queue: songIds })
    }
  );
  const data = await response.json();
  return data.queue;
}

// Load auto-generated playlists
async function loadTopSongs() {
  const response = await fetch(
    'http://localhost:3000/api/recommendations/playlists/auto/top?limit=50'
  );
  const data = await response.json();
  return data.songs;
}
```

---

## Future Enhancements

### Possible Level-3 Features
- Genre-based "Because you played"
- Time-of-day aware shuffle
- Mood-based auto playlists
- Collaborative filtering
- A/B testing framework
