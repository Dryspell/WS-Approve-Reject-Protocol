import { clientOnly } from "@solidjs/start";
const VoteBox = clientOnly(() => import("~/components/Vote/VoteBox"));

function LoadingScreen() {
  return (
    <div class="flex h-screen w-full flex-col items-center justify-center gap-4 bg-[#1a1a2e]">
      <h1 class="text-2xl font-bold tracking-tight text-white">Nashfall</h1>
      <div class="flex items-center gap-2 text-sm text-white/50">
        <span class="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-400" />
        Loading game…
      </div>
    </div>
  );
}

export default function VotePage() {
  return (
    <main class="h-screen w-full">
      <VoteBox fallback={<LoadingScreen />} />
    </main>
  );
}
