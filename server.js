require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Request logging middleware - MUST be first to catch ALL requests
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📥 [${timestamp}] ${req.method} ${req.path}`);
  console.log(`   URL: ${req.url}`);
  console.log(`   Original URL: ${req.originalUrl}`);
  console.log(`   Headers:`, JSON.stringify(req.headers, null, 2));
  console.log(`   Query:`, JSON.stringify(req.query, null, 2));
  
  // Log body (but be careful with large bodies)
  if (req.body && Object.keys(req.body).length > 0) {
    const bodyStr = JSON.stringify(req.body, null, 2);
    if (bodyStr.length > 1000) {
      console.log(`   Body: ${bodyStr.substring(0, 1000)}... (truncated)`);
    } else {
      console.log(`   Body:`, bodyStr);
    }
  } else {
    console.log(`   Body: (empty)`);
  }
  console.log(`${'='.repeat(80)}\n`);
  next();
});

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Import handlers
const messageHandler = require('./handlers/messageHandler');

// Validate environment variables before importing services
if (!process.env.INFOBIP_API_KEY) {
  console.error('\n❌ CRITICAL ERROR: INFOBIP_API_KEY is not set!');
  console.error('   Please set INFOBIP_API_KEY in your .env file or environment variables.');
  console.error('   Example: INFOBIP_API_KEY=your_api_key_here\n');
  process.exit(1);
}

if (!process.env.WHATSAPP_SENDER) {
  console.warn('\n⚠️  WARNING: WHATSAPP_SENDER is not set!');
  console.warn('   This is required for sending WhatsApp messages.');
  console.warn('   Example: WHATSAPP_SENDER=385916376631\n');
}

const infobipService = require('./services/infobipService');
const videoProcessor = require('./services/videoProcessor');

// Track processed message IDs to prevent duplicate processing
const processedMessageIds = new Set();
const MESSAGE_ID_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Clean up old message IDs periodically
setInterval(() => {
  // This is a simple implementation - in production, use Redis or database
  // For now, we'll just limit the cache size
  if (processedMessageIds.size > 1000) {
    processedMessageIds.clear();
    console.log('🧹 Cleared message ID cache');
  }
}, 60 * 60 * 1000); // Every hour

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'WhatsApp Webhook'
  });
});

// Main webhook endpoint for incoming WhatsApp messages
app.post('/webhook/whatsapp/inbound', async (req, res) => {
  try {
    console.log(`✅ ✅ ✅ INBOUND MESSAGES WEBHOOK MATCHED ✅ ✅ ✅`);
    console.log('📨 Processing incoming webhook...');
    console.log('   Body keys:', Object.keys(req.body));
    console.log('   Has results?', !!req.body.results);
    console.log('   Results count:', req.body.results?.length || 0);

    // Immediately respond to Infobip (important!)
    res.status(200).send('OK');
    console.log('   ✅ Sent 200 OK response to Infobip');

    // Process the message asynchronously
    const messages = req.body.results || [];
    
    if (messages.length === 0) {
      console.log('   ⚠️  No messages in results array');
      return;
    }
    
    // Filter out already processed messages
    const newMessages = messages.filter(msg => {
      const messageId = msg.messageId;
      if (!messageId) {
        console.log('   ⚠️  Message without ID, skipping');
        return false;
      }
      
      if (processedMessageIds.has(messageId)) {
        console.log(`   ⏭️  Skipping duplicate message ID: ${messageId}`);
        return false;
      }
      
      // Mark as processed
      processedMessageIds.add(messageId);
      console.log(`   ✅ New message ID: ${messageId}`);
      return true;
    });
    
    if (newMessages.length === 0) {
      console.log('   ℹ️  All messages were duplicates, nothing to process');
      return;
    }
    
    console.log(`   📬 Processing ${newMessages.length} new message(s)...`);
    
    for (const message of newMessages) {
      await processIncomingMessage(message);
    }

  } catch (error) {
    console.error('❌ Webhook error:', error);
    console.error('   Stack:', error.stack);
    // Still return 200 to Infobip to avoid retries
    res.status(200).send('OK');
  }
});

// Process incoming message
async function processIncomingMessage(message) {
  try {
    // Validate this is an actual inbound message
    if (!message.from || !message.message || !message.message.type) {
      console.log(`   ⏭️  Skipping non-message webhook (missing required fields)`);
      return;
    }
    
    // Only process WhatsApp inbound messages
    if (message.integrationType && message.integrationType !== 'WHATSAPP') {
      console.log(`   ⏭️  Skipping non-WhatsApp message: ${message.integrationType}`);
      return;
    }
    
    // Parse new message format
    const messageType = message.message.type;
    const senderPhone = message.from; // Sender's phone number (e.g., "385912395365")
    const recipientPhone = message.to; // Our WhatsApp number (e.g., "385916376631")
    const messageId = message.messageId;
    const contactName = message.contact?.name || 'Unknown';
    
    // Validate required fields
    if (!senderPhone || !messageType || !messageId) {
      console.log(`   ⏭️  Skipping message with missing required fields`);
      return;
    }
    
    console.log(`\n📱 Message received:`);
    console.log(`   From: ${senderPhone} (${contactName})`);
    console.log(`   To: ${recipientPhone}`);
    console.log(`   Type: ${messageType}`);
    console.log(`   Message ID: ${messageId}`);

    // Extract message content based on type
    let messageContent = '';
    
    switch (messageType) {
      case 'TEXT':
        messageContent = message.message.text || '';
        console.log(`   Content: ${messageContent}`);
        break;
      case 'IMAGE':
        messageContent = '[Image received]';
        if (message.message.url) {
          console.log(`   Image URL: ${message.message.url}`);
        }
        break;
      case 'DOCUMENT':
        messageContent = '[Document received]';
        if (message.message.url) {
          console.log(`   Document URL: ${message.message.url}`);
        }
        break;
      case 'AUDIO':
        messageContent = '[Audio received]';
        if (message.message.url) {
          console.log(`   Audio URL: ${message.message.url}`);
        }
        break;
      case 'VIDEO':
        messageContent = '[Video received]';
        if (message.message.url) {
          console.log(`   Video URL: ${message.message.url}`);
        }
        break;
      case 'LOCATION':
        messageContent = '[Location received]';
        if (message.message.latitude && message.message.longitude) {
          console.log(`   Location: ${message.message.latitude}, ${message.message.longitude}`);
        }
        break;
      case 'CONTACT':
        messageContent = '[Contact received]';
        break;
      case 'BUTTON':
        messageContent = message.message.text || message.message.payload || '';
        console.log(`   Button: ${messageContent}`);
        break;
      case 'LIST':
        messageContent = message.message.title || message.message.description || '';
        console.log(`   List reply: ${messageContent}`);
        break;
      default:
        messageContent = '[Unsupported message type]';
        console.log(`   Unsupported type: ${messageType}`);
    }

    // Handle VIDEO messages — goal yelling detection
    if (messageType === 'VIDEO') {
      const videoUrl = message.message.url;
      if (!videoUrl) {
        console.log(`   ⚠️  Video message has no URL, skipping`);
        return;
      }

      // Send immediate feedback
      await infobipService.sendTextMessage(senderPhone, 'Listening to you yelling... ⚽🎧');

      // Process video asynchronously
      try {
        const result = await videoProcessor.processGoalVideo(videoUrl);
        await infobipService.sendTextMessage(senderPhone, result.message);
      } catch (error) {
        console.error('❌ Video processing failed:', error);
        await infobipService.sendTextMessage(senderPhone, "Sorry, we couldn't process your video. Please try sending it again.");
      }
      return;
    }

    // Only process TEXT messages for other types
    if (messageType !== 'TEXT' || !messageContent.trim()) {
      console.log(`   ⏭️  Skipping non-text message or empty content`);
      return;
    }

    // Generate AI response using OpenAI GPT-4
    const response = await messageHandler.handleMessage({
      from: senderPhone,
      content: messageContent,
      type: messageType,
      messageId: messageId,
      rawMessage: message
    });

    // Send response back via Infobip
    if (response) {
      await infobipService.sendTextMessage(senderPhone, response);
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

// Catch-all route for unmatched requests (404)
app.use((req, res) => {
  console.log(`\n❌ ❌ ❌ 404 - ROUTE NOT FOUND ❌ ❌ ❌`);
  console.log(`   Method: ${req.method}`);
  console.log(`   Path: ${req.path}`);
  console.log(`   URL: ${req.url}`);
  console.log(`   Original URL: ${req.originalUrl}`);
  console.log(`   Headers:`, JSON.stringify(req.headers, null, 2));
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`   Body:`, JSON.stringify(req.body, null, 2));
  }
  console.log(`\n💡 Available routes:`);
  console.log(`   POST /webhook/whatsapp/inbound (for inbound messages)`);
  console.log(`   POST /webhook/delivery (for delivery reports)`);
  console.log(`   POST /webhook/seen (for seen reports)`);
  console.log(`   GET /health (health check)`);
  console.log(`${'='.repeat(80)}\n`);
  
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    availableRoutes: [
      'POST /webhook/whatsapp/inbound',
      'POST /webhook/delivery',
      'POST /webhook/seen',
      'GET /health'
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 WhatsApp Webhook Server running on port ${PORT}`);
  console.log(`📍 Inbound Messages: http://localhost:${PORT}/webhook/whatsapp/inbound`);
  console.log(`📍 Delivery Reports: http://localhost:${PORT}/webhook/delivery`);
  console.log(`📍 Seen Reports: http://localhost:${PORT}/webhook/seen`);
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
