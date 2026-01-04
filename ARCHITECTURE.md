# Architecture Overview - Level-2 Recommendations

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT                               │
│  (Web App / Mobile App / API Consumer)                      │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP Requests
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    EXPRESS SERVER                            │
│                     (index.js)                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Middleware: CORS, JSON Parser                       │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                        ROUTES                                │
│              (routes/recommendations.js)                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  GET  /api/recommendations/because/:songId           │  │
│  │  POST /api/recommendations/shuffle/smart             │  │
│  │  GET  /api/recommendations/playlists/auto/top        │  │
│  │  GET  /api/recommendations/playlists/auto/recent     │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     CONTROLLERS                              │
│         (controllers/recommendationController.js)            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  • Validate request parameters                       │  │
│  │  • Call service layer                                │  │
│  │  • Format responses                                  │  │
│  │  • Handle errors                                     │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      SERVICES                                │
│          (services/recommendationService.js)                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  • Business logic                                    │  │
│  │  • SQL queries                                       │  │
│  │  • Scoring algorithms                                │  │
│  │  • Data transformation                               │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE LAYER                            │
│                      (db.js)                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  MySQL Connection Pool                               │  │
│  │  • Max 10 connections                                │  │
│  │  • Auto-reconnect                                    │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    MYSQL DATABASE                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Tables:                                             │  │
│  │  • songs (id, title, artist, album, ...)            │  │
│  │  • history (id, songId, playedAt)                   │  │
│  │  • playlists (id, name)                             │  │
│  │  • playlist_songs (playlistId, songId)              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Request Flow Examples

### 1. "Because You Played X"

```
Client Request
    │
    │ GET /api/recommendations/because/42
    ▼
Route Handler
    │
    │ recommendationController.getBecauseYouPlayed()
    ▼
Controller
    │
    │ • Validate songId (42)
    │ • Call service
    ▼
Service
    │
    │ recommendationService.getBecauseYouPlayedRecommendations(42, 10)
    │
    ├─► Query 1: Get original song details
    │   SELECT * FROM songs WHERE id = 42
    │
    └─► Query 2: Find similar songs
        SELECT s.*, 
               CASE WHEN artist = 'Queen' THEN 100 ... END as score
        FROM songs s
        LEFT JOIN history h ON h.songId = s.id
        WHERE s.id != 42
        GROUP BY s.id
        ORDER BY score DESC
        LIMIT 10
    │
    ▼
Response
    │
    │ JSON: { songId: 42, recommendations: [...], count: 10 }
    ▼
Client
```

### 2. Smart Shuffle

```
Client Request
    │
    │ POST /api/recommendations/shuffle/smart
    │ Body: { queue: [1, 2, 3, 4, 5] }
    ▼
Route Handler
    │
    │ recommendationController.smartShuffle()
    ▼
Controller
    │
    │ • Validate queue array
    │ • Parse song IDs
    │ • Call service
    ▼
Service
    │
    │ recommendationService.smartShuffle([1, 2, 3, 4, 5])
    │
    ├─► Query 1: Get song details + play counts
    │   SELECT s.id, s.artist, COUNT(h.id) as playCount
    │   FROM songs s
    │   LEFT JOIN history h ON h.songId = s.id
    │   WHERE s.id IN (1, 2, 3, 4, 5)
    │   GROUP BY s.id
    │
    ├─► Query 2: Get recently played songs
    │   SELECT DISTINCT songId FROM history
    │   ORDER BY playedAt DESC LIMIT 10
    │
    ├─► Query 3: Get recent artist plays
    │   SELECT s.artist, COUNT(*) as recentPlays
    │   FROM history h
    │   JOIN songs s ON s.id = h.songId
    │   WHERE h.playedAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    │   GROUP BY s.artist
    │
    └─► Calculate weights & sort
        For each song:
          weight = 10 (base)
                 + min(playCount, 20)
                 + min(artistPlays * 5, 15)
                 - 30 (if recently played)
                 + random(±5)
        Sort by weight DESC
    │
    ▼
Response
    │
    │ JSON: { queue: [3, 1, 5, 2, 4], originalCount: 5, shuffledCount: 5 }
    ▼
Client
```

### 3. Auto-Generated Playlists

```
Client Request
    │
    │ GET /api/recommendations/playlists/auto/top
    ▼
Route Handler
    │
    │ recommendationController.getTopPlaylist()
    ▼
Controller
    │
    │ • Parse limit parameter
    │ • Call service
    ▼
Service
    │
    │ recommendationService.getTopSongsPlaylist(50)
    │
    └─► Query: Get most played songs
        SELECT s.*, COUNT(h.id) as playCount
        FROM songs s
        INNER JOIN history h ON h.songId = s.id
        GROUP BY s.id
        ORDER BY playCount DESC
        LIMIT 50
    │
    ▼
Response
    │
    │ JSON: { 
    │   playlist: { id: 'auto-top', name: 'Top Songs', virtual: true },
    │   songs: [...],
    │   count: 50
    │ }
    ▼
Client
```

## Data Flow Diagram

