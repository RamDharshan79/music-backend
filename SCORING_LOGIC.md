# Recommendation Scoring Logic - Detailed Explanation

## Overview
The recommendation system uses a weighted scoring algorithm that prioritizes artist and album familiarity while incorporating recency bias.

## Step-by-Step Scoring Process

### Step 1: Analyze Listening History

**Input:** Last 200 plays from history table

**Process:**
```javascript
// For each play in history:
daysAgo = DATEDIFF(NOW(), playedAt)
recencyWeight = 0.95^daysAgo

// Accumulate weights
artistScore[artist] += recencyWeight
albumScore[album] += recencyWeight
songScore[songId] += recencyWeight
```

**Example:**
```
User's Recent History:
- Day 0 (today):    "Bohemian Rhapsody" by Queen → weight = 1.00
- Day 1:            "We Will Rock You" by Queen → weight = 0.95
- Day 7:            "Don't Stop Me Now" by Queen → weight = 0.70
- Day 30:           "Another One Bites" by Queen → weight = 0.21

Queen's Total Artist Score = 1.00 + 0.95 + 0.70 + 0.21 = 2.86
```

### Step 2: Exclude Recent Plays

**Purpose:** Avoid recommending songs just played

**Process:**
- Get last 10 distinct songIds from history
- Remove these from candidate pool

**Example:**
```sql
Recently Played (excluded):
- Bohemian Rhapsody (id: 42)
- We Will Rock You (id: 43)
- Don't Stop Me Now (id: 44)
... (7 more)

These will NOT appear in recommendations
```

### Step 3: Score Each Candidate Song

**Formula:**
```
score = (artistWeight × 10) + (albumWeight × 5) + popularityBoost
```

**Weights:**
- Artist Match: 10x (highest priority)
- Album Match: 5x (medium priority)
- Popularity: 1x (base boost)

### Step 4: Rank and Return

**Process:**
- Sort by score (descending)
- Take top N songs (default: 20)
- Return with scores for transparency

## Detailed Examples

### Example 1: Heavy Single-Artist Listener

**Listening History:**
```
Queen - 50 plays (weighted score: 35.2)
Beatles - 5 plays (weighted score: 3.1)
Pink Floyd - 2 plays (weighted score: 1.4)
```

**Candidate Song Scores:**

| Song | Artist | Album | Artist Score | Album Score | Total Score |
|------|--------|-------|--------------|-------------|-------------|
| Radio Ga Ga | Queen | The Works | 35.2 × 10 = 352 | 8.5 × 5 = 42.5 | **394.5** |
| Under Pressure | Queen | Hot Space | 35.2 × 10 = 352 | 5.2 × 5 = 26 | **378** |
| Here Comes the Sun | Beatles | Abbey Road | 3.1 × 10 = 31 | 2.1 × 5 = 10.5 | **41.5** |
| Comfortably Numb | Pink Floyd | The Wall | 1.4 × 10 = 14 | 0.8 × 5 = 4 | **18** |

**Result:** Queen songs dominate recommendations

### Example 2: Album-Focused Listener

**Listening History:**
```
Abbey Road (Beatles) - 20 plays (album score: 15.8)
  - Come Together: 5 plays
  - Something: 4 plays
  - Here Comes the Sun: 11 plays

Other Beatles albums - 10 plays (various scores)
```

**Candidate Song Scores:**

| Song | Artist | Album | Artist Score | Album Score | Total Score |
|------|--------|-------|--------------|-------------|-------------|
| Golden Slumbers | Beatles | Abbey Road | 22.5 × 10 = 225 | 15.8 × 5 = 79 | **304** |
| Let It Be | Beatles | Let It Be | 22.5 × 10 = 225 | 6.2 × 5 = 31 | **256** |
| Hey Jude | Beatles | Single | 22.5 × 10 = 225 | 0 × 5 = 0 | **225** |

**Result:** Abbey Road songs ranked highest

### Example 3: Diverse Listener

**Listening History:**
```
Queen - 15 plays (score: 11.2)
Beatles - 12 plays (score: 9.5)
Pink Floyd - 10 plays (score: 8.1)
Led Zeppelin - 8 plays (score: 6.4)
```

**Candidate Song Scores:**

| Song | Artist | Score Calculation | Total |
|------|--------|-------------------|-------|
| Killer Queen | Queen | 11.2 × 10 + 3.2 × 5 = 112 + 16 | **128** |
| Yesterday | Beatles | 9.5 × 10 + 2.8 × 5 = 95 + 14 | **109** |
| Wish You Were Here | Pink Floyd | 8.1 × 10 + 4.1 × 5 = 81 + 20.5 | **101.5** |
| Stairway to Heaven | Led Zeppelin | 6.4 × 10 + 5.2 × 5 = 64 + 26 | **90** |

**Result:** Balanced recommendations across artists

### Example 4: New User (Empty History)

**Listening History:** None

**Fallback Strategy:**
```sql
SELECT songs, COUNT(history) as playCount
FROM songs
LEFT JOIN history ON history.songId = songs.id
GROUP BY songs.id
ORDER BY playCount DESC
LIMIT 20
```

**Result:** Most popular songs across all users

## Recency Decay Visualization

```
Weight = 0.95^days

Days Ago | Weight | % of Today
---------|--------|------------
0        | 1.000  | 100%
1        | 0.950  | 95%
3        | 0.857  | 86%
7        | 0.698  | 70%
14       | 0.488  | 49%
30       | 0.215  | 22%
60       | 0.046  | 5%
90       | 0.010  | 1%
```

**Interpretation:**
- Plays from last week: ~70% weight
- Plays from last month: ~22% weight
- Plays from 3 months ago: ~1% weight

This ensures recommendations reflect current taste while not completely ignoring older preferences.

## Edge Cases

### Case 1: Only One Song in History
- Artist gets full weight
- Album gets full weight
- Other songs from same artist/album ranked highest
- Falls back to popular if no matches

### Case 2: All Songs Recently Played
- Exclusion list removes all candidates
- System returns empty array or popular fallback
- Frontend should handle gracefully

### Case 3: Very Large History (1000+ plays)
- System limits to last 200 plays for performance
- Older plays beyond 200 are ignored
- Keeps response time under 200ms

### Case 4: Ties in Scoring
- Songs with identical scores sorted by ID (descending)
- Ensures consistent ordering
- Newer songs (higher IDs) appear first

## Tuning Parameters

You can adjust these in `recommendations.js`:

```javascript
// Recency decay rate (default: 0.95)
const recencyWeight = Math.pow(0.95, daysAgo);

// Artist weight (default: 10)
score += artistScore * 10;

// Album weight (default: 5)
score += albumScore * 5;

// History analysis depth (default: 200)
LIMIT 200

// Exclusion count (default: 10)
const recentlyPlayedIds = await getRecentlyPlayedSongIds(10);
```

**Tuning Guidelines:**
- Increase artist weight (10 → 15) for stronger artist focus
- Increase album weight (5 → 8) for album-oriented users
- Decrease decay rate (0.95 → 0.90) for stronger recency bias
- Increase exclusion count (10 → 20) for more variety
