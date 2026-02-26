import { clientOnly } from "@solidjs/start";
const VoteBox = clientOnly(() => import("~/components/Vote/VoteBox"));

export default function VotePage() {
  return (
    <main class="h-screen w-full">
      <VoteBox />
    </main>
  );
}
