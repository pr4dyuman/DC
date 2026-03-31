import { NextResponse } from "next/server";
import { getCurrentUserImpl } from "@/lib/actions/access";

/**
 * DEBUG ENDPOINT: Check current session
 * Only use during debugging - remove in production
 */
export async function GET() {
  try {
    const user = await getCurrentUserImpl();

    if (!user) {
      return NextResponse.json({
        hasSession: false,
        error: "No session found"
      });
    }

    return NextResponse.json({
      hasSession: true,
      userId: user.id,
      role: user.role,
      agencyId: user.agencyId,
      email: user.email
    });
  } catch (error) {
    return NextResponse.json({
      hasSession: false,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
