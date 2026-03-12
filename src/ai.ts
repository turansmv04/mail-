import { OpenRouter } from '@openrouter/sdk';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ENV } from './config';
import { logger } from './logger';

const openrouter = new OpenRouter({
    apiKey: ENV.OPENROUTER_API_KEY
});

const PROMPT_TEMPLATE = readFileSync(
    join(__dirname, 'prompts', 'prompt.txt'),
    'utf-8'
);

const buildPrompt = (subject: string, body: string, sender: string): string =>
    PROMPT_TEMPLATE
        .replace('{{SENDER}}',  sender)
        .replace('{{SUBJECT}}', subject)
        .replace('{{BODY}}',    body.slice(0, 2000));

export interface EmailAnalysisResult {
    status:     'IMPORTANT' | 'REPLY' | 'IGNORE';
    summary:    string;
    reply_text: string | null;
}

export async function analyzeEmail(
    subject: string,
    body:    string,
    sender:  string
): Promise<EmailAnalysisResult> {
    const prompt = buildPrompt(subject, body, sender);

    try {
        const response = await openrouter.chat.send({
            chatGenerationParams: {
                model: 'nvidia/nemotron-3-super-120b-a12b:free',
                messages: [{ role: 'user', content: prompt }]
            }
        });
 
        const aiText = response.choices?.[0]?.message?.content;

        if (!aiText) throw new Error('AI-dan məzmun oxuna bilmədi');

        const jsonMatch = aiText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('AI cavabında JSON tapılmadı');

        const parsed: EmailAnalysisResult = JSON.parse(jsonMatch[0].trim());

        const validStatuses = ['IMPORTANT', 'REPLY', 'IGNORE'] as const;
        if (!validStatuses.includes(parsed.status)) {
            logger.warn({ status: parsed.status }, 'Naməlum status — IMPORTANT təyin edildi');
            parsed.status = 'IMPORTANT';
        }

        logger.info({ status: parsed.status }, 'AI qərari');
        return parsed;

    } catch (error: any) {
        logger.error({ err: error.message }, 'AI analiz xətası');
        return {
            status:     'IMPORTANT',
            summary:    '[AI XƏTAlASI] Analiz edilə bilmədi — manual yoxlanış tələb olunur',
            reply_text: null
        };
    }
}