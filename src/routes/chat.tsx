import { clientOnly } from "@solidjs/start";
const Chat = clientOnly(() => import("~/components/Chat"));

export default function ChatPage() {
  return (
    <main class="mx-auto p-4 text-gray-700">
      <Chat />
    </main>
  );
}
