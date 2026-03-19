import crypto from "crypto";

const AI_ENCRYPT_KEY = process.env.AI_ENCRYPT_KEY;

export function encryptApiKey(plaintext: string): string {
    if (!AI_ENCRYPT_KEY) {
        console.warn("AI_ENCRYPT_KEY not set - API key stored unencrypted");
        return plaintext;
    }

    const key = Buffer.from(AI_ENCRYPT_KEY, "hex");
    if (key.length !== 32) {
        throw new Error("AI_ENCRYPT_KEY must be exactly 32 bytes (64 hex characters)");
    }

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();

    return `enc:${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptApiKey(value: string): string {
    if (!value.startsWith("enc:")) {
        return value;
    }

    if (!AI_ENCRYPT_KEY) {
        throw new Error("AI_ENCRYPT_KEY is required to decrypt API keys. Set it in your environment variables.");
    }

    const key = Buffer.from(AI_ENCRYPT_KEY, "hex");
    const [, ivHex, tagHex, encHex] = value.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const encrypted = Buffer.from(encHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);

    return decipher.update(encrypted).toString("utf8") + decipher.final("utf8");
}
