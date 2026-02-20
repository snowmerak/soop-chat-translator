/**
 * OpenAI-compatible API client for translation.
 * Targets the local Snapdragon NPU server at localhost:18181.
 *
 * Request is intentionally minimal — only fields the NPU server actually needs.
 */

interface ChatCompletionRequest {
    model: string;
    messages: Array<{ role: "user"; content: string }>;
    temperature: number;
    top_p: number;
    max_completion_tokens: number;
    stream: false;
    ngl: number;       // NPU layer offload count (999 = all)
    enable_think: false; // Qwen3 thinking mode — disabled for speed
}

interface ChatCompletionResponse {
    choices: Array<{
        message: { content: string };
    }>;
}

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
                {
                    role: "user",
                    content: `Translate this chat message to ${targetLang}. Output only the translation, nothing else:\n${text}`,
                },
            ],
            temperature: 0.3,
            top_p: 0.95,
            max_completion_tokens: 128,
            stream: false,
            ngl: 999,
            enable_think: false,
        };

        const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            throw new Error(`API ${response.status}: ${response.statusText}`);
        }

        const data: ChatCompletionResponse = await response.json();
        const content = data.choices?.[0]?.message?.content?.trim();

        if (!content) throw new Error("Empty response from API");

        return content;
    }
}
