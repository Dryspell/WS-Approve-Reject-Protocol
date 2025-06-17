import { clientOnly } from "@solidjs/start";

const SpacetimeChat = clientOnly(() => import("~/components/Chat/SpacetimeChat"));

export default function ChatPage() {
  return (
    <main class="mx-auto p-4 text-gray-700">
      <SpacetimeChat />
    </main>
  );
}
