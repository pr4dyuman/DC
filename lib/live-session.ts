// Server-side module — imported by actions.ts (which has "use server")
// NOT a server action itself — holds in-memory state (sessions Map)

import { GoogleGenAI, Modality } from "@google/genai";
import type { LiveServerMessage, Session } from "@google/genai";

// =============================================================================
// PERSISTENT LIVE API SESSION MANAGER
// Keeps WebSocket alive while user has chat open.
// On reconnect, re-sends full context (system instruction + history).
// Auto-disconnects after 5 minutes of idle.
//
// CRITICAL: In multi-turn persistent sessions, the model's thought text becomes
// INTERNAL REASONING (e.g. "I acknowledge the greeting..."), not the response.
// The actual spoken response comes via outputAudioTranscription.
// We prioritize: transcript > cleaned thought text
// =============================================================================

interface LiveSession {
    session: Session;
    messageQueue: LiveServerMessage[];
    apiKey: string;
    modelId: string;
    systemInstruction: string;
    history: Array<{ role: 'user' | 'model'; content: string }>;
    idleTimer: ReturnType<typeof setTimeout> | null;
    connected: boolean;
    initialized: boolean;
    initDraining: boolean; // Whether init response is still being drained in background
}

const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const sessions = new Map<string, LiveSession>();

