import { ChatInterface } from "@/components/chat/chat-interface";

type ChatPageProps = {
  searchParams: { userId?: string };
};

export default function ChatPage({ searchParams }: ChatPageProps) {
  const rawUserId = searchParams.userId;
  const userId = Array.isArray(rawUserId) ? rawUserId[0] ?? "" : rawUserId ?? "";

  if (!userId) {
    return (
      <div className="flex min-h-[60vh] w-full items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-sm text-white/70 shadow-[0_25px_60px_rgba(59,130,246,0.22)]">
        ログイン後にもう一度お試しください。
      </div>
    );
  }

  return (
    <div className="flex w-full flex-1 min-h-[calc(100vh-7rem)]">
      <ChatInterface userId={userId} />
    </div>
  );
}
