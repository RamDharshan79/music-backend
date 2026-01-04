# Quick Start - Personalized Recommendations

## 🚀 Get Started in 3 Steps

### 1. Apply Database Indexes (Optional but Recommended)
```bash
mysql -u root -p music_app < add_indexes.sql
```

### 2. Start the Server
```bash
npm start
```

### 3. Test the Endpoint
```bash
curl http://localhost:3000/api/recommendations/personalized
```

## 📋 What You Get

### Main Endpoint
```
GET /api/recommendations/personalized?limit=20
```

**Returns:** Array of recommended songs with relevance scores

### Debug Endpoint
```
GET /api/recommendations/stats
```

**Returns:** Top artists, albums, and songs from history

## 🎯 How It Works

1. **Analyzes** last 200 plays from history
2. **Weights** recent plays higher (exponential decay)
3. **Scores** songs based on:
   - Artist match (10x weight)
   - Album match (5x weight)
   - Popularity boost (1x weight)
4. **Excludes** last 10 played songs
5. **Returns** top 20 recommendations

## 📊 Example Response

```json
{
  "recommendations": [
    {
      "id": 42,
      "title": "Bohemian Rhapsody",
      "artist": "Queen",
      "album": "A Night at the Opera",
      "audioUrl": "https://...",
      "artworkUrl": "https://...",
      "duration": 354,
      "score": 125.8
    }
  ],
  "count": 1,
  "timestamp": "2026-01-04T12:00:00.000Z"
}
```

## 🧪 Test It

```bash
# Run test script
node test_recommendations.js

# Or use curl
curl http://localhost:3000/api/recommendations/personalized?limit=5
```

## 📚 Documentation

- **RECOMMENDATIONS.md** - Full system overview
- **SCORING_LOGIC.md** - Detailed scoring algorithm
- **API_EXAMPLES.md** - Integration examples
- **add_indexes.sql** - Database optimization

## ✅ Features

- ✅ No machine learning required
- ✅ No external services
- ✅ Efficient SQL queries (<200ms)
- ✅ Recency-weighted scoring
- ✅ Smart fallbacks for new users
- ✅ Production-ready error handling
- ✅ Excludes recently played songs
- ✅ Transparent scoring (debug-friendly)

## 🔧 Customization

Edit `recommendations.js` to tune:
- Recency decay rate (default: 0.95)
- Artist weight (default: 10x)
- Album weight (default: 5x)
- History depth (default: 200 plays)
- Exclusion count (default: 10 songs)

## 🎵 Integration

```javascript
// Frontend example
const response = await fetch('/api/recommendations/personalized?limit=20');
const { recommendations } = await response.json();

recommendations.forEach(song => {
  console.log(`${song.title} by ${song.artist} (score: ${song.score})`);
});
```

## 🐛 Troubleshooting

**No recommendations?**
- Check if history has data: `curl http://localhost:3000/api/history`
- Check if songs exist: `curl http://localhost:3000/api/songs`

**Slow performance?**
- Apply indexes: `mysql -u root -p music_app < add_indexes.sql`

**Errors?**
- Check server logs for details
- Verify database connection in `.env`
