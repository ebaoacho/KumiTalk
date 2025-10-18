import { redirect } from "next/navigation";

export default function Home() {
  // ルートに来たらアカウント登録ページへ
  redirect("/signup");
}
