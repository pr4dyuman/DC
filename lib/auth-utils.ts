
import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error("Missing JWT_SECRET environment variable");
}
const encodedKey = new TextEncoder().encode(JWT_SECRET);

export type AuthSession = {
    userId: string;
    role: string;
    agencyId?: string;
};

export async function signToken(payload: AuthSession): Promise<string> {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("24h")
        .sign(encodedKey);
}

export async function verifyToken(token: string): Promise<AuthSession | null> {
    try {
        const { payload } = await jwtVerify(token, encodedKey);
        return payload as unknown as AuthSession;
    } catch (e) {
        return null;
    }
}
