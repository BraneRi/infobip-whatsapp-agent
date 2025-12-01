# Testing Guide

## Quick Start

### 1. Start the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

You should see:
```
🚀 WhatsApp Webhook Server running on port 3000
📍 Webhook URL: http://localhost:3000/webhook/whatsapp
🏥 Health check: http://localhost:3000/health
```

### 2. Verify Environment Variables

Make sure your `.env` file has:
```env
OPENAI_API_KEY=sk-...
INFOBIP_API_KEY=your_key
WHATSAPP_SENDER=447860088970
PORT=3000
```

## Testing Methods

### Method 1: Health Check (Quick Test)

Test if the server is running:
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-...",
  "service": "WhatsApp Webhook"
}
```

### Method 2: Simulate WhatsApp Message (Test OpenAI Integration)

Test the bot locally without WhatsApp:

```bash
curl -X POST http://localhost:3000/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "results": [{
      "from": "385912395365",
      "messageId": "test-123",
      "message": {
        "type": "TEXT",
        "text": "Hello, I need help with my lease"
      }
    }]
  }'
```

The bot should:
1. Receive the message
2. Call OpenAI API
3. Generate a lease agent response
4. Log the response (it won't actually send via WhatsApp in this test)

**Watch the console** for:
- `📱 Message received from: ...`
- `🤖 Calling OpenAI gpt-4...`
- `✅ OpenAI response generated`

### Method 3: Test Script

Use the provided test script:
```bash
node test-local.js
```

This will simulate a conversation and show you the bot's responses.

### Method 4: Test with Actual WhatsApp (Full Integration)

#### Step 1: Expose Your Local Server

Install and run ngrok:
```bash
# Install ngrok: https://ngrok.com/download
ngrok http 3000
```

You'll get a public URL like: `https://abc123.ngrok.io`

#### Step 2: Configure Infobip Webhook

1. Log into your Infobip account
2. Go to **Channels & Numbers** → **WhatsApp**
3. Select your sender number
4. Set webhook URL to: `https://your-ngrok-url.ngrok.io/webhook/whatsapp`

#### Step 3: Send a WhatsApp Message

Send a message to your WhatsApp sender number from your phone. The bot will:
1. Receive the message via webhook
2. Process it with OpenAI
3. Send a response back via WhatsApp

## Testing Scenarios

### Test Lease Agent Capabilities

Try these messages:

1. **Greeting:**
   ```
   Hello, I need help with my car lease
   ```

2. **Lease End Notification:**
   ```
   When does my lease end?
   ```

3. **Car Inquiry:**
   ```
   What cars are available for lease?
   ```

4. **Pricing Question:**
   ```
   How much does it cost to lease a BMW?
   ```

5. **Follow-up (tests conversation memory):**
   ```
   What about a 36-month lease?
   ```

## Troubleshooting

### Server Won't Start

**Check if port is in use:**
```bash
lsof -i :3000
```

**Change port in `.env`:**
```env
PORT=3001
```

### OpenAI Not Responding

**Check API key:**
```bash
# Verify .env file has the key
cat .env | grep OPENAI_API_KEY
```

**Test API key directly:**
```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### No Response from Bot

1. Check server logs for errors
2. Verify OpenAI API key is valid
3. Check if you have OpenAI API credits
4. Look for rate limit errors in console

### Webhook Not Receiving Messages

1. Verify ngrok is running and URL is accessible
2. Check webhook URL in Infobip dashboard
3. Test webhook URL manually with curl
4. Check server logs for incoming requests

## Debug Mode

Enable verbose logging by setting:
```env
NODE_ENV=development
```

This will show detailed logs of:
- Incoming messages
- OpenAI API calls
- Conversation state
- Errors

## Expected Console Output

When a message is received, you should see:
```
📨 Incoming webhook: {...}
📱 Message received from: 385912395365
   Type: TEXT
   Content: Hello, I need help with my lease

🤖 Calling OpenAI gpt-4...
✅ OpenAI response generated (150 tokens)

📤 Sending message to 385912395365...
✅ Message sent! ID: abc123
```

