import { getPersonalizedRecommendations, getListeningStats } from './recommendations.js';

/**
 * Test script for recommendation system
 * Run with: node test_recommendations.js
 */

async function testRecommendations() {
    console.log('🎵 Testing Recommendation System\n');
    
    try {
        // Test 1: Get listening stats
        console.log('📊 Listening Statistics:');
        console.log('─'.repeat(50));
        const stats = await getListeningStats();
        
        console.log('\n🎤 Top Artists:');
        stats.topArtists.slice(0, 5).forEach((artist, i) => {
            console.log(`  ${i + 1}. ${artist.artist} - ${artist.playCount} plays (${artist.uniqueSongs} songs)`);
        });
        
        console.log('\n💿 Top Albums:');
        stats.topAlbums.slice(0, 5).forEach((album, i) => {
            console.log(`  ${i + 1}. ${album.album} by ${album.artist} - ${album.playCount} plays`);
        });
        
        console.log('\n🎵 Top Songs:');
        stats.topSongs.slice(0, 5).forEach((song, i) => {
            console.log(`  ${i + 1}. ${song.title} by ${song.artist} - ${song.playCount} plays`);
        });
        
        // Test 2: Get recommendations
        console.log('\n\n🎯 Personalized Recommendations:');
        console.log('─'.repeat(50));
        const recommendations = await getPersonalizedRecommendations(10);
        
        if (recommendations.length === 0) {
            console.log('⚠️  No recommendations (empty history or no songs)');
        } else {
            recommendations.forEach((song, i) => {
                console.log(`  ${i + 1}. [Score: ${song.score.toFixed(1)}] ${song.title} by ${song.artist}`);
            });
        }
        
        console.log('\n✅ Test completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
    }
    
    process.exit(0);
}

testRecommendations();
