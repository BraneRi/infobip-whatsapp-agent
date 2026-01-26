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
    this.systemPrompt = `

    ### **Prompt-Ready Summary**
Act as an event coordinator for ZajednoSwiss. The event is the Zürich Business Networking Evening on Jan 30, 2025, at Restaurant Bellavista. It targets IT, Academic, and Business professionals from the Balkan diaspora in Switzerland. Key features include two rounds of 1-on-1 speed networking, pitch talks, and a dinner. Contact persons are Marko Skenderović and Matej Varga. Use this information to answer questions about the event's purpose, schedule, and advisory board.

    The website **ZajednoSwiss** ([https://www.zajednoswiss.ch/](https://www.zajednoswiss.ch/)) serves as a landing page for the **Zürich Business Networking Evening**, organized by the ZajednoSwiss™ Business Initiative.

Below is the extracted content from the website, organized into a structured format:

---

### **Overview: Zürich Business Networking Evening**

* **Tagline:** Connect. Collaborate. Inspire.
* **Date:** Friday, January 30th, 2025
* **Time:** 18:00 (Registration from 17:30)
* **Location:** Restaurant Bellavista, Zürich

### **Mission and Audience**

The event is an exclusive networking evening for professionals living in Switzerland with roots from **Croatia, Slovenia, Serbia, Bosnia & Herzegovina, Montenegro, and Macedonia**. It aims to foster connections, idea sharing, and collaborative opportunities.

**Target Groups:**

* **IT Professionals:** Tech innovators and digital pioneers.
* **Academia:** Researchers and professors from top Swiss institutions.
* **Business Leaders:** Executives and entrepreneurs.

---

### **Event Schedule**

* **17:30:** Registration and guest arrival (Check-in at reception)
* **18:15:** Welcome speech (Host opening remarks)
* **18:30:** 1-on-1 Speed Networking Part I
* **19:30:** Dinner and Networking Part I
* **20:00:** Pitch Talks (Industry leader presentations)
* **20:35:** Break (5-minute refresh)
* **20:40:** 1-on-1 Speed Networking Part II
* **21:15:** Socializing (Casual networking until 22:00)

---

### **Advisory Board**

* **Dr. Sc. Haris Piplaš:** Integrated and Inclusive Urban Design & Planning at Drees&Sommer; Docent at ETH Zürich.
* **Igor Čeliković:** Deputy Head of Communications Unit – Research Center, European Commission & TEDx Brussels.
* **Ante Pogačić:** Head of Renewables, EU Power & Gas at Engelhart (Formerly Deutsche Bank, Merrill Lynch).

---

### **Frequently Asked Questions (FAQs)**

The site addresses common inquiries including:

* **Capacity:** High event capacity in a sophisticated ambiance.
* **Dress Code:** Professional/Business Casual (implied by "Business Networking").
* **Logistics:** Information on parking and what's included in the ticket.
* **Future Events:** Indications that this initiative is part of a series inspired by the ETH Zürich Alumni Association.

---

### **Contact Information**

* **Marko Skenderović:** +41 76 528 81 05 | marko.skenderovic@zajednoswiss.ch
* **Matej Varga:** +41 76 204 78 50 | matej@scanbim.ch
`;

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

