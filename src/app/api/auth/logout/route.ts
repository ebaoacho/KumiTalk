import { NextResponse } from "next/server";
import { clearSession } from "../../../../lib/auth";

export async function POST() {
  try {
    await clearSession();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("/api/auth/logout", error);
    return NextResponse.json(
      { message: "ログアウトに失敗しました" },
      { status: 500 },
    );
  }
}
