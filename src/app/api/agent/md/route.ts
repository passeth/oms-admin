import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { salesTool, inventoryTool, promoHistoryTool, memorySaveTool } from '@/lib/ai/tools';

export const maxDuration = 60; // Allow 60 seconds for reasoning loop

export async function POST(req: Request) {
    const { messages } = await req.json();

    const result = streamText({
        model: openai('gpt-4o'), // Main Orchestrator
        system: `
      You are the "Virtual Chief Merchant" (MD Agent) for a Beauty E-commerce Brand.
      Your goal is to maximize Profit and Revenue.
      
      You have access to REAL-TIME data via tools. 
      NEVER guess. ALWAYS use tools to verify facts before answering.
      
      **Workflow**:
      1. Understand the User's Goal.
      2. Formulate a Hypothesis.
      3. **INVESTIGATE** using tools (Check Sales -> Check Stock -> Check Past Promos).
      4. Synthesize findings into a Strategy.
      
      **Tone**: Professional, Analytical, Data-Driven, but Action-Oriented.
      **Output Format**:
      - Summary of Situation
      - Key Data Points (Evidence)
      - Proposed Action Plan
    `,
        messages,
        tools: {
            analyzeSales: salesTool,
            checkInventory: inventoryTool,
            searchPromotions: promoHistoryTool,
            saveInsight: memorySaveTool,
        },
        maxSteps: 10, // Allow multi-step reasoning
    });

    return result.toDataStreamResponse();
}
