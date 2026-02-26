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
      <section class="relative flex min-h-[90vh] flex-col items-center justify-center px-6 text-center">
        {/* Animated background orbs */}
        <div class="pointer-events-none absolute inset-0 overflow-hidden">
          <div class="absolute left-1/4 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-600/8 blur-[150px] animate-[pulse_8s_ease-in-out_infinite]" />
          <div class="absolute right-1/4 top-1/2 h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[130px] animate-[pulse_6s_ease-in-out_infinite_1s]" />
          <div class="absolute left-1/2 bottom-1/4 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-amber-500/6 blur-[120px] animate-[pulse_10s_ease-in-out_infinite_2s]" />
        </div>

        <div class="relative z-10 max-w-3xl">
          <div class="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/60 backdrop-blur">
            <span class="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Live now &mdash; jump in as a guest, no account needed
          </div>

          <h1 class="mb-6 text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
            <span class="bg-gradient-to-r from-red-400 via-white to-blue-400 bg-clip-text text-transparent">
              Outvote.
            </span>{" "}
            <span class="bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
              Outplay.
            </span>{" "}
            <span class="text-white">
              Outlast.
            </span>
          </h1>

          <p class="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-white/60 sm:text-xl">
            Every vote is a weapon. Every alliance is temporary.
            The minority survives &mdash; the majority gets eliminated.
            Trade, bluff, and betray your way to victory.
          </p>

          <div class="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <button
              onClick={handlePlayClick}
              class="group relative overflow-hidden rounded-xl bg-gradient-to-r from-red-600 via-purple-600 to-blue-600 px-10 py-4 text-lg font-bold text-white shadow-lg shadow-purple-600/25 transition-all hover:shadow-purple-500/40 hover:-translate-y-0.5 active:translate-y-0"
            >
              <span class="relative z-10 flex items-center gap-2">
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Enter the Arena
              </span>
              <div class="absolute inset-0 bg-gradient-to-r from-red-400/20 via-purple-400/20 to-blue-400/20 opacity-0 blur-xl transition-opacity group-hover:opacity-100" />
            </button>
            <a
              href="#how-it-works"
              class="rounded-xl border border-white/10 bg-white/5 px-8 py-3.5 text-lg font-medium text-white/70 backdrop-blur transition-all hover:bg-white/10 hover:text-white"
            >
              How It Works
            </a>
          </div>

          {/* Red vs Blue visual indicator */}
          <div class="mt-12 flex items-center justify-center gap-8 text-sm text-white/40">
            <div class="flex items-center gap-2">
              <div class="h-3 w-3 rounded-full bg-red-500 shadow-lg shadow-red-500/50" />
              <span>Red Team</span>
            </div>
            <span class="text-white/20">vs</span>
            <div class="flex items-center gap-2">
              <div class="h-3 w-3 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50" />
              <span>Blue Team</span>
            </div>
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
          <h2 class="mb-4 text-center text-3xl font-bold sm:text-4xl">
            Four Steps. Infinite Treachery.
          </h2>
          <p class="mx-auto mb-16 max-w-lg text-center text-white/50">
            Simple rules, deep strategy. Every round is a new mind game.
          </p>

          <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "01",
                title: "Ante Up",
                desc: "Players buy in to create a shared pot. Higher stakes, higher reward. Your coins are on the line.",
                icon: (
                  <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v10M9 9.5c0-1.38 1.34-2.5 3-2.5s3 1.12 3 2.5-1.34 2.5-3 2.5-3 1.12-3 2.5 1.34 2.5 3 2.5" />
                  </svg>
                ),
                color: "from-amber-500/20 to-amber-600/10",
                iconColor: "text-amber-400",
              },
              {
                step: "02",
                title: "Broker Power",
                desc: "Trade votes, sell guarantees, make promises. Your word is your currency \u2014 until it isn't.",
                icon: (
                  <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                  </svg>
                ),
                color: "from-purple-500/20 to-purple-600/10",
                iconColor: "text-purple-400",
              },
              {
                step: "03",
                title: "Cast Your Vote",
                desc: "Red or Blue? Split your votes, go all-in, or double-cross your allies at the last second.",
                icon: (
                  <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                color: "from-blue-500/20 to-red-500/10",
                iconColor: "text-blue-400",
              },
              {
                step: "04",
                title: "Survive",
                desc: "The majority gets eliminated. Only the minority lives. Last ones standing split the pot.",
                icon: (
                  <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
                  </svg>
                ),
                color: "from-red-500/20 to-orange-600/10",
                iconColor: "text-red-400",
              },
            ].map((item) => (
              <div class={`group rounded-xl border border-white/10 bg-gradient-to-br ${item.color} p-6 backdrop-blur transition-all hover:border-white/20 hover:scale-[1.02]`}>
                <div class="mb-4 flex items-center gap-3">
                  <div class={`flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 ${item.iconColor}`}>
                    {item.icon}
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
          <h2 class="mb-4 text-center text-3xl font-bold sm:text-4xl">
            Built for Cunning
          </h2>
          <p class="mx-auto mb-16 max-w-lg text-center text-white/50">
            Every mechanic rewards strategy over luck. Trust no one.
          </p>

          <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Real-Time Combat",
                desc: "Powered by SpacetimeDB \u2014 every vote, every trade, every betrayal happens instantly across all players.",
                icon: (
                  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                ),
                accent: "text-amber-400",
              },
              {
                title: "Vote Marketplace",
                desc: "Buy and sell votes on a live market. Corner the supply and control the outcome.",
                icon: (
                  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                  </svg>
                ),
                accent: "text-green-400",
              },
              {
                title: "Guarantees & Bluffs",
                desc: "Sell binding promises about your vote. Or lie through your teeth \u2014 if you can afford the consequences.",
                icon: (
                  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                ),
                accent: "text-purple-400",
              },
              {
                title: "3D Colony World",
                desc: "Your votes come to life as units in a living 3D colony with resource gathering and building.",
                icon: (
                  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                  </svg>
                ),
                accent: "text-blue-400",
              },
              {
                title: "Multiple Votes",
                desc: "Start with several votes each. Split them across colors, trade them, or gamble everything on one side.",
                icon: (
                  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3" />
                  </svg>
                ),
                accent: "text-red-400",
              },
              {
                title: "Custom Rooms",
                desc: "Set your own buy-in, player count, round rules, and re-buy options. Your arena, your rules.",
                icon: (
                  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                  </svg>
                ),
                accent: "text-cyan-400",
              },
            ].map((feat) => (
              <div class="group rounded-xl border border-white/5 bg-white/[0.02] p-5 transition-all hover:border-white/15 hover:bg-white/[0.05]">
                <div class="mb-3 flex items-center gap-2">
                  <div class={feat.accent}>{feat.icon}</div>
                  <h3 class="text-sm font-semibold text-white/90">{feat.title}</h3>
                </div>
                <p class="text-sm leading-relaxed text-white/40">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section class="px-6 py-24">
        <div class="mx-auto max-w-xl text-center">
          <h2 class="mb-4 text-3xl font-bold">
            The Arena Awaits
          </h2>
          <p class="mb-8 text-white/50">
            No account. No download. Jump in and start scheming.
          </p>
          <button
            onClick={handlePlayClick}
            class="rounded-xl bg-gradient-to-r from-red-600 via-purple-600 to-blue-600 px-10 py-4 text-lg font-bold text-white shadow-lg shadow-purple-600/25 transition-all hover:shadow-purple-500/40 hover:-translate-y-0.5"
          >
            Play Now
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer class="border-t border-white/5 px-6 py-8">
        <div class="mx-auto flex max-w-5xl items-center justify-between text-xs text-white/30">
          <div class="flex items-center gap-1.5">
            <svg class="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
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
