const axios = require('axios');

const INFOBIP_API_KEY = process.env.INFOBIP_API_KEY;
const INFOBIP_BASE_URL = process.env.INFOBIP_BASE_URL || 'https://api.infobip.com';
const WHATSAPP_SENDER = process.env.WHATSAPP_SENDER;

class InfobipService {
  constructor() {
    this.client = axios.create({
      baseURL: INFOBIP_BASE_URL,
      headers: {
        'Authorization': `App ${INFOBIP_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
  }

  /**
   * Send a text message via WhatsApp
   */
  async sendTextMessage(to, text) {
    try {
      const payload = {
        from: WHATSAPP_SENDER,
        to: to,
        content: {
          text: text
        }
      };

      console.log(`\n📤 Sending message to ${to}...`);
      
      const response = await this.client.post(
        '/whatsapp/1/message/text',
        payload
      );

      console.log(`✅ Message sent! ID: ${response.data.messageId}`);
      return response.data;

    } catch (error) {
      console.error('❌ Error sending message:', error.response?.data || error.message);
      throw error;
    }
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
