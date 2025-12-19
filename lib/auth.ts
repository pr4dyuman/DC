"use server";

import { cookies } from "next/headers";

export async function getSessionId() {
    const cookieStore = await cookies();
    return cookieStore.get("userId")?.value;
}

export async function logout() {
    const cookieStore = await cookies();
    cookieStore.delete("userId");
}
