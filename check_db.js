import { db } from './db.js';

async function checkDatabase() {
  try {
    console.log('🔌 Connecting to database...');
    
    // Check Songs Table
    console.log('\n🎵 Checking Songs Table:');
    const [songs] = await db.query('SELECT * FROM songs ORDER BY id DESC LIMIT 5');
    if (songs.length === 0) {
      console.log('   No songs found.');
    } else {
      console.table(songs.map(s => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        created_at: s.created_at
      })));
    }

    // Check History Table (if exists)
    try {
      console.log('\n📜 Checking History Table:');
      const [history] = await db.query('SELECT * FROM history ORDER BY playedAt DESC LIMIT 5');
      if (history.length === 0) {
        console.log('   No history found.');
      } else {
        console.table(history);
      }
    } catch (err) {
      console.log('   History table might not exist or is empty.');
    }

  } catch (error) {
    console.error('❌ Error connecting to database:', error.message);
  } finally {
    process.exit();
  }
}

checkDatabase();
