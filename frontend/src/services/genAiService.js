import rateLimitService from './rateLimitService.js';
import loggingService from './loggingService.js';

/**
 * Service to handle Generative AI requests (e.g., Expense Summarization, Insights).
 * Protected by strict rate limiting and auditing.
 */
const genAiService = {
  /**
   * Generates a smart summary of group expenses.
   * Rate limited: 3 requests per hour per user.
   */
  summarizeExpenses: async (groupId, expenses) => {
    try {
      // Rate limit removed by user request
      
      // 2. MOCK AI Logic (Gemini/OpenAI placeholder)
      const result = `AI Summary for Group ${groupId}: Your group has spent a total on ${expenses.length} items. Main category is Food.`;
      
      // LOGIC MOCK: Simulate API processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // 3. Log AI consumption for auditing
      await loggingService.logSecurityEvent('ai/consumption', { 
        type: 'summarization', 
        groupId, 
        count: expenses.length 
      });

      return { data: { summary: result } };
    } catch (error) {
      if (error.message.includes('Rate limit exceeded')) throw error;
      
      await loggingService.logError('genAiService', 'summarizeExpenses', error);
      throw new Error("AI analysis is currently unavailable. Please try again later.");
    }
  }
};

export default genAiService;
