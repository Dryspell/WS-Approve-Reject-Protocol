import { clientOnly } from "@solidjs/start";
const VoteBox = clientOnly(() => import("~/components/Vote/VoteBox"));

export default function VotePage() {
  return (
    <main class="mx-auto p-4 text-gray-700">
      <VoteBox />
    </main>
  );
}
