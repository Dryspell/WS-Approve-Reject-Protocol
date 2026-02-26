import { createSignal, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { useSpacetimeDB } from "~/hooks/useSpacetimeDB";
import GuestNamePrompt from "~/components/GuestNamePrompt";

export default function Home() {
  const navigate = useNavigate();
  const { connected, conn, identity } = useSpacetimeDB();
  const [showNamePrompt, setShowNamePrompt] = createSignal(false);

  const handlePlayClick = () => {
    if (!connected()) {
      navigate("/vote");
      return;
    }

    const connection = conn();
    if (!connection || !identity()) {
      navigate("/vote");
      return;
    }

    const user = Array.from(connection.db.user.iter()).find(
      (u) => u.identity.toHexString() === identity()!.toHexString(),
    );

    if (user?.name && user.name.trim().length > 0) {
      navigate("/vote");
    } else {
      setShowNamePrompt(true);
    }
  };

  return (
    <div class="min-h-screen bg-[#1a1a2e] text-white overflow-x-hidden">
      {/* Hero */}
      <section class="relative flex min-h-[85vh] flex-col items-center justify-center px-6 text-center">
        {/* Ambient glow */}
        <div class="pointer-events-none absolute inset-0 overflow-hidden">
          <div class="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/10 blur-[120px]" />
          <div class="absolute right-1/4 top-2/3 h-[300px] w-[300px] rounded-full bg-amber-500/8 blur-[100px]" />
        </div>

        <div class="relative z-10 max-w-3xl">
          <div class="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/60 backdrop-blur">
            <span class="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Real-time multiplayer — play instantly as a guest
          </div>

          <h1 class="mb-6 text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
            The{" "}
            <span class="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
              Vote
            </span>{" "}
            Exchange
          </h1>

          <p class="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-white/60 sm:text-xl">
            Trade votes. Forge alliances. Betray everyone. A strategic multiplayer game where the minority wins and the majority gets eliminated.
          </p>

          <div class="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <button
              onClick={handlePlayClick}
              class="group relative rounded-xl bg-blue-600 px-8 py-3.5 text-lg font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-500 hover:shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0"
            >
              <span class="relative z-10">Play Now</span>
              <div class="absolute inset-0 rounded-xl bg-blue-400/20 opacity-0 blur-xl transition-opacity group-hover:opacity-100" />
            </button>
            <a
              href="#how-it-works"
              class="rounded-xl border border-white/10 bg-white/5 px-8 py-3.5 text-lg font-medium text-white/70 backdrop-blur transition-all hover:bg-white/10 hover:text-white"
            >
              How It Works
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div class="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-white/20">
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" class="relative px-6 py-24">
        <div class="mx-auto max-w-5xl">
          <h2 class="mb-4 text-center text-3xl font-bold sm:text-4xl">How It Works</h2>
          <p class="mx-auto mb-16 max-w-lg text-center text-white/50">
            Four steps. Infinite treachery.
          </p>

          <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "01",
                title: "Buy In",
                desc: "Players join a room and buy in to create a shared pot. More players means higher stakes.",
                icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
              },
              {
                step: "02",
                title: "Trade Votes",
                desc: "Buy, sell, and negotiate votes with other players. Sell guarantees about how you'll vote — or bluff.",
                icon: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4",
              },
              {
                step: "03",
                title: "Vote Red or Blue",
                desc: "Each round, assign your votes to Red or Blue. Split them across colors if you have multiple.",
                icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
              },
              {
                step: "04",
                title: "Minority Wins",
                desc: "The majority gets eliminated. The minority survives. Last players standing split the pot.",
                icon: "M13 10V3L4 14h7v7l9-11h-7z",
              },
            ].map((item) => (
              <div class="group rounded-xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur transition-all hover:border-white/20 hover:bg-white/[0.06]">
                <div class="mb-4 flex items-center gap-3">
                  <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400">
                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d={item.icon} />
                    </svg>
                  </div>
                  <span class="text-xs font-bold uppercase tracking-widest text-white/25">
                    Step {item.step}
                  </span>
                </div>
                <h3 class="mb-2 text-lg font-semibold">{item.title}</h3>
                <p class="text-sm leading-relaxed text-white/50">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section class="px-6 py-24">
        <div class="mx-auto max-w-5xl">
          <h2 class="mb-4 text-center text-3xl font-bold sm:text-4xl">Built for Strategy</h2>
          <p class="mx-auto mb-16 max-w-lg text-center text-white/50">
            Every mechanic is designed to reward cunning over luck.
          </p>

          <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Real-Time Multiplayer", desc: "Powered by SpacetimeDB for instant state sync across all players. No lag, no excuses." },
              { title: "Vote Trading", desc: "Buy and sell votes on a live marketplace. Control the outcome by controlling the supply." },
              { title: "Guarantees & Bluffing", desc: "Sell promises about your vote. Honor them for trust — or break them for profit." },
              { title: "3D Colony Viewport", desc: "Your votes come to life as units in a real-time 3D world with spring physics and selection." },
              { title: "Multiple Votes", desc: "Start with multiple votes and split them across colors. Guarantee your own survival." },
              { title: "Room Customization", desc: "Configure buy-in, vote count, round duration, re-buy rules, and more per room." },
            ].map((feat) => (
              <div class="rounded-xl border border-white/5 bg-white/[0.02] p-5">
                <h3 class="mb-1.5 text-sm font-semibold text-white/90">{feat.title}</h3>
                <p class="text-sm leading-relaxed text-white/40">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section class="px-6 py-24">
        <div class="mx-auto max-w-xl text-center">
          <h2 class="mb-4 text-3xl font-bold">Ready to Play?</h2>
          <p class="mb-8 text-white/50">
            No account needed. Jump in as a guest and start trading votes.
          </p>
          <button
            onClick={handlePlayClick}
            class="rounded-xl bg-blue-600 px-8 py-3.5 text-lg font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-500 hover:shadow-blue-500/30 hover:-translate-y-0.5"
          >
            Play Now
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer class="border-t border-white/5 px-6 py-8">
        <div class="mx-auto flex max-w-5xl items-center justify-between text-xs text-white/30">
          <div class="flex items-center gap-1.5">
            <svg class="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Socket Signals
          </div>
          <div class="flex gap-6">
            <a href="/leaderboard" class="hover:text-white/60 transition-colors">Leaderboard</a>
            <a href="/profile" class="hover:text-white/60 transition-colors">Profile</a>
          </div>
        </div>
      </footer>

      {/* Guest Name Prompt Modal */}
      <Show when={showNamePrompt()}>
        <GuestNamePrompt
          onComplete={() => {
            setShowNamePrompt(false);
            navigate("/vote");
          }}
          onCancel={() => setShowNamePrompt(false)}
        />
      </Show>
    </div>
  );
}
