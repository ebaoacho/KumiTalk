import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { hashPassword, setSessionUserId } from "../../../../lib/auth";
import { z } from "zod";

const SignupSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8, "パスワードは8文字以上にしてください"),
    passwordConfirm: z.string(),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    path: ["passwordConfirm"],
    message: "パスワードが一致しません",
  });

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = SignupSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
    }
    const { email, password } = parsed.data;

    // (修正) email が unique でない前提でも動くように findFirst を使う
    const existing = await prisma.user.findFirst({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { message: "このメールアドレスは既に登録されています" },
        { status: 409 }
      );
    }

    const hashed = await hashPassword(password);
    const user = await prisma.user.create({ data: { email, password: hashed } });

    await setSessionUserId(user.id);

    return NextResponse.json({ id: user.id, email: user.email });
  } catch (err) {
    console.error("/api/auth/signup", err);
    return NextResponse.json({ message: "サインアップに失敗しました" }, { status: 500 });
  }
}
