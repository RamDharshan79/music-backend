import { db } from './db.js';

export async function runMigrations() {
    console.log('🔄 Checking Database Schema...');

    // Helper to safely alter column
    const ensureTextColumn = async (table, column) => {
        try {
            // We use MODIFY COLUMN which is standard MySQL. TiDB supports this.
            // We blindly try to set it to TEXT. If it's already TEXT, it's fine.
            await db.query(`ALTER TABLE ${table} MODIFY COLUMN ${column} TEXT`);
            console.log(`   ✅ ensured ${table}.${column} is TEXT`);
        } catch (error) {
            // If column doesn't exist (e.g. camelCase vs snake_case), ignore specific error
            if (error.code === 'ER_BAD_FIELD_ERROR') {
                console.log(`   ℹ️ Column ${column} not found in ${table}, skipping.`);
            } else {
                console.warn(`   ⚠️ Warning modifying ${column}: ${error.message}`);
            }
        }
    };

    try {
        await ensureTextColumn('songs', 'audio_url');
        await ensureTextColumn('songs', 'artwork_url');

        // Also try camelCase versions just in case the DB is in that state
        await ensureTextColumn('songs', 'audioUrl');
        await ensureTextColumn('songs', 'artworkUrl');

        console.log('✨ Schema Check Complete.');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    }
}
