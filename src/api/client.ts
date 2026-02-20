/**
 * OpenAI-compatible API client for translation.
 * Targets the local Snapdragon NPU server at localhost:18181.
 *
 * Request is intentionally minimal — only fields the NPU server actually needs.
 */

interface ChatCompletionRequest {
    model: string;
    messages: Array<{ role: "system" | "user"; content: string }>;
    temperature: number;
    top_p: number;
    max_completion_tokens: number;
    stream: false;
    ngl: number;       // NPU layer offload count (999 = all)
    enable_think: false; // Qwen3 thinking mode — disabled for speed
    enable_json?: true;  // Tell NPU to output JSON if supported
}

interface ChatCompletionResponse {
    choices: Array<{
        message: { content: string };
    }>;
}

export class TranslatorClient {
    private baseUrl: string;
    private model: string;
    private apiKey?: string;

    constructor(baseUrl: string, model: string, apiKey?: string) {
        this.baseUrl = baseUrl.replace(/\/$/, "");
        this.model = model;
        this.apiKey = apiKey;
    }

    async translate(text: string, targetLang: string, sourceLang?: string): Promise<string> {
        const sourceHint = (sourceLang && sourceLang !== "Auto") ? ` ${sourceLang} ` : " ";
        const request: ChatCompletionRequest = {
            model: this.model,
            messages: [
                {
                    role: "system",
                    content: "You are an expert live chat translator. Translate internet slang and idioms naturally into context."
                },
                {
                    role: "user",
                    content: `Translate this${sourceHint}message to ${targetLang}. Output strictly JSON: {"translation": "..."}\nMessage: ${text}`,
                },
            ],
            temperature: 0.1,
            top_p: 0.95,
            max_completion_tokens: 128,
            stream: false,
            ngl: 999,
            enable_think: false,
            enable_json: true,
        };

        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        };
        if (this.apiKey) {
            headers["Authorization"] = `Bearer ${this.apiKey}`;
        }

        const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
            method: "POST",
            headers,
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            throw new Error(`API ${response.status}: ${response.statusText}`);
        }

        const data: ChatCompletionResponse = await response.json();
        let content = data.choices?.[0]?.message?.content?.trim();

        if (!content) throw new Error("Empty response from API");

        // Try to parse JSON. Sometimes LLMs output markdown codeblocks even when instructed not to.
        try {
            // Strip markdown block if present
            if (content.startsWith("\`\`\`json")) {
                content = content.replace(/^\`\`\`json\s*/, "").replace(/\s*\`\`\`$/, "");
            } else if (content.startsWith("\`\`\`")) {
                content = content.replace(/^\`\`\`\s*/, "").replace(/\s*\`\`\`$/, "");
            }

            const parsed = JSON.parse(content);
            if (parsed.translation) {
                return parsed.translation;
            }
        } catch (e) {
            console.warn("[SOOP Translator] Failed to parse JSON, falling back to raw output:", content);
        }

        // Fallback: If JSON parsing failed, just return the raw string
        return content;
    }
}
