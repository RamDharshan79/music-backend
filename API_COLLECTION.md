# API Collection - Level-2 Features

Complete curl commands for testing all Level-2 recommendation features.

## Prerequisites

```bash
# Start the server
npm start

# Server should be running on http://localhost:3000
```

---

## 1. "Because You Played X"

### Basic Request
```bash
curl http://localhost:3000/api/recommendations/because/1
```

### With Custom Limit
```bash
curl http://localhost:3000/api/recommendations/because/1?limit=5
```

### Expected Response
```json
{
  "songId": 1,
  "recommendations": [
    {
      "id": 2,
      "title": "Song Title",
      "artist": "Artist Name",
      "album": "Album Name",
      "audioUrl": "https://...",
      "artworkUrl": "https://...",
      "duration": 240,
      "score": 105
    }
  ],
  "count": 5
}
```

### Error Cases

**Song Not Found (404):**
```bash
curl http://localhost:3000/api/recommendations/because/99999
```

**Invalid Song ID (400):**
```bash
curl http://localhost:3000/api/recommendations/because/invalid
```

---

## 2. Smart Shuffle

### Basic Request
```bash
curl -X POST http://localhost:3000/api/recommendations/shuffle/smart \
  -H "Content-Type: application/json" \
  -d '{
    "queue": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  }'
```

### Large Queue
```bash
curl -X POST http://localhost:3000/api/recommendations/shuffle/smart \
  -H "Content-Type: application/json" \
  -d '{
    "queue": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
  }'
```

### Empty Queue
```bash
curl -X POST http://localhost:3000/api/recommendations/shuffle/smart \
  -H "Content-Type: application/json" \
  -d '{
    "queue": []
  }'
```

### Expected Response
```json
{
  "queue": [3, 7, 1, 9, 5, 2, 8, 4, 10, 6],
  "originalCount": 10,
  "shuffledCount": 10
}
```

### Error Cases

**Missing Queue (400):**
```bash
curl -X POST http://localhost:3000/api/recommendations/shuffle/smart \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Invalid Queue Type (400):**
```bash
curl -X POST http://localhost:3000/api/recommendations/shuffle/smart \
  -H "Content-Type: application/json" \
  -d '{
    "queue": "not-an-array"
  }'
```

---

## 3. Auto-Generated Playlists

### 3.1 Top Songs

**Basic Request:**
```bash
curl http://localhost:3000/api/recommendations/playlists/auto/top
```

**With Custom Limit:**
```bash
curl http://localhost:3000/api/recommendations/playlists/auto/top?limit=20
```

**Expected Response:**
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

### 3.2 Recent Songs

**Basic Request:**
```bash
curl http://localhost:3000/api/recommendations/playlists/auto/recent
```

**With Custom Limit:**
```bash
curl http://localhost:3000/api/recommendations/playlists/auto/recent?limit=30
```

**Expected Response:**
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
  "count": 30
}
```

---

## Complete Test Suite

Run all endpoints in sequence:

```bash
#!/bin/bash

echo "Testing Level-2 Recommendation Features"
echo "========================================"

echo -e "\n1. Testing 'Because You Played'..."
curl -s http://localhost:3000/api/recommendations/because/1 | jq .

echo -e "\n2. Testing Smart Shuffle..."
curl -s -X POST http://localhost:3000/api/recommendations/shuffle/smart \
  -H "Content-Type: application/json" \
  -d '{"queue": [1, 2, 3, 4, 5]}' | jq .

echo -e "\n3. Testing Top Playlist..."
curl -s http://localhost:3000/api/recommendations/playlists/auto/top?limit=5 | jq .

echo -e "\n4. Testing Recent Playlist..."
curl -s http://localhost:3000/api/recommendations/playlists/auto/recent?limit=5 | jq .

echo -e "\n✅ All tests completed!"
```

Save as `test_api.sh`, make executable, and run:
```bash
chmod +x test_api.sh
./test_api.sh
```

---

## Performance Testing

### Measure Response Time

```bash
# "Because you played"
time curl -s http://localhost:3000/api/recommendations/because/1 > /dev/null

# Smart shuffle
time curl -s -X POST http://localhost:3000/api/recommendations/shuffle/smart \
  -H "Content-Type: application/json" \
  -d '{"queue": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}' > /dev/null

# Top playlist
time curl -s http://localhost:3000/api/recommendations/playlists/auto/top > /dev/null

# Recent playlist
time curl -s http://localhost:3000/api/recommendations/playlists/auto/recent > /dev/null
```

### Load Testing

```bash
# Run 100 requests to "Because you played"
for i in {1..100}; do
  curl -s http://localhost:3000/api/recommendations/because/1 > /dev/null &
done
wait
echo "100 requests completed"
```

---

## Integration with Existing Endpoints

### Complete Workflow Example

```bash
# 1. Get all songs
curl http://localhost:3000/api/songs

# 2. Play a song (record in history)
curl -X POST http://localhost:3000/api/history \
  -H "Content-Type: application/json" \
  -d '{"songId": 1}'

# 3. Get recommendations based on that song
curl http://localhost:3000/api/recommendations/because/1

# 4. Create a queue from recommendations
QUEUE='[2, 3, 4, 5, 6]'

# 5. Smart shuffle the queue
curl -X POST http://localhost:3000/api/recommendations/shuffle/smart \
  -H "Content-Type: application/json" \
  -d "{\"queue\": $QUEUE}"

# 6. Check your top songs
curl http://localhost:3000/api/recommendations/playlists/auto/top

# 7. Check recent activity
curl http://localhost:3000/api/recommendations/playlists/auto/recent
```

---

## Postman Collection

Import this JSON into Postman:

```json
{
  "info": {
    "name": "Music App - Level-2 Recommendations",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Because You Played",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "http://localhost:3000/api/recommendations/because/1?limit=10",
          "host": ["localhost"],
          "port": "3000",
          "path": ["api", "recommendations", "because", "1"],
          "query": [{"key": "limit", "value": "10"}]
        }
      }
    },
    {
      "name": "Smart Shuffle",
      "request": {
        "method": "POST",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\"queue\": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}"
        },
        "url": {
          "raw": "http://localhost:3000/api/recommendations/shuffle/smart",
          "host": ["localhost"],
          "port": "3000",
          "path": ["api", "recommendations", "shuffle", "smart"]
        }
      }
    },
    {
      "name": "Top Playlist",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "http://localhost:3000/api/recommendations/playlists/auto/top?limit=50",
          "host": ["localhost"],
          "port": "3000",
          "path": ["api", "recommendations", "playlists", "auto", "top"],
          "query": [{"key": "limit", "value": "50"}]
        }
      }
    },
    {
      "name": "Recent Playlist",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "http://localhost:3000/api/recommendations/playlists/auto/recent?limit=50",
          "host": ["localhost"],
          "port": "3000",
          "path": ["api", "recommendations", "playlists", "auto", "recent"],
          "query": [{"key": "limit", "value": "50"}]
        }
      }
    }
  ]
}
```
