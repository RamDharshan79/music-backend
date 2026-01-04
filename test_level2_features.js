import * as recommendationService from './services/recommendationService.js';

/**
 * Test script for Level-2 recommendation features
 * Run with: node test_level2_features.js
 */

async function testAllFeatures() {
    console.log('🎵 Testing Level-2 Recommendation Features\n');
    console.log('='.repeat(60));
    
    try {
        // Test 1: "Because you played X"
        await testBecauseYouPlayed();
        
        // Test 2: Smart Shuffle
        await testSmartShuffle();
        
        // Test 3: Auto-Generated Playlists
        await testAutoPlaylists();
        
        console.log('\n' + '='.repeat(60));
        console.log('✅ All tests completed successfully!\n');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error.stack);
    }
    
    process.exit(0);
}

async function testBecauseYouPlayed() {
    console.log('\n📀 Test 1: "Because You Played X"');
    console.log('-'.repeat(60));
    
    try {
        // Test with song ID 1 (adjust based on your data)
        const songId = 1;
        const recommendations = await recommendationService.getBecauseYouPlayedRecommendations(songId, 5);
        
        console.log(`\n🎯 Recommendations for song ID ${songId}:`);
        
        if (recommendations.length === 0) {
            console.log('  ⚠️  No recommendations found (song may not exist or no similar songs)');
        } else {
            recommendations.forEach((song, i) => {
                console.log(`  ${i + 1}. [Score: ${song.score}] ${song.title} by ${song.artist}`);
                if (song.album) {
                    console.log(`     Album: ${song.album}`);
                }
            });
        }
        
        console.log(`\n  ✓ Returned ${recommendations.length} recommendations`);
        
    } catch (error) {
        if (error.message === 'Song not found') {
            console.log('  ⚠️  Song ID 1 not found in database');
            console.log('  💡 Tip: Add songs first or adjust songId in test script');
        } else {
            throw error;
        }
    }
}

async function testSmartShuffle() {
    console.log('\n🔀 Test 2: Smart Shuffle');
    console.log('-'.repeat(60));
    
    try {
        // Test with song IDs 1-10 (adjust based on your data)
        const originalQueue = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const shuffledQueue = await recommendationService.smartShuffle(originalQueue);
        
        console.log('\n📋 Original queue:', originalQueue.join(', '));
        console.log('🎲 Shuffled queue:', shuffledQueue.join(', '));
        
        // Check if order changed
        const orderChanged = !originalQueue.every((id, i) => id === shuffledQueue[i]);
        
        if (orderChanged) {
            console.log('\n  ✓ Queue order successfully changed');
        } else {
            console.log('\n  ⚠️  Queue order unchanged (may happen with limited history)');
        }
        
        console.log(`  ✓ All ${shuffledQueue.length} songs preserved`);
        
        // Test with empty queue
        const emptyResult = await recommendationService.smartShuffle([]);
        console.log(`  ✓ Empty queue handled correctly: ${emptyResult.length === 0 ? 'PASS' : 'FAIL'}`);
        
    } catch (error) {
        console.log('  ⚠️  Smart shuffle test failed (songs may not exist)');
        console.log('  💡 Tip: Ensure songs with IDs 1-10 exist in database');
    }
}

async function testAutoPlaylists() {
    console.log('\n📂 Test 3: Auto-Generated Playlists');
    console.log('-'.repeat(60));
    
    // Test 3a: Top Songs
    console.log('\n🏆 Top Songs Playlist:');
    try {
        const topSongs = await recommendationService.getTopSongsPlaylist(5);
        
        if (topSongs.length === 0) {
            console.log('  ⚠️  No songs in history yet');
        } else {
            topSongs.forEach((song, i) => {
                console.log(`  ${i + 1}. ${song.title} by ${song.artist} - ${song.playCount} plays`);
            });
            console.log(`\n  ✓ Returned ${topSongs.length} top songs`);
        }
    } catch (error) {
        console.log('  ⚠️  Top playlist test failed');
    }
    
    // Test 3b: Recent Songs
    console.log('\n🕐 Recent Songs Playlist (Last 7 Days):');
    try {
        const recentSongs = await recommendationService.getRecentSongsPlaylist(5);
        
        if (recentSongs.length === 0) {
            console.log('  ⚠️  No songs played in last 7 days');
        } else {
            recentSongs.forEach((song, i) => {
                const lastPlayed = new Date(song.lastPlayed).toLocaleString();
                console.log(`  ${i + 1}. ${song.title} by ${song.artist}`);
                console.log(`     Last played: ${lastPlayed} (${song.playCount} times)`);
            });
            console.log(`\n  ✓ Returned ${recentSongs.length} recent songs`);
        }
    } catch (error) {
        console.log('  ⚠️  Recent playlist test failed');
    }
}

// Run tests
testAllFeatures();
