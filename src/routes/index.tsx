import { createAsync, type RouteDefinition } from "@solidjs/router";
import { getUser, logout } from "./api";

export const route = {
  preload() {
    getUser();
  },
} satisfies RouteDefinition;

export default function Home() {
  const user = createAsync(async () => getUser(), { deferStream: true });
  return (
    <main class="w-full space-y-2 p-4">
      <h2 class="text-3xl font-bold">Hello {user()?.username}</h2>
      <h3 class="text-xl font-bold">Message board</h3>
      <form action={logout} method="post">
        <button name="logout" type="submit">
          Logout
        </button>
      </form>
    </main>
  );
}
