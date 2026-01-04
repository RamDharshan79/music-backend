-- Indexes for optimizing recommendation queries

-- Index on history.playedAt for recency-based queries
CREATE INDEX IF NOT EXISTS idx_history_played_at ON history(playedAt DESC);

-- Index on history.songId for join performance
CREATE INDEX IF NOT EXISTS idx_history_song_id ON history(songId);

-- Composite index for efficient recent plays lookup
CREATE INDEX IF NOT EXISTS idx_history_song_played ON history(songId, playedAt DESC);

-- Index on songs.artist for artist-based recommendations
CREATE INDEX IF NOT EXISTS idx_songs_artist ON songs(artist);

-- Index on songs.album for album-based recommendations
CREATE INDEX IF NOT EXISTS idx_songs_album ON songs(album);
