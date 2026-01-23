const axios = require('axios');

const INFOBIP_API_KEY = process.env.INFOBIP_API_KEY;
const INFOBIP_BASE_URL = process.env.INFOBIP_BASE_URL || 'https://api.infobip.com';
const WHATSAPP_SENDER = process.env.WHATSAPP_SENDER;

// Validate configuration at startup
if (!INFOBIP_API_KEY) {
  console.error('❌ ERROR: INFOBIP_API_KEY is not set in environment variables');
  console.error('   Please set INFOBIP_API_KEY in your .env file or environment');
  console.error('   Example: INFOBIP_API_KEY=your_api_key_here');
}

if (!WHATSAPP_SENDER) {
  console.warn('⚠️  WARNING: WHATSAPP_SENDER is not set in environment variables');
  console.warn('   This is required for sending WhatsApp messages');
}

class InfobipService {
  constructor() {
    // Validate API key before creating client
    if (!INFOBIP_API_KEY) {
      throw new Error('INFOBIP_API_KEY is required but not configured. Please set it in your .env file.');
    }

    // Validate API key format (Infobip API keys are typically long alphanumeric strings)
    if (INFOBIP_API_KEY.length < 20) {
      console.warn('⚠️  WARNING: INFOBIP_API_KEY seems unusually short. Please verify it is correct.');
    }

    this.client = axios.create({
      baseURL: INFOBIP_BASE_URL,
      headers: {
        'Authorization': `App ${INFOBIP_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    console.log('✅ InfobipService initialized');
    console.log(`   Base URL: ${INFOBIP_BASE_URL}`);
    console.log(`   API Key: ${INFOBIP_API_KEY ? `${INFOBIP_API_KEY.substring(0, 10)}...${INFOBIP_API_KEY.substring(INFOBIP_API_KEY.length - 4)}` : 'NOT SET'}`);
    console.log(`   WhatsApp Sender: ${WHATSAPP_SENDER || 'NOT SET'}`);
  }

  /**
   * Send a text message via WhatsApp
   * Matches the Infobip API format: https://www.infobip.com/docs/api#channels/whatsapp/send-whatsapp-text-message
   * 
   * @param {string} to - Recipient phone number (e.g., "385912395365" or "+385912395365")
   * @param {string} text - Message text content
   * @param {Object} options - Optional parameters
   * @param {string} options.messageId - Custom message ID (auto-generated if not provided)
   * @param {string} options.callbackData - Callback data for delivery reports
   * @param {string} options.notifyUrl - URL for delivery notifications
   * @returns {Promise<Object>} - API response
   */
  async sendTextMessage(to, text, options = {}) {
    try {
      // Generate message ID if not provided
      const messageId = options.messageId || this.generateMessageId();
      
      // Format phone number (ensure it has + prefix for international format)
      const formattedTo = this.formatPhoneNumber(to);
      
      const payload = {
        from: WHATSAPP_SENDER,
        to: formattedTo,
        messageId: messageId,
        content: {
          text: text
        }
      };

      // Add optional fields if provided
      if (options.callbackData) {
        payload.callbackData = options.callbackData;
      }

      if (options.notifyUrl) {
        payload.notifyUrl = options.notifyUrl;
      }

      if (options.urlOptions) {
        payload.urlOptions = options.urlOptions;
      }

      console.log(`\n📤 Sending message to ${formattedTo}...`);
      console.log(`   Message ID: ${messageId}`);
      
      const response = await this.client.post(
        '/whatsapp/1/message/text',
        payload
      );

      console.log(`✅ Message sent! ID: ${response.data.messageId || messageId}`);
      console.log(`   Status: ${response.data.status?.name || 'Unknown'}`);
      
      return response.data;

    } catch (error) {
      // Enhanced error handling for authentication issues
      if (error.response?.status === 401) {
        console.error('❌ Authentication Error (401 Unauthorized)');
        console.error('   The Infobip API key is invalid, expired, or does not have the required permissions.');
        console.error('   Please check:');
        console.error('   1. INFOBIP_API_KEY is correct in your .env file or environment variables');
        console.error('   2. The API key has not expired');
        console.error('   3. The API key has WhatsApp API permissions enabled');
        console.error('   4. You are using the correct API key for your Infobip account');
        if (error.response?.data) {
          console.error('   API Response:', JSON.stringify(error.response.data, null, 2));
        }
      } else {
        console.error('❌ Error sending message:', error.response?.data || error.message);
        if (error.response?.data) {
          console.error('   Details:', JSON.stringify(error.response.data, null, 2));
        }
      }
      throw error;
    }
  }

  /**
   * Generate a unique message ID
   * @returns {string} - UUID-like message ID
   */
  generateMessageId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Format phone number for Infobip API
   * Ensures proper international format
   * @param {string} phone - Phone number (with or without +)
   * @returns {string} - Formatted phone number
   */
  formatPhoneNumber(phone) {
    // Remove any whitespace
    let formatted = phone.trim();
    
    // If it doesn't start with +, add it (assuming international format)
    // Note: Infobip may accept numbers with or without +, but + is standard
    if (!formatted.startsWith('+')) {
      formatted = `+${formatted}`;
    }
    
    return formatted;
  }

  /**
   * Send an image message via WhatsApp
   */
  async sendImageMessage(to, mediaUrl, caption = '') {
    try {
      const payload = {
        from: WHATSAPP_SENDER,
        to: to,
        content: {
          mediaUrl: mediaUrl,
          caption: caption
        }
      };

      const response = await this.client.post(
        '/whatsapp/1/message/image',
        payload
      );

      console.log(`✅ Image sent! ID: ${response.data.messageId}`);
      return response.data;

    } catch (error) {
      console.error('❌ Error sending image:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Send a document message via WhatsApp
   */
  async sendDocumentMessage(to, mediaUrl, filename) {
    try {
      const payload = {
        from: WHATSAPP_SENDER,
        to: to,
        content: {
          mediaUrl: mediaUrl,
          filename: filename
        }
      };

      const response = await this.client.post(
        '/whatsapp/1/message/document',
        payload
      );

      console.log(`✅ Document sent! ID: ${response.data.messageId}`);
      return response.data;

    } catch (error) {
      console.error('❌ Error sending document:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Send a template message via WhatsApp
   */
  async sendTemplateMessage(to, templateName, language, templateData) {
    try {
      const payload = {
        messages: [{
          from: WHATSAPP_SENDER,
          to: to,
          content: {
            templateName: templateName,
            templateData: templateData,
            language: language
          }
        }]
      };

      const response = await this.client.post(
        '/whatsapp/1/message/template',
        payload
      );

      console.log(`✅ Template sent! ID: ${response.data.messages[0].messageId}`);
      return response.data;

    } catch (error) {
      console.error('❌ Error sending template:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Send an interactive button message
   */
  async sendButtonMessage(to, bodyText, buttons, headerText = null, footerText = null) {
    try {
      const content = {
        body: {
          text: bodyText
        },
        action: {
          buttons: buttons.map((btn, index) => ({
            type: 'REPLY',
            id: btn.id || `btn_${index}`,
            title: btn.title
          }))
        }
      };

      if (headerText) {
        content.header = {
          type: 'TEXT',
          text: headerText
        };
      }

      if (footerText) {
        content.footer = {
          text: footerText
        };
      }

      const payload = {
        from: WHATSAPP_SENDER,
        to: to,
        content: content
      };

      const response = await this.client.post(
        '/whatsapp/1/message/interactive/buttons',
        payload
      );

      console.log(`✅ Button message sent! ID: ${response.data.messageId}`);
      return response.data;

    } catch (error) {
      console.error('❌ Error sending button message:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = new InfobipService();
