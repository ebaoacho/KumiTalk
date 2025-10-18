import { ChatInterface } from "@/components/chat/chat-interface"

export default async function ChatPage({ searchParams }: { searchParams: Promise<{ userId: string }> }) {
  const { userId } = await searchParams
  if (!userId) {
    return <div>ログイン後にもう一度お試しください。</div>
  }
  return (
    <main className="h-screen w-full">
      <ChatInterface userId={userId} />
    </main>
  )
}
