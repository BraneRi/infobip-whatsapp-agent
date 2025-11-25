/**
 * Message Handler
 * 
 * Lease Agent Bot powered by OpenAI GPT-4
 * Handles conversations about car leasing, pricing, and lease management.
 */

const openaiService = require('../services/openaiService');

class MessageHandler {
  constructor() {
    // Store conversation state (in production, use Redis or database)
    this.conversationState = new Map();
  }

  /**
   * Main handler for incoming messages
   * 
   * @param {Object} message - Incoming message object
   * @param {string} message.from - Sender's phone number
   * @param {string} message.content - Message content/text
   * @param {string} message.type - Message type (TEXT, IMAGE, etc.)
   * @param {string} message.messageId - Unique message ID
   * @param {Object} message.rawMessage - Full raw message from Infobip
   * @returns {string|null} - Response text to send back, or null for no response
   */
  async handleMessage(message) {
    const { from, content, type } = message;

    // Get or initialize conversation state
    const state = this.getConversationState(from);

    try {
      // Generate AI response using OpenAI GPT-4 with lease agent context
      const response = await this.processMessage(content, state);

      // Update conversation state
      this.updateConversationState(from, state);

      return response;

    } catch (error) {
      console.error('Error in message handler:', error);
      return "I'm sorry, I encountered an error processing your message. Please try again.";
    }
  }

  /**
   * Process the message and generate a response using OpenAI GPT-4
   * The bot acts as a lease agent with conversation memory
   */
  async processMessage(content, state) {
    try {
      // Get conversation history for this user
      const conversationHistory = state.conversationHistory || [];
      
      // Format history for OpenAI (keep last 10 messages to avoid token limits)
      const recentHistory = conversationHistory.slice(-10);
      const formattedHistory = openaiService.formatConversationHistory(recentHistory);
      
      // Generate response using OpenAI
      const response = await openaiService.generateResponse(content, formattedHistory);
      
      // Update conversation history
      conversationHistory.push(
        { role: 'user', content: content },
        { role: 'assistant', content: response }
      );
      
      // Keep only last 20 messages to manage memory
      if (conversationHistory.length > 20) {
        state.conversationHistory = conversationHistory.slice(-20);
      } else {
        state.conversationHistory = conversationHistory;
      }
      
      return response;
      
    } catch (error) {
      console.error('Error in processMessage:', error);
      
      // Fallback response if OpenAI fails
      if (error.message.includes('API key') || error.message.includes('OPENAI_API_KEY')) {
        return "I'm sorry, but the AI service is not properly configured. Please contact support.";
      }
      
      return "I'm sorry, I'm having trouble processing your request right now. Please try again in a moment.";
    }
  }

  /**
   * Get conversation state for a user
   */
  getConversationState(from) {
    if (!this.conversationState.has(from)) {
      this.conversationState.set(from, {
        conversationId: Date.now().toString(),
        messageCount: 0,
        lastMessageTime: Date.now(),
        context: {},
        conversationHistory: [] // Store conversation history for OpenAI
      });
    }
    return this.conversationState.get(from);
  }

  /**
   * Update conversation state
   */
  updateConversationState(from, state) {
    state.messageCount++;
    state.lastMessageTime = Date.now();
    this.conversationState.set(from, state);

    // Clean up old conversations (older than 24 hours)
    this.cleanupOldConversations();
  }

  /**
   * Clean up conversations older than 24 hours
   */
  cleanupOldConversations() {
    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
    
    for (const [from, state] of this.conversationState.entries()) {
      if (state.lastMessageTime < twentyFourHoursAgo) {
        this.conversationState.delete(from);
      }
    }
  }

  /**
   * Clear conversation state for a user
   */
  clearConversation(from) {
    this.conversationState.delete(from);
  }
}

module.exports = new MessageHandler();