```
┌──────────────┐
│   Request    │
└──────┬───────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐
│   Validate   │────►│  Error 400   │
└──────┬───────┘     └──────────────┘
       │ Valid
       ▼
┌──────────────┐
│ Call Service │
└──────┬───────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐
│  SQL Query   │────►│  Error 500   │
└──────┬───────┘     └──────────────┘
       │ Success
       ▼
┌──────────────┐
│   Process    │
│     Data     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Format     │
│   Response   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Return JSON │
└──────────────┘
```

## Component Responsibilities

### Routes Layer
```javascript
// ONLY defines endpoints and maps to controllers
router.get('/because/:songId', recommendationController.getBecauseYouPlayed);
```

**Responsibilities:**
- ✅ Define URL patterns
- ✅ Map to controller functions
- ❌ NO business logic
- ❌ NO database access

### Controllers Layer
```javascript
// Handles HTTP concerns
export async function getBecauseYouPlayed(req, res) {
    // 1. Extract & validate parameters
    const songId = parseInt(req.params.songId);
    
    // 2. Call service
    const recommendations = await service.getBecauseYouPlayedRecommendations(songId);
    
    // 3. Format response
    res.json({ recommendations });
    
    // 4. Handle errors
    catch (error) { res.status(500).json({ error }); }
}
```

**Responsibilities:**
- ✅ Request validation
- ✅ Parameter extraction
- ✅ Response formatting
- ✅ HTTP error handling
- ❌ NO business logic
- ❌ NO SQL queries

### Services Layer
```javascript
// Pure business logic
export async function getBecauseYouPlayedRecommendations(songId, limit) {
    // 1. Get original song
    const [song] = await db.query('SELECT ...');
    
    // 2. Find similar songs with scoring
    const [recommendations] = await db.query('SELECT ... CASE WHEN ...');
    
    // 3. Apply fallback if needed
    if (recommendations.length === 0) {
        return await getPopularSongsFallback(songId, limit);
    }
    
    return recommendations;
}
```

**Responsibilities:**
- ✅ Business logic
- ✅ SQL queries
- ✅ Data transformation
- ✅ Algorithms (scoring, weighting)
- ❌ NO HTTP concerns
- ❌ NO request/response handling

## Database Schema

```sql
┌─────────────────────────────────────┐
│            songs                     │
├─────────────────────────────────────┤
│ id (PK)          INT                │
│ title            VARCHAR(255)       │
│ artist           VARCHAR(255)       │
│ album            VARCHAR(255)       │
│ audioUrl         VARCHAR(2048)      │
│ artworkUrl       VARCHAR(2048)      │
│ duration         INT                │
│ created_at       TIMESTAMP          │
└─────────────────┬───────────────────┘
                  │
                  │ 1:N
                  │
┌─────────────────▼───────────────────┐
│           history                    │
├─────────────────────────────────────┤
│ id (PK)          INT                │
│ songId (FK)      INT                │
│ playedAt         TIMESTAMP          │
└─────────────────────────────────────┘

Indexes:
• idx_history_played_at ON history(playedAt DESC)
• idx_history_song_id ON history(songId)
• idx_history_song_played ON history(songId, playedAt DESC)
• idx_songs_artist ON songs(artist)
• idx_songs_album ON songs(album)
```

## Error Handling Flow

```
┌─────────────────┐
│  Try Block      │
└────────┬────────┘
         │
         ▼
    ┌────────┐
    │Success?│
    └───┬─┬──┘
        │ │
    Yes │ │ No
        │ │
        │ └──────────────┐
        │                │
        ▼                ▼
┌───────────────┐  ┌──────────────┐
│ Return 200 OK │  │ Catch Block  │
└───────────────┘  └──────┬───────┘
                          │
                          ▼
                   ┌──────────────┐
                   │ Log Error    │
                   └──────┬───────┘
                          │
                          ▼
                   ┌──────────────┐
                   │ Check Type   │
                   └──┬─────┬─────┘
                      │     │
            ┌─────────┘     └─────────┐
            │                         │
            ▼                         ▼
    ┌───────────────┐         ┌──────────────┐
    │ Known Error   │         │Unknown Error │
    │ (404, 400)    │         │ (500)        │
    └───────────────┘         └──────────────┘
```

## Performance Optimization

```
Request
    │
    ▼
┌─────────────────┐
│ Connection Pool │  ← Reuse connections (max 10)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Indexed Queries │  ← Fast lookups with indexes
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Limit Results   │  ← LIMIT clause in SQL
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Minimal Data    │  ← SELECT only needed columns
└────────┬────────┘
         │
         ▼
    Response
```

## Scalability Considerations

### Current Capacity
- **Songs:** Up to 100K efficiently
- **History:** Millions of records (with indexes)
- **Concurrent Users:** ~100 (connection pool: 10)

### Future Scaling
```
┌──────────────┐
│   Client     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Load Balancer│  ← Add for horizontal scaling
└──────┬───────┘
       │
   ┌───┴───┐
   │       │
   ▼       ▼
┌─────┐ ┌─────┐
│App 1│ │App 2│  ← Multiple instances
└──┬──┘ └──┬──┘
   │       │
   └───┬───┘
       │
       ▼
┌──────────────┐
│    Redis     │  ← Add caching layer
└──────┬───────┘
       │
       ▼
┌──────────────┐
│    MySQL     │  ← Read replicas for scaling
└──────────────┘
```

This architecture provides a solid foundation for building production-ready recommendation features!
