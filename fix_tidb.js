import { db } from './db.js';

async function fixTiDBSchema() {
    try {
        console.log('🔧 Fixing TiDB Schema...');

        // 1. Alter audio_url to TEXT
        try {
            console.log('   Modifying audio_url to TEXT...');
            await db.query('ALTER TABLE songs MODIFY COLUMN audio_url TEXT');
            console.log('   ✅ audio_url is now TEXT.');
        } catch (err) {
            // Try camelCase if snake_case fails
            if (err.code === 'ER_BAD_FIELD_ERROR') {
                console.log('   ⚠️ audio_url not found. Trying audioUrl...');
                try {
                    await db.query('ALTER TABLE songs MODIFY COLUMN audioUrl TEXT');
                    console.log('   ✅ audioUrl is now TEXT.');
                } catch (e) {
                    console.error('   ❌ Failed to modify audio column:', e.message);
                }
            } else {
                console.error('   ❌ Error modifying audio_url:', err.message);
            }
        }

        // 2. Alter artwork_url to TEXT
        try {
            console.log('   Modifying artwork_url to TEXT...');
            await db.query('ALTER TABLE songs MODIFY COLUMN artwork_url TEXT');
            console.log('   ✅ artwork_url is now TEXT.');
        } catch (err) {
            // Try camelCase if snake_case fails
            if (err.code === 'ER_BAD_FIELD_ERROR') {
                console.log('   ⚠️ artwork_url not found. Trying artworkUrl...');
                try {
                    await db.query('ALTER TABLE songs MODIFY COLUMN artworkUrl TEXT');
                    console.log('   ✅ artworkUrl is now TEXT.');
                } catch (e) {
                    console.error('   ❌ Failed to modify artwork column:', e.message);
                }
            } else {
                console.error('   ❌ Error modifying artwork_url:', err.message);
            }
        }

        console.log('✨ Schema fix completed.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Critical error:', error);
        process.exit(1);
    }
}

fixTiDBSchema();
