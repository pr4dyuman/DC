import { NextResponse } from "next/server";

/**
 * DEBUG ENDPOINT: Check current session
 * Temporarily disabled - use browser console to debug
 */
export async function GET() {
  return NextResponse.json({
    hasSession: null,
    message: "Debug endpoint temporarily disabled"
  });
}

