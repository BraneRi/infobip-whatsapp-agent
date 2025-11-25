/**
 * Message Handler
 * 
 * This is where you implement your bot logic.
 * You can integrate Claude API, OpenAI, or any custom business logic here.
 */

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
      // 🤖 PLACEHOLDER: Add your bot logic here
      // Examples:
      // - Call Claude API
      // - Call OpenAI API
      // - Implement rule-based logic
      // - Query database
      // - Call external services

      // Simple echo bot example (replace with your logic)
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
   * Process the message and generate a response
   * 🤖 REPLACE THIS WITH YOUR BOT LOGIC
   */
  async processMessage(content, state) {
    // Example: Simple echo bot
    // Replace this entire function with your logic
    
    const lowerContent = content.toLowerCase();

    // Simple keyword matching example
    if (lowerContent.includes('hello') || lowerContent.includes('hi')) {
      return "Hello! 👋 How can I help you today?";
    }

    if (lowerContent.includes('help')) {
      return "I'm here to assist you! You can ask me questions or tell me what you need.";
    }

    // Default response
    return `You said: "${content}"\n\nThis is a placeholder response. Implement your bot logic in handlers/messageHandler.js`;
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
        context: {}
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
