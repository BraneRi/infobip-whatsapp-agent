const OpenAI = require('openai');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

class OpenAIService {
  constructor() {
    if (!OPENAI_API_KEY) {
      console.warn('⚠️  OPENAI_API_KEY not found in environment variables');
    }
    
    this.client = new OpenAI({
      apiKey: OPENAI_API_KEY
    });
    
    // Lease agent system prompt
    this.systemPrompt = `You are a professional car lease agent assistant. Your role is to help customers with their vehicle leasing needs.

IMPORTANT COMMUNICATION RULES:
- Answer questions directly and concisely
- Do NOT greet the user unless this is the very first message in the conversation
- If there's conversation history, skip greetings and go straight to answering
- Be professional but not overly formal
- Keep responses focused on the user's question

Key responsibilities:
- Notify customers when their lease period is ending
- Provide information about available vehicles for lease
- Discuss lease terms, pricing, and options
- Answer questions about lease agreements
- Help customers understand lease terms and conditions
- Assist with lease renewals and extensions

You can discuss:
- Various car models and makes (you can create realistic examples)
- Lease pricing (monthly payments, down payments, etc.)
- Lease terms (12, 24, 36, 48 months)
- Mileage limits and options
- Lease-end options (return, buyout, extend)
- Available inventory (you can imagine realistic car listings)

When discussing pricing and cars, use realistic but varied examples. Be creative but professional.

Keep responses conversational and appropriate for WhatsApp messaging - be concise, direct, and helpful. Answer the question asked, don't add unnecessary greetings or pleasantries.`;

    // Default model - using GPT-4, but can fall back to GPT-3.5-turbo if needed
    this.model = process.env.OPENAI_MODEL || 'gpt-4';
  }

  /**
   * Generate a response using OpenAI GPT-4
   * 
   * @param {string} userMessage - The user's message
   * @param {Array} conversationHistory - Previous messages in the conversation
   * @returns {Promise<string>} - The AI-generated response
   */
  async generateResponse(userMessage, conversationHistory = []) {
    try {
      if (!OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is not configured. Please add it to your .env file.');
      }

      // Determine if this is a new conversation or continuing
      const isNewConversation = conversationHistory.length === 0;
      
      // Build system prompt with context about conversation state
      let systemPrompt = this.systemPrompt;
      if (!isNewConversation) {
        systemPrompt += '\n\nNOTE: This is a CONTINUING conversation. The user has already been greeted. Answer their question directly without greetings.';
      }

      // Build messages array with system prompt and conversation history
      const messages = [
        {
          role: 'system',
          content: systemPrompt
        },
        ...conversationHistory,
        {
          role: 'user',
          content: userMessage
        }
      ];

      console.log(`\n🤖 Calling OpenAI ${this.model}...`);
      
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: messages,
        temperature: 0.7, // Balanced creativity
        max_tokens: 500, // Reasonable length for WhatsApp
      });

      const response = completion.choices[0]?.message?.content;
      
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      console.log(`✅ OpenAI response generated (${completion.usage?.total_tokens || 'unknown'} tokens)`);
      
      return response.trim();

    } catch (error) {
      console.error('❌ OpenAI API error:', error.message);
      
      // Provide helpful error messages
      if (error.message.includes('API key')) {
        throw new Error('OpenAI API key is invalid or missing. Please check your .env file.');
      }
      
      if (error.message.includes('rate limit')) {
        throw new Error('OpenAI API rate limit exceeded. Please try again in a moment.');
      }
      
      throw error;
    }
  }

  /**
   * Format conversation history for OpenAI API
   * Converts internal format to OpenAI message format
   * 
   * @param {Array} history - Conversation history in internal format
   * @returns {Array} - Formatted messages for OpenAI
   */
  formatConversationHistory(history) {
    if (!Array.isArray(history) || history.length === 0) {
      return [];
    }

    return history.map(msg => ({
      role: msg.role || 'user',
      content: msg.content || msg.text || ''
    })).filter(msg => msg.content.trim().length > 0);
  }
}

module.exports = new OpenAIService();

