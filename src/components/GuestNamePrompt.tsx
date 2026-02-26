import { Component, createSignal } from "solid-js";
import { useSpacetimeDB } from "~/hooks/useSpacetimeDB";

interface GuestNamePromptProps {
  onComplete: () => void;
  onCancel: () => void;
}

const GuestNamePrompt: Component<GuestNamePromptProps> = (props) => {
  const { conn, connected } = useSpacetimeDB();
  const [name, setName] = createSignal("");
  const [submitting, setSubmitting] = createSignal(false);

  const generateGuestName = () => {
    const tag = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `Guest-${tag}`;
  };

  const submit = async (displayName: string) => {
    const connection = conn();
    if (!connection || !connected()) {
      props.onComplete();
      return;
    }

    setSubmitting(true);
    try {
      await connection.reducers.setName({ name: displayName.trim() });
    } catch (e) {
      console.error("Failed to set name:", e);
    }
    setSubmitting(false);
    props.onComplete();
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    const val = name().trim();
    submit(val || generateGuestName());
  };

  const handleSkip = () => {
    submit(generateGuestName());
  };

  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={props.onCancel}>
      <div
        class="relative w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900/95 p-8 shadow-2xl backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          class="absolute right-3 top-3 text-white/30 hover:text-white/60 transition-colors"
          onClick={props.onCancel}
          aria-label="Close"
        >
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 class="mb-2 text-xl font-bold text-white">Choose a Display Name</h2>
        <p class="mb-6 text-sm text-white/50">
          Other players will see this name. You can change it later in your profile.
        </p>

        <form onSubmit={handleSubmit} class="space-y-4">
          <input
            type="text"
            placeholder="Enter your name..."
            maxLength={24}
            value={name()}
            onInput={(e) => setName(e.currentTarget.value)}
            class="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none transition-colors focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30"
            autofocus
          />

          <button
            type="submit"
            disabled={submitting()}
            class="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition-all hover:bg-blue-500 disabled:opacity-50"
          >
            {submitting() ? "Setting up..." : "Start Playing"}
          </button>

          <button
            type="button"
            onClick={handleSkip}
            disabled={submitting()}
            class="w-full py-2 text-sm text-white/40 transition-colors hover:text-white/60 disabled:opacity-50"
          >
            Skip — play as guest
          </button>
        </form>
      </div>
    </div>
  );
};

export default GuestNamePrompt;
