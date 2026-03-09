import Bytez from 'bytez.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ENV } from './config';
import { logger } from './logger';

const sdk   = new Bytez(ENV.API_KEY);
const model = sdk.model('openai/gpt-4o');

const PROMPT_TEMPLATE = readFileSync(
    join( __dirname, 'prompts', 'prompt.txt'),
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
        const result = await model.run([{ role: 'user', content: prompt }]);

        logger.info('Bytez GPT-4o cavabı gəldi');

        const aiText: string =
            result?.output?.content ??
            (typeof result?.output === 'string' ? result.output : null);
            console.log("xam cavab", aiText)

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