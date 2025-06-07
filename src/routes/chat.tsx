import { clientOnly } from "@solidjs/start";
import { createSignal, onMount } from "solid-js";
import { getUser } from "~/routes/api/server";

const Chat = clientOnly(() => import("~/components/Chat/Chat"));

export default function ChatPage() {
  const [user, setUser] = createSignal<{ id: string; name: string } | null>(null);

  onMount(async () => {
    try {
      const userData = await getUser();
      setUser({
        id: userData.id,
        name: userData.username
      });
    } catch (error) {
      console.error("Failed to get user:", error);
    }
  });

  return (
    <main class="mx-auto p-4 text-gray-700">
      {user() && <Chat user={() => user()!} />}
    </main>
  );
}
