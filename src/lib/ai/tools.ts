import { z } from 'zod';
import { tool, generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createClient } from '@/utils/supabase/server';

// Configure xAI Provider
const xai = createOpenAI({
    apiKey: process.env.XAI_API_KEY || '',
    baseURL: 'https://api.x.ai/v1',
});

// 1. Sales Analysis Tool
export const salesTool = tool({
    description: 'Analyze sales trends for a given period and optional keyword. Returns daily revenue and qty.',
    parameters: z.object({
        startDate: z.string().describe('ISO date string (YYYY-MM-DD) for start of period'),
        endDate: z.string().describe('ISO date string (YYYY-MM-DD) for end of period'),
        keyword: z.string().optional().describe('Filter by item name keyword (e.g. "Hand Cream")'),
    }),
    execute: async ({ startDate, endDate, keyword }: { startDate: string, endDate: string, keyword?: string }) => {
        const supabase = await createClient();
        const { data, error } = await supabase.rpc('op_sales_trend', {
            p_start_date: startDate,
            p_end_date: endDate,
            p_keyword: keyword || null,
        });
        if (error) throw new Error(`Sales Tool Error: ${error.message}`);
        return data;
    },
} as any);

// 2. Inventory Check Tool
export const inventoryTool = tool({
    description: 'Check current inventory levels for items matching a keyword.',
    parameters: z.object({
        keyword: z.string().describe('Item name keyword to search (e.g. "Body Wash")'),
    }),
    execute: async ({ keyword }: { keyword: string }) => {
        const supabase = await createClient();
        const { data, error } = await supabase.rpc('op_inventory_check', {
            p_keyword: keyword,
        });
        if (error) throw new Error(`Inventory Tool Error: ${error.message}`);
        return data;
    },
} as any);

// 3. Promotion History Tool
export const promoHistoryTool = tool({
    description: 'Search past promotion performance and reviews.',
    parameters: z.object({
        keyword: z.string().describe('Keyword for promotion name or review content'),
    }),
    execute: async ({ keyword }: { keyword: string }) => {
        const supabase = await createClient();
        const { data, error } = await supabase.rpc('op_promotion_history', {
            p_keyword: keyword,
        });
        if (error) throw new Error(`Promo History Error: ${error.message}`);
        return data;
    },
} as any);

// 4. Memory (Insight) Saver
export const memorySaveTool = tool({
    description: 'Save a verified strategic insight to the long-term memory bank.',
    parameters: z.object({
        content: z.string().describe('The insight text to save'),
        type: z.enum(['FACT', 'EPISODE', 'INSIGHT', 'SOP']).describe('Type of memory'),
        tags: z.array(z.string()).describe('List of tags for retrieval (e.g. ["winter", "lotion"])'),
    }),
    execute: async ({ content, type, tags }: { content: string, type: 'FACT' | 'EPISODE' | 'INSIGHT' | 'SOP', tags: string[] }) => {
        const supabase = await createClient();
        const { error } = await supabase.from('agent_memory_bank').insert({
            content,
            memory_type: type,
            metadata: { tags },
        });

        if (error) throw new Error(`Memory Save Error: ${error.message}`);
        return { success: true };
    },
} as any);

// 5. Trend Scout Tool (xAI Grok)
export const trendScoutTool = tool({
    description: 'Consult the Trend Scout (Grok) for external market intelligence (Viral keywords, Weather, Competitor moves).',
    parameters: z.object({
        query: z.string().describe('Research topic (e.g. "Winter Skincare Trends Korea")'),
    }),
    execute: async ({ query }: { query: string }) => {
        try {
            const { text } = await generateText({
                model: xai('grok-beta'), // Using 'grok-beta' as standard ID for xAI API
                system: 'You are a Trend Scout for a Beauty Brand. Provide concise, high-impact market intelligence.',
                prompt: `Research topic: ${query}`,
            });
            return text;
        } catch (e: any) {
            return `Trend Scout Error: ${e.message}`;
        }
    },
} as any);
