import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { verifyPassword, setSessionUserId } from "../../../../lib/auth";
import { z } from "zod";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = LoginSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
    }

    const { email, password } = parsed.data;

    // (修正) unique でなくても動くように findFirst
    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) {
      return NextResponse.json({ message: "メールまたはパスワードが正しくありません" }, { status: 401 });
    }

    const ok = await verifyPassword(password, user.password);
    if (!ok) {
      return NextResponse.json({ message: "メールまたはパスワードが正しくありません" }, { status: 401 });
    }

    await setSessionUserId(user.id);
    return NextResponse.json({ id: user.id, email: user.email });
  } catch (err) {
    console.error("/api/auth/login", err);
    return NextResponse.json({ message: "ログインに失敗しました" }, { status: 500 });
  }
}
