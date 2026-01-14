# Daily Mixes - Quick Reference Card

## 🚀 Quick Start

```bash
npm start
curl http://localhost:3000/api/mixes/daily
```

---

## 📡 API Endpoints

```bash
# Get all daily mixes
GET /api/mixes/daily

# Get statistics
GET /api/mixes/daily/stats
```

---

## 🎵 4 Daily Mixes

| Mix | Focus | Logic | Count |
|-----|-------|-------|-------|
| **Daily Mix 1** | Favorite Artists | Top 5 artists, exclude last 24h | 25 |
| **Daily Mix 2** | Recently Loved | Played 2+ times in 7 days | ≤25 |
| **Daily Mix 3** | Discovery | Unplayed from familiar artists | 25 |
| **Daily Mix 4** | Chill Vibes | 40% recent + 60% popular | 25 |

---

## 📁 Files

```
routes/dailyMixes.routes.js          # Routes
controllers/dailyMixes.controller.js # Controllers
services/dailyMixes.service.js       # Business logic
```

---

## 🧪 Testing

```bash
# Run tests
node test_daily_mixes.js

# Manual test
curl http://localhost:3000/api/mixes/daily | jq .
```

---

## ⚡ Performance

- **Response time:** <300ms
- **Parallel generation:** Yes
- **Virtual:** Not saved in DB
- **Refresh:** Daily (deterministic)

---

## 🔑 Key Features

✅ Pure logic (no ML)
✅ Deterministic (same day = same mixes)
✅ Virtual playlists
✅ Fast performance
✅ Production-ready

---

## 📖 Documentation

- **DAILY_MIXES.md** - Complete docs
- **DAILY_MIXES_API.md** - API reference
- **DAILY_MIXES_SUMMARY.md** - Summary

---

## 🎯 Example Response

```json
{
  "mixes": [
    {
      "id": "daily-1",
      "title": "Daily Mix 1",
      "subtitle": "Your favorite artists",
      "songs": [...],
      "count": 25
    }
  ],
  "count": 4
}
```

---

## 🎉 Ready!

```bash
npm start
curl http://localhost:3000/api/mixes/daily
```
