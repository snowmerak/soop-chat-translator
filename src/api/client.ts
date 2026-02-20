/**
 * OpenAI-compatible API client for translation.
 * Targets the local Snapdragon NPU server at localhost:18181.
 */

interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

interface ChatCompletionRequest {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
}

interface ChatCompletionResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: Array<{
        index: number;
        message: ChatMessage;
        finish_reason: string;
    }>;
}

const TRANSLATION_SYSTEM_PROMPT = `You are a professional chat message translator. 
Your task is to translate the given chat message into the target language.
Rules:
- Output ONLY the translated text. No explanations, no notes, no quotes.
- Preserve emoticons, emojis, and special symbols as-is.
- Keep usernames and URLs unchanged.
- If the message is already in the target language or is untranslatable (e.g., only symbols), output it as-is.`;

export class TranslatorClient {
    private baseUrl: string;
    private model: string;

    constructor(baseUrl: string, model: string) {
        this.baseUrl = baseUrl.replace(/\/$/, "");
        this.model = model;
    }

    async translate(text: string, targetLang: string): Promise<string> {
        const request: ChatCompletionRequest = {
            model: this.model,
            messages: [
                { role: "system", content: TRANSLATION_SYSTEM_PROMPT },
                {
                    role: "user",
                    content: `Translate the following chat message to ${targetLang}:\n${text}`,
                },
            ],
            temperature: 0.3,
            max_tokens: 256,
            stream: false,
        };

        const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            throw new Error(
                `API request failed: ${response.status} ${response.statusText}`
            );
        }

        const data: ChatCompletionResponse = await response.json();
        const content = data.choices?.[0]?.message?.content?.trim();

        if (!content) {
            throw new Error("Empty response from API");
        }

        return content;
    }
}
