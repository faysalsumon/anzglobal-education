// Test script for AI chat agent with knowledge base building
const http = require('http');

const BASE_URL = 'http://localhost:5000';

// Helper function to make authenticated requests
async function makeRequest(method, path, data = null, cookies = '') {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(cookies && { 'Cookie': cookies }),
      },
    };

    const req = http.request(url, options, (res) => {
      let body = '';
      
      // Capture cookies from response
      const setCookies = res.headers['set-cookie'];
      
      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          const jsonBody = JSON.parse(body);
          resolve({ 
            status: res.statusCode, 
            data: jsonBody,
            cookies: setCookies ? setCookies.join('; ') : cookies 
          });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, cookies: setCookies ? setCookies.join('; ') : cookies });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function testChatAgent() {
  console.log('🤖 Testing AI Chat Agent with RAG Knowledge Base\n');

  try {
    // Step 1: Build knowledge base (without auth for now - will add admin check later)
    console.log('📚 Building knowledge base...');
    const buildResult = await makeRequest('POST', '/api/chat/admin/build-knowledge-base');
    
    if (buildResult.status === 401) {
      console.log('⚠️  Knowledge base endpoint requires admin authentication');
      console.log('   Skipping knowledge base build for this test\n');
    } else if (buildResult.status === 200) {
      console.log('✅ Knowledge base built successfully!');
      console.log(`   Documents created: ${buildResult.data.summary?.totalDocuments || 'N/A'}\n`);
    } else {
      console.log(`❌ Failed to build knowledge base: ${buildResult.status}`);
      console.log(`   Response: ${JSON.stringify(buildResult.data)}\n`);
    }

    // Step 2: Create a conversation
    console.log('💬 Creating conversation...');
    const convResult = await makeRequest('POST', '/api/chat/conversations', {});
    
    if (convResult.status !== 200) {
      console.log(`❌ Failed to create conversation: ${convResult.status}`);
      console.log(`   Response: ${JSON.stringify(convResult.data)}`);
      return;
    }

    const conversationId = convResult.data.id;
    const cookies = convResult.cookies;
    console.log(`✅ Conversation created: ${conversationId}\n`);

    // Step 3: Test query about courses
    console.log('📝 Sending test query: "What computer science courses do you offer?"\n');
    const msgResult = await makeRequest(
      'POST', 
      `/api/chat/conversations/${conversationId}/messages`,
      { content: 'What computer science courses do you offer?' },
      cookies
    );

    if (msgResult.status !== 200) {
      console.log(`❌ Failed to send message: ${msgResult.status}`);
      console.log(`   Response: ${JSON.stringify(msgResult.data)}`);
      return;
    }

    console.log('🤖 AI Response:');
    console.log('─'.repeat(60));
    console.log(msgResult.data.response);
    console.log('─'.repeat(60));
    
    if (msgResult.data.sources && msgResult.data.sources.length > 0) {
      console.log('\n📎 Sources:');
      msgResult.data.sources.forEach((source, idx) => {
        console.log(`   ${idx + 1}. ${source.title} (${source.type})`);
      });
    }

    console.log('\n✅ Chat agent test completed successfully!');

  } catch (error) {
    console.error('❌ Error during testing:', error.message);
  }
}

// Run the test
testChatAgent();
