/**
 * Local Testing Script
 * 
 * This script simulates WhatsApp messages to test the bot locally
 * without needing actual WhatsApp or webhook setup.
 */

require('dotenv').config();
const messageHandler = require('./handlers/messageHandler');

// Test scenarios
const testScenarios = [
  {
    name: 'Greeting',
    message: 'Hello, I need help with my car lease'
  },
  {
    name: 'Lease End Question',
    message: 'When does my lease period end?'
  },
  {
    name: 'Car Inquiry',
    message: 'What cars are available for lease?'
  },
  {
    name: 'Pricing Question',
    message: 'How much does it cost to lease a BMW 3 Series?'
  },
  {
    name: 'Follow-up (tests memory)',
    message: 'What about a 36-month lease term?'
  },
  {
    name: 'Lease Options',
    message: 'What are my options when the lease ends?'
  }
];

async function runTests() {
  console.log('\n🧪 Starting Local Bot Tests\n');
  console.log('=' .repeat(60));
  
  // Check if OpenAI API key is set
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ ERROR: OPENAI_API_KEY not found in .env file');
    console.log('\nPlease add your OpenAI API key to .env:');
    console.log('OPENAI_API_KEY=sk-your-key-here\n');
    process.exit(1);
  }

  console.log('✅ OpenAI API key found');
  console.log(`📝 Model: ${process.env.OPENAI_MODEL || 'gpt-4'}\n`);

  const testPhone = '385912395365'; // Test phone number

  for (let i = 0; i < testScenarios.length; i++) {
    const scenario = testScenarios[i];
    
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`Test ${i + 1}/${testScenarios.length}: ${scenario.name}`);
    console.log(`${'─'.repeat(60)}`);
    console.log(`👤 User: ${scenario.message}`);
    console.log('\n⏳ Processing...\n');

    try {
      const response = await messageHandler.handleMessage({
        from: testPhone,
        content: scenario.message,
        type: 'TEXT',
        messageId: `test-${Date.now()}-${i}`,
        rawMessage: {}
      });

      console.log(`🤖 Bot: ${response}`);
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      if (error.message.includes('API key')) {
        console.error('\n⚠️  Please check your OPENAI_API_KEY in .env file');
        break;
      }
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('✅ Tests completed!\n');
  console.log('💡 Tip: Check the conversation memory by running the same test twice');
  console.log('   The bot should remember previous messages.\n');
  
  process.exit(0);
}

// Run tests
runTests().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

