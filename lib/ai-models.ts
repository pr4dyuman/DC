import { AIProvider } from "./types";

// Available models per provider — used by both server actions and client UI
export const AI_MODELS: Record<AIProvider, { id: string; name: string }[]> = {
    gemini: [
        { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
        { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
        { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash-Lite (Free Tier)" },
        { id: "gemini-2.5-flash-native-audio-preview-12-2025", name: "Gemini Live (Unlimited Free)" },
        { id: "gemini-3.1-flash-lite-preview", name: "Gemini 3.1 Flash-Lite Preview" },
        { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash" },
        { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro" },
        { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash" },
        { id: "custom", name: "Custom Model" },
    ],
    openai: [
        { id: "gpt-4o", name: "GPT-4o" },
        { id: "gpt-4o-mini", name: "GPT-4o Mini" },
        { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
        { id: "o3", name: "o3" },
        { id: "o4-mini", name: "o4-mini" },
        { id: "custom", name: "Custom Model" },
    ],
    nvidia: [
        { id: "meta/llama-3.3-70b-instruct", name: "Llama 3.3 70B" },
        { id: "mistralai/mistral-large-2-instruct", name: "Mistral Large 2" },
        { id: "nvidia/llama-3.1-nemotron-70b-instruct", name: "Nemotron 70B" },
        { id: "deepseek-ai/deepseek-r1", name: "DeepSeek R1" },
        { id: "custom", name: "Custom Model" },
    ],
    github: [
        { id: "openai/gpt-4o", name: "GPT-4o" },
        { id: "openai/gpt-4o-mini", name: "GPT-4o Mini" },
        { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B" },
        { id: "mistral-ai/mistral-large-2", name: "Mistral Large 2" },
        { id: "deepseek/deepseek-r1", name: "DeepSeek R1" },
        { id: "custom", name: "Custom Model" },
    ],
};

export type ChatMessage = {
    role: "user" | "model";
    content: string;
};