function generateSessionId(): string {
    return `live-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Clean thinking headers from thought text (fallback only).
 */
function cleanThoughtText(text: string): string {
    return text
        .replace(/\*\*[A-Z][^*]*\*\*\s*\n\n/g, '')
        .trim();
}

/**
 * Wait for next message from the session queue (polling).
 */
function waitMessage(liveSession: LiveSession): Promise<LiveServerMessage> {
    return new Promise((resolve) => {
        const check = () => {
            const msg = liveSession.messageQueue.shift();
            if (msg) resolve(msg);
            else setTimeout(check, 100);
        };
        check();
    });
}

/**
 * Collect response until turnComplete.
 * Captures BOTH transcript (priority) and thought text (fallback).
 * In multi-turn sessions, transcript = actual spoken answer,
 * thought text = internal reasoning (not useful to show).
 */
async function collectResponse(liveSession: LiveSession): Promise<string> {
    let transcriptText = '';
    let thoughtText = '';
    let done = false;

    const timeout = setTimeout(() => {
        console.error('[Live Session] Response timeout after 60s');
        done = true;
    }, 60000);

    while (!done) {
        const message = await waitMessage(liveSession);

        // Collect audio transcript (the ACTUAL spoken response)
        if ((message.serverContent as any)?.outputTranscription?.text) {
            transcriptText += (message.serverContent as any).outputTranscription.text;
        }

        // Collect thought text as fallback
        if (message.serverContent?.modelTurn?.parts) {
            for (const part of message.serverContent.modelTurn.parts) {
                if (part.text) {
                    thoughtText += part.text;
                }
            }
        }

        if (message.serverContent?.turnComplete) {
            done = true;
        }
    }

    clearTimeout(timeout);

    // Drain late transcript chunks (can arrive after turnComplete)
    const drainEnd = Date.now() + 2000;
    while (Date.now() < drainEnd) {
        const remaining = liveSession.messageQueue.shift();
        if (!remaining) {
            await new Promise(r => setTimeout(r, 100));
            continue;
        }
        if ((remaining.serverContent as any)?.outputTranscription?.text) {
            transcriptText += (remaining.serverContent as any).outputTranscription.text;
        }
    }

    console.log(`[Live Session] Transcript: ${transcriptText.length} chars, Thought: ${thoughtText.length} chars`);

    // Priority: transcript > cleaned thought
    if (transcriptText.trim()) {
        return transcriptText.trim();
    }

    // Fallback to cleaned thought text
    const cleaned = cleanThoughtText(thoughtText);
    return cleaned || thoughtText.trim();
}

/**
 * Drain the init response in the background (discard it).
 * Called after sending system instruction to avoid blocking session creation.
 */
async function drainInitResponse(liveSession: LiveSession, sessionId: string): Promise<void> {
    try {
        await collectResponse(liveSession);
    } catch (e) {
        console.error(`[Live Session] ${sessionId} init drain error:`, e);
    }
}

/**
 * Reset the idle timer. Called after every message send.
 */
function resetIdleTimer(sessionId: string) {
    const s = sessions.get(sessionId);
    if (!s) return;

    if (s.idleTimer) clearTimeout(s.idleTimer);
    s.idleTimer = setTimeout(() => {
        console.log(`[Live Session] ${sessionId} idle timeout, disconnecting`);
        closeSession(sessionId);
    }, IDLE_TIMEOUT_MS);
}

/**
 * Connect (or reconnect) the SDK session.
 * Uses outputAudioTranscription to capture actual spoken response.
 * System instruction is sent as first user message (not in config).
 * On reconnect, re-sends system instruction + full history.
 */
async function connectSession(sessionId: string): Promise<void> {
    const s = sessions.get(sessionId);
    if (!s) throw new Error('Session not found');

    const ai = new GoogleGenAI({ apiKey: s.apiKey });
    s.messageQueue = []; // Clear stale messages

    console.log(`[Live Session] ${sessionId} connecting...`);
    const session = await ai.live.connect({
        model: `models/${s.modelId}`,
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Zephyr' }
                }
            },
            // CRITICAL: captures what the model SPEAKS (the actual response)
            outputAudioTranscription: {},
        } as any,
        callbacks: {
            onopen: () => {
                console.log(`[Live Session] ${sessionId} connected`);
                s.connected = true;
            },
            onmessage: (message: LiveServerMessage) => s.messageQueue.push(message),
            onerror: (e: any) => {
                console.error(`[Live Session] ${sessionId} error:`, e?.message || e);
                s.connected = false;
            },
            onclose: (e: any) => {
                console.log(`[Live Session] ${sessionId} closed:`, e?.reason || '');
                s.connected = false;
            },
        },
    });

    s.session = session;
    s.connected = true;
    s.initialized = false;

    // Send system instruction as first message
    let initPrompt = s.systemInstruction;

    if (s.history.length > 0) {
        console.log(`[Live Session] ${sessionId} reconnecting with ${s.history.length} history items`);
        const historyText = s.history
            .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
            .join('\n\n');
        initPrompt += '\n\n---\n\nConversation so far:\n\n' + historyText;
        initPrompt += '\n\nPlease continue from where we left off. Wait for the user\'s next message.';
    }

    session.sendClientContent({ turns: [initPrompt] });

    // DON'T wait for the model's init response — let it process in background.
    // This makes session creation instant (~2-3s for WebSocket only).
    // The init response will be drained before the first user message.
    s.initDraining = true;
    drainInitResponse(s, sessionId).then(() => {
        s.initDraining = false;
        s.initialized = true;
        console.log(`[Live Session] ${sessionId} init response drained (background)`);
    });

    resetIdleTimer(sessionId);
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Create a new persistent Live API session.
 */
export async function createSession(
    apiKey: string,
    modelId: string,
    systemInstruction: string
): Promise<string> {
    const sessionId = generateSessionId();

    const liveSession: LiveSession = {
        session: null as any,
        messageQueue: [],
        apiKey,
        modelId,
        systemInstruction,
        history: [],
        idleTimer: null,
        connected: false,
        initialized: false,
        initDraining: false,
    };

    sessions.set(sessionId, liveSession);
    await connectSession(sessionId);

    console.log(`[Live Session] Created: ${sessionId}`);
    return sessionId;
}

/**
 * Send a message to an existing session and get the response.
 * Auto-reconnects if disconnected.
 */
export async function sendMessage(
    sessionId: string,
    userMessage: string
): Promise<string> {
    const s = sessions.get(sessionId);
    if (!s) throw new Error('Session not found. Create a new session.');

    // Auto-reconnect if disconnected
    if (!s.connected) {
        console.log(`[Live Session] ${sessionId} reconnecting...`);
        await connectSession(sessionId);
    }

    // Wait for init drain to finish before sending user message
    if (s.initDraining) {
        console.log(`[Live Session] ${sessionId} waiting for init drain...`);
        while (s.initDraining) {
            await new Promise(r => setTimeout(r, 200));
        }
        console.log(`[Live Session] ${sessionId} init drain complete, proceeding`);
    }

    resetIdleTimer(sessionId);

    console.log(`[Live Session] ${sessionId} sending message (${userMessage.length} chars)`);
    s.session.sendClientContent({ turns: [userMessage] });

    // Collect response — prioritizes transcript over thought
    const response = await collectResponse(s);

    // Store in history for potential reconnect
    s.history.push({ role: 'user', content: userMessage });
    s.history.push({ role: 'model', content: response });

    console.log(`[Live Session] ${sessionId} response: ${response.length} chars`);
    return response;
}

/**
 * Close a session and clean up resources.
 */
export function closeSession(sessionId: string): void {
    const s = sessions.get(sessionId);
    if (!s) return;

    if (s.idleTimer) clearTimeout(s.idleTimer);

    try {
        s.session?.close();
    } catch (e) {
        // Ignore close errors
    }

    sessions.delete(sessionId);
    console.log(`[Live Session] ${sessionId} closed and cleaned up`);
}

/**
 * Check if a session exists and is valid.
 */
export function isSessionActive(sessionId: string): boolean {
    return sessions.has(sessionId);
}
