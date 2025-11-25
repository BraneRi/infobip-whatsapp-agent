require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Import handlers
const messageHandler = require('./handlers/messageHandler');
const infobipService = require('./services/infobipService');

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'WhatsApp Webhook'
  });
});

// Main webhook endpoint for incoming WhatsApp messages
app.post('/webhook/whatsapp', async (req, res) => {
  try {
    console.log('📨 Incoming webhook:', JSON.stringify(req.body, null, 2));

    // Immediately respond to Infobip (important!)
    res.status(200).send('OK');

    // Process the message asynchronously
    const messages = req.body.results || [];
    
    for (const message of messages) {
      await processIncomingMessage(message);
    }

  } catch (error) {
    console.error('❌ Webhook error:', error);
    // Still return 200 to Infobip to avoid retries
    res.status(200).send('OK');
  }
});

// Process incoming message
async function processIncomingMessage(message) {
  try {
    const messageType = message.message?.type;
    const from = message.from;
    const messageId = message.messageId;
    
    console.log(`\n📱 Message received from: ${from}`);
    console.log(`   Type: ${messageType}`);
    console.log(`   Message ID: ${messageId}`);

    // Extract message content based on type
    let messageContent = '';
    
    switch (messageType) {
      case 'TEXT':
        messageContent = message.message.text;
        console.log(`   Content: ${messageContent}`);
        break;
      case 'IMAGE':
        messageContent = '[Image received]';
        console.log(`   Image URL: ${message.message.url}`);
        break;
      case 'DOCUMENT':
        messageContent = '[Document received]';
        console.log(`   Document URL: ${message.message.url}`);
        break;
      case 'AUDIO':
        messageContent = '[Audio received]';
        console.log(`   Audio URL: ${message.message.url}`);
        break;
      case 'VIDEO':
        messageContent = '[Video received]';
        console.log(`   Video URL: ${message.message.url}`);
        break;
      case 'LOCATION':
        messageContent = '[Location received]';
        console.log(`   Location: ${message.message.latitude}, ${message.message.longitude}`);
        break;
      case 'CONTACT':
        messageContent = '[Contact received]';
        break;
      case 'BUTTON':
        messageContent = message.message.text || message.message.payload;
        console.log(`   Button: ${messageContent}`);
        break;
      case 'LIST':
        messageContent = message.message.title || message.message.description;
        console.log(`   List reply: ${messageContent}`);
        break;
      default:
        messageContent = '[Unsupported message type]';
        console.log(`   Unsupported type: ${messageType}`);
    }

    // 🤖 PLACEHOLDER: Add your bot logic here
    // This is where you would integrate Claude API or your custom logic
    const response = await messageHandler.handleMessage({
      from: from,
      content: messageContent,
      type: messageType,
      messageId: messageId,
      rawMessage: message
    });

    // Send response back via Infobip
    if (response) {
      await infobipService.sendTextMessage(from, response);
    }

  } catch (error) {
    console.error('❌ Error processing message:', error);
  }
}

// Delivery report webhook (optional but useful)
app.post('/webhook/delivery', (req, res) => {
  console.log('📊 Delivery report:', JSON.stringify(req.body, null, 2));
  res.status(200).send('OK');
});

// Seen report webhook (optional)
app.post('/webhook/seen', (req, res) => {
  console.log('👀 Seen report:', JSON.stringify(req.body, null, 2));
  res.status(200).send('OK');
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 WhatsApp Webhook Server running on port ${PORT}`);
  console.log(`📍 Webhook URL: http://localhost:${PORT}/webhook/whatsapp`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`\n⚙️  Configuration:`);
  console.log(`   Sender: ${process.env.WHATSAPP_SENDER}`);
  console.log(`   Environment: ${process.env.NODE_ENV}`);
  console.log(`\n📝 To expose this locally, use ngrok or similar:`);
  console.log(`   ngrok http ${PORT}\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n👋 SIGINT received, shutting down gracefully');
  process.exit(0);
});
