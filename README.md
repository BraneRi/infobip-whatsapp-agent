# WhatsApp Webhook for Infobip

A Node.js backend application to handle WhatsApp messages via Infobip's API.

## Features

- ✅ Receive incoming WhatsApp messages
- ✅ Send text, image, document messages
- ✅ Send template and button messages
- ✅ Conversation state management
- ✅ Delivery and seen reports
- ✅ Health check endpoint
- ✅ Ready for AWS deployment

## Setup

### Prerequisites

- Node.js 16+ installed
- Infobip account with WhatsApp API access
- ngrok or similar tool for local testing (optional)

### Local Installation

1. **Clone/Download the project**

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```

4. **Edit `.env` file with your credentials**
   ```env
   # Infobip Configuration
   INFOBIP_API_KEY=your_actual_api_key
   INFOBIP_BASE_URL=https://api.infobip.com
   WHATSAPP_SENDER=447860088970
   
   # OpenAI Configuration
   OPENAI_API_KEY=your_openai_api_key_here
   OPENAI_MODEL=gpt-4
   
   # Server Configuration
   PORT=3000
   NODE_ENV=development
   ```
   
   **Important:** Get your OpenAI API key from https://platform.openai.com/api-keys

5. **Run the server**
   ```bash
   npm start
   ```
   
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

### Expose Local Server (for testing)

Since Infobip needs to reach your webhook, you need to expose your local server:

**Using ngrok:**
```bash
# Install ngrok: https://ngrok.com/download
ngrok http 3000
```

This will give you a public URL like: `https://abc123.ngrok.io`

### Configure Infobip Webhook

1. Log into your Infobip account
2. Go to **Channels & Numbers** → **WhatsApp**
3. Select your sender number (447860088970)
4. Configure webhooks:
   - **Inbound Messages**: `https://your-domain.com/webhook/whatsapp`
   - **Delivery Reports**: `https://your-domain.com/webhook/delivery` (optional)
   - **Seen Reports**: `https://your-domain.com/webhook/seen` (optional)

## Project Structure

```
whatsapp-webhook/
├── server.js                 # Main Express server
├── services/
│   └── infobipService.js    # Infobip API integration
├── handlers/
│   └── messageHandler.js    # Bot logic (CUSTOMIZE HERE)
├── package.json
├── .env                     # Your environment variables
└── README.md
```

## Bot Configuration

This bot is configured as a **Lease Agent** powered by OpenAI GPT-4. The bot can:

- ✅ Notify customers when lease periods are ending
- ✅ Discuss available vehicles for lease
- ✅ Provide information about pricing and lease terms
- ✅ Answer questions about lease agreements
- ✅ Simulate realistic conversations about cars and leasing

### OpenAI Configuration

The bot uses OpenAI GPT-4 (configurable via `OPENAI_MODEL` in `.env`). The system prompt is configured in `services/openaiService.js` and can be customized to change the bot's personality and capabilities.

### Conversation Memory

The bot maintains conversation history for each user, allowing for context-aware responses. The conversation history is stored in memory (in production, consider using Redis or a database).

### Customizing the Bot

To customize the bot's behavior:

1. **Change the system prompt**: Edit `services/openaiService.js` and modify the `systemPrompt` property
2. **Adjust model settings**: Change `OPENAI_MODEL` in `.env` (options: `gpt-4`, `gpt-4-turbo`, `gpt-3.5-turbo`)
3. **Modify conversation logic**: Edit `handlers/messageHandler.js` to add custom business logic

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/webhook/whatsapp` | POST | Incoming messages |
| `/webhook/delivery` | POST | Delivery reports |
| `/webhook/seen` | POST | Seen reports |

## Testing

### Test Health Check
```bash
curl http://localhost:3000/health
```

### Test Incoming Message (simulate)
```bash
curl -X POST http://localhost:3000/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "results": [{
      "from": "385912395365",
      "messageId": "test-123",
      "message": {
        "type": "TEXT",
        "text": "Hello bot!"
      }
    }]
  }'
```

## AWS Deployment

### Option 1: AWS Elastic Beanstalk

1. **Install EB CLI**
   ```bash
   pip install awsebcli
   ```

2. **Initialize Elastic Beanstalk**
   ```bash
   eb init -p node.js whatsapp-webhook
   ```

3. **Create environment**
   ```bash
   eb create whatsapp-webhook-env
   ```

4. **Set environment variables**
   ```bash
   eb setenv INFOBIP_API_KEY=your_key WHATSAPP_SENDER=447860088970
   ```

5. **Deploy**
   ```bash
   eb deploy
   ```

6. **Get URL**
   ```bash
   eb status
   ```

### Option 2: AWS Lambda + API Gateway

1. **Create a Lambda deployment package**
   ```bash
   zip -r function.zip . -x "*.git*" "node_modules/*"
   ```

2. **Create Lambda function** in AWS Console
   - Runtime: Node.js 18.x
   - Upload your zip file
   - Set environment variables
   - Configure API Gateway trigger

### Option 3: AWS ECS (Docker)

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

Build and deploy to ECS.

## Production Considerations

- [ ] Use Redis or database for conversation state
- [ ] Add authentication/webhook signature verification
- [ ] Implement rate limiting
- [ ] Add logging (Winston, Bunyan)
- [ ] Set up monitoring (CloudWatch, Datadog)
- [ ] Use environment-specific configs
- [ ] Add error tracking (Sentry)
- [ ] Implement retry logic
- [ ] Add request validation
- [ ] Use HTTPS in production

## Troubleshooting

### Messages not arriving
- Check webhook URL is accessible publicly
- Verify webhook is configured in Infobip portal
- Check server logs for errors

### Can't send messages
- Verify INFOBIP_API_KEY is correct
- Check WHATSAPP_SENDER format (no + prefix)
- Ensure 24-hour session window is open

### Server not starting
- Check port 3000 is not in use
- Verify all environment variables are set
- Check Node.js version (16+)

## Support

For Infobip API issues: https://www.infobip.com/docs/whatsapp

## License

ISC
