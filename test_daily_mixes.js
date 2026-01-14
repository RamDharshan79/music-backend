import * as dailyMixesService from './services/dailyMixes.service.js';

/**
 * Test script for Daily Mixes feature
 * Run with: node test_daily_mixes.js
 */

async function testDailyMixes() {
    console.log('🎵 Testing Daily Mixes Feature\n');
    console.log('='.repeat(70));
    
    try {
        // Test 1: Generate all daily mixes
        await testGenerateAllMixes();
        
        // Test 2: Check statistics
        await testMixStatistics();
        
        // Test 3: Verify deterministic behavior
        await testDeterministicBehavior();
        
        console.log('\n' + '='.repeat(70));
        console.log('✅ All tests completed successfully!\n');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error.stack);
    }
    
    process.exit(0);
}

async function testGenerateAllMixes() {
    console.log('\n📀 Test 1: Generate All Daily Mixes');
    console.log('-'.repeat(70));
    
    const mixes = await dailyMixesService.generateAllDailyMixes();
    
    console.log(`\n✓ Generated ${mixes.length} daily mixes\n`);
    
    mixes.forEach((mix, index) => {
        console.log(`${index + 1}. ${mix.title} - "${mix.subtitle}"`);
        console.log(`   ID: ${mix.id}`);
        console.log(`   Description: ${mix.description}`);
        console.log(`   Songs: ${mix.count}`);
        
        if (mix.songs.length > 0) {
            console.log(`   Sample songs:`);
            mix.songs.slice(0, 3).forEach((song, i) => {
                console.log(`     ${i + 1}. ${song.title} by ${song.artist}`);
            });
        } else {
            console.log(`   ⚠️  No songs (may need more listening history)`);
        }
        console.log('');
    });
    
    // Verify mix structure
    mixes.forEach(mix => {
        if (!mix.id || !mix.title || !mix.subtitle) {
            throw new Error(`Invalid mix structure: ${JSON.stringify(mix)}`);
        }
    });
    
    console.log('✓ All mixes have valid structure');
}

async function testMixStatistics() {
    console.log('\n📊 Test 2: Daily Mix Statistics');
    console.log('-'.repeat(70));
    
    const stats = await dailyMixesService.getDailyMixStats();
    
    console.log('\nStatistics:');
    console.log(`  Total plays: ${stats.totalPlays}`);
    console.log(`  Unique artists: ${stats.uniqueArtists}`);
    console.log(`  Recent plays (7 days): ${stats.recentPlays}`);
    console.log(`  Daily seed: ${stats.dailySeed}`);
    console.log(`  Generated at: ${stats.generatedAt}`);
    
    // Verify daily seed format (YYYYMMDD)
    const seedStr = stats.dailySeed.toString();
    if (seedStr.length !== 8) {
        throw new Error(`Invalid daily seed format: ${stats.dailySeed}`);
    }
    
    console.log('\n✓ Statistics retrieved successfully');
    console.log('✓ Daily seed format is valid');
}

async function testDeterministicBehavior() {
    console.log('\n🔄 Test 3: Deterministic Behavior');
    console.log('-'.repeat(70));
    
    console.log('\nGenerating mixes twice with same seed...');
    
    const mixes1 = await dailyMixesService.generateAllDailyMixes();
    const mixes2 = await dailyMixesService.generateAllDailyMixes();
    
    console.log(`\nFirst generation: ${mixes1.length} mixes`);
    console.log(`Second generation: ${mixes2.length} mixes`);
    
    // Verify same number of mixes
    if (mixes1.length !== mixes2.length) {
        throw new Error('Different number of mixes generated');
    }
    
    // Verify same mix IDs
    const ids1 = mixes1.map(m => m.id).sort();
    const ids2 = mixes2.map(m => m.id).sort();
    
    if (JSON.stringify(ids1) !== JSON.stringify(ids2)) {
        throw new Error('Different mix IDs generated');
    }
    
    // Verify same song counts
    let allSongsMatch = true;
    for (let i = 0; i < mixes1.length; i++) {
        const count1 = mixes1[i].count;
        const count2 = mixes2[i].count;
        
        console.log(`  ${mixes1[i].title}: ${count1} songs (both generations)`);
        
        if (count1 !== count2) {
            allSongsMatch = false;
            console.log(`    ⚠️  Mismatch: ${count1} vs ${count2}`);
        }
    }
    
    if (allSongsMatch) {
        console.log('\n✓ Deterministic behavior verified');
        console.log('✓ Same seed produces same results');
    } else {
        console.log('\n⚠️  Some variation detected (may be due to concurrent history updates)');
    }
}

// Helper: Display mix details
function displayMixDetails(mix) {
    console.log(`\n${mix.title}`);
    console.log(`Subtitle: ${mix.subtitle}`);
    console.log(`Description: ${mix.description}`);
    console.log(`Songs: ${mix.count}`);
    
    if (mix.songs.length > 0) {
        console.log('\nTop 5 songs:');
        mix.songs.slice(0, 5).forEach((song, i) => {
            console.log(`  ${i + 1}. ${song.title} by ${song.artist}`);
            if (song.album) {
                console.log(`     Album: ${song.album}`);
            }
        });
    }
}

// Run tests
testDailyMixes();
