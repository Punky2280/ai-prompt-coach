// PURPOSE: Basic test script for RAG functionality
// PHASE: C
// STATUS: complete
// VERIFY: API key and Firestore connection

require('dotenv').config();

const { DocumentIngestionService } = require('./services/document-ingestion');
const { RAGRetrievalService } = require('./services/rag-retrieval');
const { RAGPromptService } = require('./services/rag-prompt-service');

async function testRAGFunctionality() {
  console.log('🧪 Testing RAG functionality...\n');

  try {
    // Initialize services
    const ingestionService = new DocumentIngestionService();
    const retrievalService = new RAGRetrievalService();
    const ragPromptService = new RAGPromptService();

    // Test document ingestion
    console.log('📄 Testing document ingestion...');
    const testDocument = {
      title: 'Test Document: AI and Machine Learning',
      content: `Artificial Intelligence (AI) is a broad field of computer science focused on creating systems that can perform tasks that typically require human intelligence. Machine Learning (ML) is a subset of AI that focuses on algorithms that can learn from and make predictions or decisions based on data. Deep Learning is a subset of ML that uses neural networks with multiple layers to model and understand complex patterns in data. Natural Language Processing (NLP) is another important area of AI that deals with the interaction between computers and human language.`,
      source: 'test-script',
      contentType: 'text',
      metadata: { category: 'AI/ML', test: true }
    };

    const documentId = await ingestionService.ingestDocument(testDocument);
    console.log(`✅ Document ingested with ID: ${documentId}\n`);

    // Wait a moment for processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test retrieval
    console.log('🔍 Testing document retrieval...');
    const query = 'What is machine learning?';
    const relevantChunks = await retrievalService.retrieveRelevantChunks(query, {
      topK: 3,
      threshold: 0.5
    });

    console.log(`Found ${relevantChunks.length} relevant chunks for query: "${query}"`);
    relevantChunks.forEach((chunk, index) => {
      console.log(`  ${index + 1}. Similarity: ${chunk.similarity.toFixed(3)}`);
      console.log(`     Content: ${chunk.content.substring(0, 100)}...`);
    });
    console.log();

    // Test RAG-enhanced prompt
    console.log('🤖 Testing RAG-enhanced prompt...');
    const ragResult = await ragPromptService.processPrompt(query, {
      enableRAG: true,
      topK: 3,
      threshold: 0.5
    });

    console.log('RAG Response:');
    console.log(ragResult.answer);
    console.log('\nMetadata:');
    console.log(JSON.stringify(ragResult.metadata, null, 2));

    // Test statistics
    console.log('\n📊 RAG Statistics:');
    const stats = await retrievalService.getDocumentStats();
    console.log(JSON.stringify(stats, null, 2));

    // Cleanup
    console.log('\n🧹 Cleaning up test document...');
    await ingestionService.deleteDocument(documentId);
    console.log('✅ Test document deleted');

    console.log('\n🎉 RAG functionality test completed successfully!');

  } catch (error) {
    console.error('❌ RAG test failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testRAGFunctionality()
    .then(() => {
      console.log('\n✨ All tests passed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { testRAGFunctionality };