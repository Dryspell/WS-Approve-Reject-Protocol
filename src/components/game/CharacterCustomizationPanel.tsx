import { For, createSignal } from "solid-js";
import { Button } from "../ui/button";
import { type CharacterClass } from "~/lib/asset-loader";

interface CharacterOption {
  id: CharacterClass;
  name: string;
  description: string;
  icon: string;
  stats: { attack: number; defense: number; speed: number; special: string };
}

const CHARACTER_OPTIONS: CharacterOption[] = [
  {
    id: "knight",
    name: "Knight",
    description: "Balanced warrior with solid defense",
    icon: "⚔️",
    stats: { attack: 8, defense: 10, speed: 6, special: "Shield Block" },
  },
  {
    id: "barbarian",
    name: "Barbarian",
    description: "Heavy hitter with high attack power",
    icon: "🪓",
    stats: { attack: 12, defense: 6, speed: 7, special: "Berserker Rage" },
  },
  {
    id: "mage",
    name: "Mage",
    description: "Arcane spellcaster with area effects",
    icon: "🔮",
    stats: { attack: 10, defense: 4, speed: 5, special: "Arcane Blast" },
  },
  {
    id: "rogue",
    name: "Rogue",
    description: "Swift and stealthy with critical strikes",
    icon: "🗡️",
    stats: { attack: 9, defense: 5, speed: 11, special: "Backstab" },
  },
  {
    id: "ranger",
    name: "Ranger",
    description: "Ranged attacker with tracking abilities",
    icon: "🏹",
    stats: { attack: 9, defense: 6, speed: 9, special: "Eagle Eye" },
  },
];

const EQUIPMENT_SLOTS = ["Main Hand", "Off Hand", "Armor", "Helmet", "Boots"];

export default function CharacterCustomizationPanel(props: {
  onClose: () => void;
  onSelectCharacter?: (charClass: CharacterClass) => void;
}) {
  const [selectedClass, setSelectedClass] = createSignal<CharacterClass>("knight");

  const selectedChar = () => CHARACTER_OPTIONS.find(c => c.id === selectedClass())!;

  const handleConfirm = () => {
    props.onSelectCharacter?.(selectedClass());
    props.onClose();
  };

  return (
    <div class="absolute inset-0 z-20 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/40" onClick={props.onClose} />
      <div class="relative rounded-xl border border-white/10 bg-[#0f172a]/95 backdrop-blur-md shadow-2xl max-w-xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div class="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <h3 class="text-lg font-bold text-white">Armory - Character Customization</h3>
            <p class="text-xs text-white/40 mt-0.5">Choose your character class</p>
          </div>
          <Button variant="ghost" size="sm" onClick={props.onClose} class="text-white/50 hover:text-white">
            Close <span class="text-white/30 ml-1 text-xs">[Esc]</span>
          </Button>
        </div>

        <div class="p-5 space-y-5 overflow-y-auto">
          {/* Character class grid */}
          <div class="grid grid-cols-5 gap-2">
            <For each={CHARACTER_OPTIONS}>
              {(char) => (
                <button
                  class="flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all cursor-pointer"
                  classList={{
                    "border-blue-500/60 bg-blue-500/10 ring-1 ring-blue-500/30": selectedClass() === char.id,
                    "border-white/10 bg-white/[0.02] hover:bg-white/5 hover:border-white/20": selectedClass() !== char.id,
                  }}
                  onClick={() => setSelectedClass(char.id)}
                >
                  <div class="text-2xl">{char.icon}</div>
                  <div class="text-xs font-medium text-white">{char.name}</div>
                </button>
              )}
            </For>
          </div>

          {/* Selected character details */}
          <div class="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div class="flex items-start gap-4">
              <div class="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center text-3xl flex-shrink-0">
                {selectedChar().icon}
              </div>
              <div class="flex-1">
                <div class="text-base font-bold text-white">{selectedChar().name}</div>
                <div class="text-xs text-white/50 mt-0.5">{selectedChar().description}</div>
                <div class="mt-3 grid grid-cols-4 gap-2">
                  <div class="text-center">
                    <div class="text-lg font-bold text-red-400">{selectedChar().stats.attack}</div>
                    <div class="text-[10px] text-white/30">ATK</div>
                  </div>
                  <div class="text-center">
                    <div class="text-lg font-bold text-blue-400">{selectedChar().stats.defense}</div>
                    <div class="text-[10px] text-white/30">DEF</div>
                  </div>
                  <div class="text-center">
                    <div class="text-lg font-bold text-yellow-400">{selectedChar().stats.speed}</div>
                    <div class="text-[10px] text-white/30">SPD</div>
                  </div>
                  <div class="text-center">
                    <div class="text-[11px] font-medium text-purple-400">{selectedChar().stats.special}</div>
                    <div class="text-[10px] text-white/30">SKILL</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Equipment slots */}
          <div>
            <div class="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-2">Equipment</div>
            <div class="grid grid-cols-5 gap-2">
              <For each={EQUIPMENT_SLOTS}>
                {(slot) => (
                  <div class="flex flex-col items-center gap-1 rounded-lg border border-white/5 bg-white/[0.02] p-2 cursor-not-allowed">
                    <div class="w-8 h-8 rounded bg-white/5 flex items-center justify-center text-white/10 text-xs">?</div>
                    <div class="text-[9px] text-white/15 text-center">{slot}</div>
                  </div>
                )}
              </For>
            </div>
            <p class="text-[10px] text-white/20 mt-2 text-center">Equipment system coming soon</p>
          </div>

          {/* Confirm button */}
          <Button class="w-full py-3 font-semibold" onClick={handleConfirm}>
            Confirm Selection
          </Button>
        </div>
      </div>
    </div>
  );
}
