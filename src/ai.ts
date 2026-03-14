import { createOpenAI } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { z } from 'zod';
import { readFileSync } from "node:fs";
import { join } from "path";
import { ENV } from './config';
import { logger } from "./logger";

const openAiProvider = createOpenAI({ 
    apiKey: ENV.AI_GATEWAY_API_KEY,
    baseURL: ENV.AI_GATEWAY_BASE_URL
});

const PROMPT_TEMPLATE = readFileSync(join(__dirname, 'prompts', 'prompt.txt'), 'utf-8');

const emailAnalysisSchema = z.object({
    status: z.enum(['IMPORTANT', 'REPLY', 'IGNORE']),
    summary: z.string(),
    reply_text: z.string().nullable()
});

export type EmailAnalysisResult = z.infer<typeof emailAnalysisSchema>;

export async function analyzeEmail(subject: string, body: string, sender: string): Promise<EmailAnalysisResult> {
    const prompt = PROMPT_TEMPLATE
        .replaceAll('{{SENDER}}', sender)
        .replaceAll('{{SUBJECT}}', subject)
        .replaceAll('{{BODY}}', body);

    try {
        const { output } = await generateText({
            model: openAiProvider(ENV.AI_MODEL),
            output: Output.object({ schema: emailAnalysisSchema }),
            messages: [{ role: 'user', content: prompt }],
        });

        logger.info({ status: output.status }, 'AI decision received');
        return output;

    } catch (error: any) {
        logger.error({ err: error.message }, 'AI analysis error');
        return {
            status: 'IMPORTANT',
            summary: '[AI ERROR] Could not analyze',
            reply_text: null
        };
    }
}