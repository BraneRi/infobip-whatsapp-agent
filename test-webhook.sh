#!/bin/bash

# Test script for the new webhook format
# This simulates the exact format that Infobip sends

echo "🧪 Testing WhatsApp Webhook with new format..."
echo ""

curl -X POST http://localhost:3000/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "results": [
      {
        "applicationId": "Infobip-whatsapp-bot-demo",
        "from": "385912395365",
        "to": "385916376631",
        "integrationType": "WHATSAPP",
        "receivedAt": "2025-12-16T13:01:22.000+0000",
        "messageId": "E_mEjo-BVeUu2sBVKsvi8nasBxRHQ_dSZdFaXU_odxosYMwgmlyXjP2tGR2c_JxH_UWfKDlU3FqU8vpvsnfNIvcA",
        "pairedMessageId": null,
        "callbackData": null,
        "message": {
          "text": "Hello, I need help with my lease",
          "type": "TEXT"
        },
        "contact": {
          "name": "Brane"
        },
        "price": {
          "pricePerMessage": 0.0,
          "currency": "EUR"
        }
      }
    ],
    "messageCount": 1,
    "pendingMessageCount": 0
  }'

echo ""
echo ""
echo "✅ Test completed! Check server logs for response."

