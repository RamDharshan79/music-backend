# API Examples - Recommendation System

## Quick Start

### 1. Start the Server
```bash
npm start
# or for development with auto-reload
npm run dev
```

### 2. Apply Database Indexes (Optional but Recommended)
```bash
mysql -u root -p music_app < add_indexes.sql
```

### 3. Test Recommendations
```bash
node test_recommendations.js
```

## API Call Examples

### Get Personalized Recommendations

**Request:**
```bash
curl http://localhost:3000/api/recommendations/personalized
```

**Response:**
```json
{
  "recommendations": [
    {
      "id": 42,
      "title": "Bohemian Rhapsody",
      "artist": "Queen",
      "album": "A Night at the Opera",
      "audioUrl": "https://example.com/audio/42.mp3",
      "artworkUrl": "https://example.com/art/42.jpg",
      "duration": 354,
      "score": 125.8
    },
    {
      "id": 87,
      "title": "Don't Stop Me Now",
      "artist": "Queen",
      "album": "Jazz",
      "audioUrl": "https://example.com/audio/87.mp3",
      "artworkUrl": "https://example.com/art/87.jpg",
      "duration": 211,
      "score": 98.5
    }
  ],
  "count": 2,
  "timestamp": "2026-01-04T12:00:00.000Z"
}
```

### Get Limited Recommendations

**Request:**
```bash
curl "http://localhost:3000/api/recommendations/personalized?limit=5"
```

### Get Listening Statistics

**Request:**
```bash
curl http://localhost:3000/api/recommendations/stats
```

**Response:**
```json
{
  "topArtists": [
    {
      "artist": "Queen",
      "playCount": 45,
      "uniqueSongs": 12
    },
    {
      "artist": "The Beatles",
      "playCount": 38,
      "uniqueSongs": 15
    }
  ],
  "topAlbums": [
    {
      "album": "Abbey Road",
      "artist": "The Beatles",
      "playCount": 22
    }
  ],
  "topSongs": [
    {
      "title": "Bohemian Rhapsody",
      "artist": "Queen",
      "playCount": 8
    }
  ]
}
```

## Integration Example

### Frontend Integration (React/Vue/etc)

```javascript
// Fetch recommendations
async function loadRecommendations() {
  try {
    const response = await fetch('http://localhost:3000/api/recommendations/personalized?limit=20');
    const data = await response.json();
    
    console.log(`Got ${data.count} recommendations`);
    return data.recommendations;
  } catch (error) {
    console.error('Failed to load recommendations:', error);
    return [];
  }
}

// Use in component
const recommendations = await loadRecommendations();
recommendations.forEach(song => {
  console.log(`${song.title} by ${song.artist} (score: ${song.score})`);
});
```

### Record Play History

When a user plays a song, record it:

```javascript
async function recordPlay(songId) {
  await fetch('http://localhost:3000/api/history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ songId })
  });
}
```

## Testing Scenarios

### Scenario 1: New User (Empty History)
- Returns popular songs as fallback
- Ordered by total play count across all users

### Scenario 2: User Likes One Artist
- After playing 5+ songs from "Queen"
- Recommendations will heavily favor other Queen songs
- Score weighted 10x for artist match

### Scenario 3: User Likes Multiple Artists
- Plays from Queen, Beatles, Pink Floyd
- Recommendations balanced across all three
- Recent plays weighted higher

### Scenario 4: Album Listener
- User plays full albums
- Recommendations favor songs from same albums
- Score weighted 5x for album match

## Performance Testing

### Load Test with curl
```bash
# Run 100 requests
for i in {1..100}; do
  curl -s http://localhost:3000/api/recommendations/personalized > /dev/null
  echo "Request $i completed"
done
```

### Measure Response Time
```bash
time curl http://localhost:3000/api/recommendations/personalized
```

Expected: <200ms for typical datasets

## Troubleshooting

### No Recommendations Returned
```bash
# Check if history exists
curl http://localhost:3000/api/history

# Check if songs exist
curl http://localhost:3000/api/songs
```

### Slow Performance
```bash
# Verify indexes are applied
mysql -u root -p music_app < add_indexes.sql

# Check query performance
node test_recommendations.js
```

### Error 500
- Check server logs for detailed error messages
- Verify database connection in .env file
- Ensure tables exist (run schema.sql)
