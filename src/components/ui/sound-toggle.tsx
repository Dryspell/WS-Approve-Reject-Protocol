import { Component, createSignal } from "solid-js";
import { Button } from "./button";
import { getSoundManager } from "~/lib/sounds";

export const SoundToggle: Component = () => {
  const [enabled, setEnabled] = createSignal(true);

  const toggleSound = () => {
    const newEnabled = !enabled();
    setEnabled(newEnabled);
    getSoundManager().setEnabled(newEnabled);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleSound}
      class="h-8 w-8 p-0"
      title={enabled() ? "Mute sounds" : "Enable sounds"}
    >
      {enabled() ? "🔊" : "🔇"}
    </Button>
  );
};

