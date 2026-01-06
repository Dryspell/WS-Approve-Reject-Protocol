import { Component, createSignal } from "solid-js";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { TextField, TextFieldInput, TextFieldLabel } from "~/components/ui/text-field";

interface RoomPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  buyinAmount: number;
  roundDuration: number; // seconds
  recommended: boolean;
}

const PRESETS: RoomPreset[] = [
  {
    id: 'quick',
    name: 'Quick Game',
    description: 'Fast-paced action. Perfect for a quick match.',
    icon: '⚡',
    buyinAmount: 5,
    roundDuration: 120, // 2 minutes
    recommended: false,
  },
  {
    id: 'standard',
    name: 'Standard Game',
    description: 'Balanced gameplay with time for strategy.',
    icon: '🎮',
    buyinAmount: 10,
    roundDuration: 300, // 5 minutes
    recommended: true,
  },
  {
    id: 'strategic',
    name: 'Strategic Game',
    description: 'Extended rounds for deep strategy and negotiation.',
    icon: '🧠',
    buyinAmount: 20,
    roundDuration: 600, // 10 minutes
    recommended: false,
  },
  {
    id: 'high-stakes',
    name: 'High Stakes',
    description: 'Big money, big pressure. For serious players.',
    icon: '💎',
    buyinAmount: 100,
    roundDuration: 300, // 5 minutes
    recommended: false,
  },
];

interface RoomPresetsProps {
  onSelectPreset: (preset: RoomPreset) => void;
}

export const RoomPresets: Component<RoomPresetsProps> = (props) => {
  const [customBuyin, setCustomBuyin] = createSignal(10);
  const [customDuration, setCustomDuration] = createSignal(300);

  const createCustomPreset = () => {
    const preset: RoomPreset = {
      id: 'custom',
      name: 'Custom Game',
      description: 'Your custom settings',
      icon: '⚙️',
      buyinAmount: customBuyin(),
      roundDuration: customDuration(),
      recommended: false,
    };
    props.onSelectPreset(preset);
  };

  return (
    <div class="space-y-4">
      <div class="text-sm text-gray-600">
        Choose a preset or create your own custom game:
      </div>

      {/* Preset Cards */}
      <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
        {PRESETS.map((preset) => (
          <Card
            class="cursor-pointer transition-all hover:shadow-md"
            classList={{
              'border-2 border-blue-500': preset.recommended,
            }}
            onClick={() => props.onSelectPreset(preset)}
          >
            <CardContent class="p-4">
              <div class="flex items-start gap-3">
                <div class="text-3xl">{preset.icon}</div>
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <h3 class="font-semibold">{preset.name}</h3>
                    {preset.recommended && (
                      <Badge variant="default" class="text-xs">
                        Recommended
                      </Badge>
                    )}
                  </div>
                  <p class="mt-1 text-xs text-gray-600">
                    {preset.description}
                  </p>
                  <div class="mt-3 flex gap-4 text-xs">
                    <div>
                      <span class="text-gray-500">Buy-in:</span>{' '}
                      <span class="font-semibold">${preset.buyinAmount}</span>
                    </div>
                    <div>
                      <span class="text-gray-500">Round:</span>{' '}
                      <span class="font-semibold">
                        {preset.roundDuration / 60} min
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Custom Settings */}
      <Card>
        <CardHeader>
          <CardTitle class="text-base">⚙️ Custom Settings</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <TextField>
              <TextFieldLabel class="text-sm">Buy-in Amount ($)</TextFieldLabel>
              <TextFieldInput
                type="number"
                min="0.01"
                step="1"
                value={customBuyin()}
                onInput={(e) => setCustomBuyin(parseFloat(e.currentTarget.value) || 10)}
              />
            </TextField>

            <TextField>
              <TextFieldLabel class="text-sm">Round Duration (minutes)</TextFieldLabel>
              <TextFieldInput
                type="number"
                min="1"
                step="1"
                value={customDuration() / 60}
                onInput={(e) =>
                  setCustomDuration((parseFloat(e.currentTarget.value) || 5) * 60)
                }
              />
            </TextField>
          </div>

          <Button onClick={createCustomPreset} class="w-full">
            Create Custom Game (${customBuyin()} • {customDuration() / 60} min)
          </Button>
        </CardContent>
      </Card>

      {/* Tips */}
      <div class="rounded border border-green-200 bg-green-50 p-3 text-xs text-green-700">
        <p class="font-semibold">💡 Choosing a Game Mode:</p>
        <ul class="ml-4 mt-1 list-disc space-y-1">
          <li><strong>Quick:</strong> Less time for trading, more instinctive plays</li>
          <li><strong>Standard:</strong> Balanced for beginners and veterans</li>
          <li><strong>Strategic:</strong> More time for complex deals and bluffs</li>
          <li><strong>High Stakes:</strong> Same as standard but higher risk/reward</li>
        </ul>
      </div>
    </div>
  );
};

export default RoomPresets;

