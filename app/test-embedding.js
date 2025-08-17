// PURPOSE: Simple embedding test without Firestore dependency
// PHASE: C
// STATUS: complete
// VERIFY: Gemini API key

require('dotenv').config();

const { EmbeddingService } = require('./services/embedding-service');

async function testEmbeddingService() {
  console.log('🧪 Testing Embedding Service...\n');

  try {
    const embeddingService = new EmbeddingService();

    // Test single embedding
    console.log('📄 Testing single embedding generation...');
    const testText = "Machine learning is a subset of artificial intelligence that enables computers to learn and improve from experience.";
    
    const embedding = await embeddingService.generateEmbedding(testText);
    console.log(`✅ Generated embedding with ${embedding.length} dimensions`);
    console.log(`First 5 values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
    console.log();

    // Test batch embeddings
    console.log('📚 Testing batch embedding generation...');
    const testTexts = [
      "Deep learning uses neural networks with multiple layers.",
      "Natural language processing helps computers understand human language.",
      "Computer vision enables machines to interpret visual information."
    ];

    const batchEmbeddings = await embeddingService.generateBatchEmbeddings(testTexts);
    console.log(`✅ Generated ${batchEmbeddings.length} batch embeddings`);
    console.log();

    // Test similarity calculation
    console.log('🔍 Testing similarity calculation...');
    const text1 = "Machine learning algorithms";
    const text2 = "Artificial intelligence methods";
    const text3 = "Cooking recipes and ingredients";

    const emb1 = await embeddingService.generateEmbedding(text1);
    const emb2 = await embeddingService.generateEmbedding(text2);
    const emb3 = await embeddingService.generateEmbedding(text3);

    const sim12 = embeddingService.calculateSimilarity(emb1, emb2);
    const sim13 = embeddingService.calculateSimilarity(emb1, emb3);

    console.log(`Similarity between "${text1}" and "${text2}": ${sim12.toFixed(4)}`);
    console.log(`Similarity between "${text1}" and "${text3}": ${sim13.toFixed(4)}`);
    
    if (sim12 > sim13) {
      console.log('✅ Similarity test passed: ML and AI are more similar than ML and cooking');
    } else {
      console.log('❌ Similarity test failed: unexpected similarity scores');
    }

    console.log('\n🎉 Embedding service test completed successfully!');

  } catch (error) {
    console.error('❌ Embedding test failed:', error);
    console.error(error.stack);
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testEmbeddingService()
    .then(() => {
      console.log('\n✨ Embedding tests passed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Embedding test failed:', error);
      process.exit(1);
    });
}

module.exports = { testEmbeddingService };