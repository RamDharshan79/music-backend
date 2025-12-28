import { db } from './db.js';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('⚠️  Are you sure you want to DELETE ALL DATA? (yes/no): ', async (answer) => {
  if (answer.toLowerCase() === 'yes') {
    try {
      console.log('\n🗑️  Deleting all data...');
      
      // Delete from tables
      try {
        await db.query('DELETE FROM history');
        console.log('   ✅ History table cleared');
      } catch (err) {
        console.log('   ℹ️  History table skipped (might not exist)');
      }

      await db.query('DELETE FROM songs');
      console.log('   ✅ Songs table cleared');

      // Reset Auto Increment
      try {
        await db.query('ALTER TABLE songs AUTO_INCREMENT = 1');
        await db.query('ALTER TABLE history AUTO_INCREMENT = 1');
      } catch (e) {
        // Ignore errors if tables don't support this
      }

      console.log('\n✨ Database is clean!');
    } catch (error) {
      console.error('❌ Error clearing database:', error.message);
    } finally {
      process.exit();
    }
  } else {
    console.log('❌ Operation cancelled.');
    process.exit();
  }
});
