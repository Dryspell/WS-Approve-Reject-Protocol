import { type Component, createSignal, createMemo, For, Show, onMount, onCleanup, createEffect, untrack } from "solid-js";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import type { User, GameRoom, Vote, Transaction, Unit, Resource, UnitStats, UnitInventory, UnitTaskQueue, EndRoundVote } from "~/module_bindings/types";
import { useSpacetimeDB } from "~/hooks/useSpacetimeDB";
import RoundTimer from "./RoundTimer";
import VoteMarketPanel from "./VoteMarketPanel";
import EliminationModal from "./EliminationModal";
import ChatPanel from "../game/ChatPanel";
import ReplayViewer from "../game/ReplayViewer";
import { SoundToggle } from "~/components/ui/sound-toggle";
import { ErrorBoundary } from "~/components/ui/error-boundary";
import { DebugPanel } from "~/components/dev/DebugPanel";
import { AdminPanel } from "~/components/dev/AdminPanel";
import { ToastHelper } from "~/lib/toast-helpers";
import { sounds } from "~/lib/sounds";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import ColonyViewport, { type ColonyUnit, type ColonyResource, type TeamColor, type OtherPlayerAvatar } from "../game/ColonyViewport";
import UnitContextPanel from "../game/UnitContextPanel";
import { characterForIndex, type CharacterClass } from "~/lib/asset-loader";
import { TID } from "~/lib/test-ids";

interface VotingInterfaceProps {
  room: GameRoom;
  currentUser: User;
}

const VotingInterface: Component<VotingInterfaceProps> = (props) => {
  const { conn, connected } = useSpacetimeDB();
  const [votes, setVotes] = createSignal<Vote[]>([]);
  const [allPlayers, setAllPlayers] = createSignal<User[]>([]);
  const [transactions, setTransactions] = createSignal<Transaction[]>([]);
  const [serverUnits, setServerUnits] = createSignal<Unit[]>([]);
  const [serverResources, setServerResources] = createSignal<Resource[]>([]);
  const [unitStats, setUnitStats] = createSignal<UnitStats[]>([]);
  const [unitInventories, setUnitInventories] = createSignal<UnitInventory[]>([]);
  const [unitTaskQueues, setUnitTaskQueues] = createSignal<UnitTaskQueue[]>([]);
  const [draggedVote, setDraggedVote] = createSignal<Vote | null>(null);
  const [roundProcessing, setRoundProcessing] = createSignal(false);
  const [showEliminationModal, setShowEliminationModal] = createSignal(false);
  const [lastProcessedRound, setLastProcessedRound] = createSignal(0);
  const [endRoundVotes, setEndRoundVotes] = createSignal<EndRoundVote[]>([]);
  const [otherPlayerAvatars, setOtherPlayerAvatars] = createSignal<OtherPlayerAvatar[]>([]);

  let roundCheckInterval: ReturnType<typeof setInterval> | null = null;

  // Auto-process rounds when timer expires
  createEffect(() => {
    if (!props.room.startTime || props.room.gameStatus !== "active") {
      if (roundCheckInterval) {
        clearInterval(roundCheckInterval);
        roundCheckInterval = null;
      }
      return;
    }

    if (roundCheckInterval) clearInterval(roundCheckInterval);

    roundCheckInterval = setInterval(() => {
      untrack(() => {
        const now = Date.now();
        const roundStart = Number(props.room.startTime);
        const elapsed = Math.floor((now - roundStart) / 1000);
        const timeLeft = props.room.roundDuration - elapsed;

        if (timeLeft <= 0 && !roundProcessing()) {
          setRoundProcessing(true);
          processRound();
        }
      });
    }, 1000);
  });

  onCleanup(() => {
    if (roundCheckInterval) {
      clearInterval(roundCheckInterval);
      roundCheckInterval = null;
    }
  });

  const processRound = async () => {
    const connection = conn();
    if (!connection) return;

    try {
      console.log("⏰ Round time expired - processing votes...");
      await connection.reducers.processRoundVotes({ roomId: props.room.id, roundNumber: props.room.currentRound });
      ToastHelper.info("Round Processing", "Tallying votes and determining results...");
    } catch (error) {
      console.error("Failed to process round:", error);
      ToastHelper.error("Failed to process round");
      setRoundProcessing(false);
    }
  };

  onMount(() => {
    const connection = conn();
    if (!connection || !connected()) return;

    // Subscribe to votes
    connection.db.vote.onInsert((ctx, vote) => {
      setVotes((prev) => [...prev, vote]);
    });

    connection.db.vote.onUpdate((ctx, oldVote, newVote) => {
      setVotes((prev) =>
        prev.map((v) => (v.id === newVote.id ? newVote : v))
      );
    });

    connection.db.vote.onDelete((ctx, vote) => {
      setVotes((prev) => prev.filter((v) => v.id !== vote.id));
    });

    // Subscribe to users
    connection.db.user.onInsert((ctx, user) => {
      setAllPlayers((prev) => [...prev, user]);
    });

    connection.db.user.onUpdate((ctx, oldUser, newUser) => {
      setAllPlayers((prev) =>
        prev.map((u) => (u.identity.isEqual(newUser.identity) ? newUser : u))
      );
    });

    // Subscribe to GameRoom updates to detect round changes
    connection.db.game_room.onUpdate((ctx, oldRoom, newRoom) => {
      // Check if a new round just started (round number increased)
      if (newRoom.id === props.room.id && newRoom.currentRound > lastProcessedRound()) {
        // Show elimination modal for the previous round
        if (lastProcessedRound() > 0) {
          setShowEliminationModal(true);
        }
        setLastProcessedRound(newRoom.currentRound);
        setRoundProcessing(false);
      }
    });

    // Subscribe to transactions for market history
    connection.db.transaction.onInsert((ctx, transaction) => {
      setTransactions((prev) => [...prev, transaction]);
    });

    // Subscribe to units
    connection.db.unit.onInsert((ctx, unit) => {
      setServerUnits((prev) => [...prev, unit]);
    });
    connection.db.unit.onUpdate((ctx, oldUnit, newUnit) => {
      setServerUnits((prev) => prev.map((u) => (u.id === newUnit.id ? newUnit : u)));
    });
    connection.db.unit.onDelete((ctx, unit) => {
      setServerUnits((prev) => prev.filter((u) => u.id !== unit.id));
    });

    // Subscribe to resources
    connection.db.resource.onInsert((ctx, resource) => {
      setServerResources((prev) => [...prev, resource]);
    });
    connection.db.resource.onUpdate((ctx, oldRes, newRes) => {
      setServerResources((prev) => prev.map((r) => (r.id === newRes.id ? newRes : r)));
    });
    connection.db.resource.onDelete((ctx, resource) => {
      setServerResources((prev) => prev.filter((r) => r.id !== resource.id));
    });

    // Subscribe to unit stats
    connection.db.unit_stats.onInsert((ctx, stats) => {
      setUnitStats((prev) => [...prev, stats]);
    });
    connection.db.unit_stats.onUpdate((ctx, oldStats, newStats) => {
      setUnitStats((prev) => prev.map((s) => (s.unitId === newStats.unitId ? newStats : s)));
    });

    // Initial load of all data
    const initialVotes = Array.from(connection.db.vote.iter());
    setVotes(initialVotes);

    const initialPlayers = Array.from(connection.db.user.iter());
    setAllPlayers(initialPlayers);

    const initialTransactions = Array.from(connection.db.transaction.iter());
    setTransactions(initialTransactions);

    // Subscribe to inventories
    connection.db.unit_inventory.onInsert((ctx, inv) => {
      setUnitInventories((prev) => [...prev, inv]);
    });
    connection.db.unit_inventory.onUpdate((ctx, oldInv, newInv) => {
      setUnitInventories((prev) => prev.map((i) => (i.unitId === newInv.unitId ? newInv : i)));
    });

    // Subscribe to task queues
    connection.db.unit_task_queue.onInsert((ctx, task) => {
      setUnitTaskQueues((prev) => [...prev, task]);
    });
    connection.db.unit_task_queue.onUpdate((ctx, oldTask, newTask) => {
      setUnitTaskQueues((prev) => prev.map((t) => (t.id === newTask.id ? newTask : t)));
    });
    connection.db.unit_task_queue.onDelete((ctx, task) => {
      setUnitTaskQueues((prev) => prev.filter((t) => t.id !== task.id));
    });

    // Subscribe to end-round votes
    connection.db.end_round_vote.onInsert((ctx, erv) => {
      setEndRoundVotes((prev) => [...prev, erv]);
    });
    connection.db.end_round_vote.onDelete((ctx, erv) => {
      setEndRoundVotes((prev) => prev.filter((v) => v.id !== erv.id));
    });

    // Subscribe to player positions
    const refreshPlayerPositions = () => {
      const myId = props.currentUser.identity.toHexString();
      const positions = Array.from(connection.db.player_position.iter())
        .filter(p => p.roomId === props.room.id && p.identity.toHexString() !== myId)
        .map((p, i) => ({
          id: p.identity.toHexString(),
          name: allPlayers().find(u => u.identity.isEqual(p.identity))?.name || `Player ${i + 1}`,
          characterClass: characterForIndex(i + 1) as CharacterClass,
          x: p.x,
          z: p.z,
          rotationY: p.rotationY,
          isMoving: p.isMoving,
        }));
      setOtherPlayerAvatars(positions);
    };
    connection.db.player_position.onInsert(() => refreshPlayerPositions());
    connection.db.player_position.onUpdate(() => refreshPlayerPositions());
    connection.db.player_position.onDelete(() => refreshPlayerPositions());

    setServerUnits(Array.from(connection.db.unit.iter()));
    setServerResources(Array.from(connection.db.resource.iter()));
    setUnitStats(Array.from(connection.db.unit_stats.iter()));
    setUnitInventories(Array.from(connection.db.unit_inventory.iter()));
    setUnitTaskQueues(Array.from(connection.db.unit_task_queue.iter()));
    setEndRoundVotes(Array.from(connection.db.end_round_vote.iter()));
    refreshPlayerPositions();

    // Set initial round tracking
    setLastProcessedRound(props.room.currentRound);
  });

  // Get player's votes
  const myVotes = () => {
    return votes().filter(
      (v) =>
        v.roomId === props.room.id &&
        v.playerId === props.currentUser.identity.toHexString()
    );
  };

  // Get votes by color
  const redVotes = () => myVotes().filter((v) => v.color === "red");
  const blueVotes = () => myVotes().filter((v) => v.color === "blue");
  const unsetVotes = () => myVotes().filter((v) => !v.color);

  // Get remaining players (not eliminated)
  const remainingPlayers = () => {
    return allPlayers().filter(
      (player) =>
        props.room.memberIds.includes(player.identity.toHexString()) &&
        !props.room.eliminatedPlayers.includes(player.identity.toHexString())
    );
  };

  const eliminatedPlayers = () => {
    return allPlayers().filter((player) =>
      props.room.eliminatedPlayers.includes(player.identity.toHexString())
    );
  };

  // Calculate vote totals for elimination modal
  const getVoteTotals = () => {
    const currentRoundVotes = votes().filter(
      (v) => v.roomId === props.room.id && v.roundNumber === props.room.currentRound
    );
    
    const red = currentRoundVotes.filter((v) => v.color === "red").length;
    const blue = currentRoundVotes.filter((v) => v.color === "blue").length;
    const minority: "red" | "blue" | "tie" =
      red < blue ? "red" : blue < red ? "blue" : "tie";

    return { red, blue, minority };
  };

  const handleSetVoteColor = async (voteId: number, color: string) => {
    if (color !== "red" && color !== "blue") {
      ToastHelper.error("Invalid vote color");
      return;
    }
    const connection = conn();
    if (!connection) return;

    try {
      connection.reducers.setVoteColor({ voteId, color });
      ToastHelper.voteColorChanged(voteId, color);
      sounds.voteSet(color);
    } catch (error) {
      ToastHelper.error("Failed to set vote color");
      sounds.error();
    }
  };

  const handleLeaveRoom = async () => {
    const connection = conn();
    if (!connection) return;
    try {
      await connection.reducers.leaveRoom({ roomId: props.room.id });
      ToastHelper.success("Left Room", "You have left the room");
    } catch (error: any) {
      ToastHelper.error(error?.message || "Failed to leave room");
    }
  };

  // Drag and drop handlers
  const handleDragStart = (vote: Vote) => {
    setDraggedVote(vote);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (color: string) => {
    const vote = draggedVote();
    if (vote) {
      handleSetVoteColor(vote.id, color);
      setDraggedVote(null);
    }
  };

  const [chatOpen, setChatOpen] = createSignal(false);
  const [viewportSelectedIds, setViewportSelectedIds] = createSignal<number[]>([]);

  const handleDropZoneClick = (color: string) => {
    const selected = viewportSelectedIds();
    if (selected.length > 0) {
      for (const voteId of selected) {
        handleSetVoteColor(voteId, color);
      }
      setViewportSelectedIds([]);
    } else {
      const unset = unsetVotes();
      if (unset.length > 0) {
        handleSetVoteColor(unset[0].id, color);
      }
    }
  };

  const roomUnits = createMemo(() =>
    serverUnits().filter(
      (u) => u.roomId === props.room.id && u.unitType === "minion",
    ),
  );

  const roomResources = createMemo(() =>
    serverResources().filter((r) => r.roomId === props.room.id),
  );

  const getStats = (unitId: number) =>
    unitStats().find((s) => s.unitId === unitId);

  const colonyUnits = createMemo<ColonyUnit[]>(() => {
    const units = roomUnits();

    // If server has units for this room, use them
    if (units.length > 0) {
      return units.map((unit, i) => {
        const stats = getStats(unit.id);
        return {
          id: unit.id,
          team: (unit.voteColor || "unset") as TeamColor,
          x: unit.position.x - 50,
          z: unit.position.y - 50,
          characterClass: characterForIndex(i),
          taskType: unit.taskType ?? undefined,
          health: stats?.health,
          maxHealth: stats?.maxHealth,
        };
      });
    }

    // Fallback: derive from votes (pre-game or when server hasn't spawned units)
    return myVotes().map((vote, i) => {
      const angle = (i / Math.max(myVotes().length, 1)) * Math.PI * 2;
      const radius = 8 + (i % 3) * 5;
      return {
        id: vote.id,
        team: (vote.color || "unset") as TeamColor,
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
        characterClass: characterForIndex(i),
      };
    });
  });

  const colonyResources = createMemo<ColonyResource[]>(() =>
    roomResources().map((r) => ({
      id: r.id,
      type: r.resourceType,
      x: r.position.x - 50,
      z: r.position.y - 50,
      amount: r.amount,
      maxAmount: r.maxAmount,
    })),
  );

  const handleViewportSetTeam = (ids: number[], team: TeamColor) => {
    if (team === "unset") return;
    for (const id of ids) {
      handleSetVoteColor(id, team);
    }
  };

  // Selected unit context data
  const selectedUnit = createMemo(() => {
    const ids = viewportSelectedIds();
    if (ids.length !== 1) return null;
    return serverUnits().find((u) => u.id === ids[0]) ?? null;
  });

  const selectedUnitStats = createMemo(() => {
    const unit = selectedUnit();
    return unit ? unitStats().find((s) => s.unitId === unit.id) : undefined;
  });

  const selectedUnitInventory = createMemo(() => {
    const unit = selectedUnit();
    return unit ? unitInventories().find((i) => i.unitId === unit.id) : undefined;
  });

  const selectedUnitTasks = createMemo(() => {
    const unit = selectedUnit();
    return unit ? unitTaskQueues().filter((t) => t.unitId === unit.id) : [];
  });

  const handleCancelTask = (taskId: number) => {
    const connection = conn();
    if (!connection) return;
    try {
      connection.reducers.cancelUnitTask({ taskId });
    } catch (error) {
      ToastHelper.error("Failed to cancel task");
    }
  };

  const handleSetUnitVoteColor = (color: string) => {
    if (color !== "red" && color !== "blue") return;
    const unit = selectedUnit();
    if (!unit) return;
    const connection = conn();
    if (!connection) return;
    try {
      connection.reducers.setUnitVoteColor({ unitId: unit.id, color });
    } catch (error) {
      ToastHelper.error("Failed to set vote color");
    }
  };

  const endRoundVotesForCurrentRound = createMemo(() =>
    endRoundVotes().filter(
      (v) => v.roomId === props.room.id && v.round === props.room.currentRound,
    ),
  );

  const hasVotedEndRound = createMemo(() =>
    endRoundVotesForCurrentRound().some(
      (v) => v.userId === props.currentUser.identity.toHexString(),
    ),
  );

  const handleVoteEndRound = async () => {
    const connection = conn();
    if (!connection) return;
    try {
      await connection.reducers.voteEndRound({ roomId: props.room.id });
    } catch (error: any) {
      ToastHelper.error(error?.message || "Failed to vote to end round");
    }
  };

  const [playersOpen, setPlayersOpen] = createSignal(true);
  const [marketOpen, setMarketOpen] = createSignal(false);

  const handleAvatarPositionUpdate = (x: number, z: number, rotY: number, moving: boolean) => {
    const connection = conn();
    if (!connection || !connected()) return;
    connection.reducers.updatePlayerPosition({
      roomId: props.room.id,
      x,
      z,
      rotationY: rotY,
      isMoving: moving,
    });
  };

  return (
    <ErrorBoundary>
      <div class="fixed inset-0 z-50 overflow-hidden bg-[#1a1a2e]">
        {/* ===== FULL-SCREEN 3D VIEWPORT (layer 0) ===== */}
        <div class="absolute inset-0 z-0">
          <ColonyViewport
            units={colonyUnits()}
            resources={colonyResources().length > 0 ? colonyResources() : undefined}
            selectedIds={viewportSelectedIds}
            onSelect={setViewportSelectedIds}
            playerName={props.currentUser.name || "Player"}
            otherPlayers={otherPlayerAvatars()}
            onPositionUpdate={handleAvatarPositionUpdate}
            onSetTeam={handleViewportSetTeam}
          />
        </div>

        {/* ===== HUD OVERLAYS (layer 10+) ===== */}

        {/* Unit Context Panel (right side) */}
        <Show when={selectedUnit()}>
          <div class="absolute right-4 top-16 z-30 pointer-events-none">
            <UnitContextPanel
              unit={selectedUnit()!}
              stats={selectedUnitStats()}
              inventory={selectedUnitInventory()}
              tasks={selectedUnitTasks()}
              onClose={() => setViewportSelectedIds([])}
              onSetVoteColor={handleSetUnitVoteColor}
              onCancelTask={handleCancelTask}
            />
          </div>
        </Show>

        {/* Dev tools */}
        <div class="absolute right-2 top-14 z-40 flex gap-1">
          <AdminPanel />
        </div>
        <DebugPanel
          room={props.room}
          user={props.currentUser}
          votes={votes()}
          players={allPlayers()}
        />

        {/* ── TOP BAR ── */}
        <div
          class="absolute left-0 right-0 top-0 z-10 flex items-center gap-3 px-4 py-2 bg-black/40 backdrop-blur-md border-b border-white/10"
          data-testid={TID.gameHeader}
        >
          <div class="flex items-center gap-2">
            <span class="text-sm font-semibold text-white/90">{props.room.name}</span>
            <span class="rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-medium text-white/70">
              R{props.room.currentRound}
            </span>
          </div>

          <div class="mx-1 h-5 w-px bg-white/20" />

          <div class="flex items-center gap-2 text-white/80" data-testid={TID.roundTimer}>
            <RoundTimer
              roundNumber={props.room.currentRound}
              roundStartTime={props.room.startTime ? BigInt(props.room.startTime) : undefined}
              roundDuration={props.room.roundDuration}
            />
          </div>

          <Show when={props.room.gameStatus === "active" && !props.room.eliminatedPlayers.includes(props.currentUser.identity.toHexString())}>
            <Button
              size="sm"
              variant={hasVotedEndRound() ? "default" : "outline"}
              class={hasVotedEndRound()
                ? "bg-green-600/80 text-white text-xs px-2 py-1 hover:bg-green-500 border-green-500/50"
                : "text-white/70 border-white/20 text-xs px-2 py-1 hover:bg-white/10 hover:text-white"}
              onClick={handleVoteEndRound}
              disabled={hasVotedEndRound()}
              data-testid={TID.endRoundBtn}
            >
              {hasVotedEndRound() ? "Ready" : "End Round"}
              <span class="ml-1 text-[10px] opacity-70" data-testid={TID.endRoundCount}>
                {endRoundVotesForCurrentRound().length}/{remainingPlayers().length}
              </span>
            </Button>
          </Show>

          <div class="flex-1" />

          {/* Pot */}
          <div class="flex items-center gap-1.5 rounded-md bg-amber-500/20 px-2.5 py-1 border border-amber-400/30">
            <span class="text-xs text-amber-300/80">Pot</span>
            <span id="pot-amount" data-testid={TID.potAmount} class="text-base font-bold text-amber-200">
              ${props.room.potSize.toFixed(2)}
            </span>
          </div>

          {/* Wallet */}
          <div class="flex items-center gap-1.5 rounded-md bg-emerald-500/20 px-2.5 py-1 border border-emerald-400/30" data-testid={TID.walletDisplay}>
            <span class="text-xs text-emerald-300/80">Wallet</span>
            <span class="text-base font-bold text-emerald-200" data-testid={TID.walletBalance}>
              ${props.currentUser.walletBalance.toFixed(2)}
            </span>
            <span class="text-[10px] text-white/40" data-testid={TID.profitLoss}>
              ({props.currentUser.totalProfitLoss >= 0 ? "+" : ""}
              ${props.currentUser.totalProfitLoss.toFixed(2)})
            </span>
          </div>

          <SoundToggle />

          <Button
            size="sm"
            variant="ghost"
            class="text-red-400/80 hover:bg-red-500/20 hover:text-red-300"
            onClick={handleLeaveRoom}
            title="Leave Room"
            data-testid={TID.leaveRoomBtn}
          >
            Leave
          </Button>
        </div>

        {/* ── LEFT: Players Panel ── */}
        <div class="absolute left-3 top-14 bottom-20 z-10 flex flex-col" classList={{ "w-52": playersOpen(), "w-8": !playersOpen() }}>
          <button
            class="mb-1 flex items-center gap-1.5 rounded-t-lg bg-black/50 backdrop-blur-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/60 border border-white/10 border-b-0 hover:text-white/80 transition-colors"
            onClick={() => setPlayersOpen(!playersOpen())}
          >
            <Show when={playersOpen()} fallback={<span>▶</span>}>
              <span>◀</span>
              <span>Players ({remainingPlayers().length})</span>
            </Show>
          </button>
          <Show when={playersOpen()}>
            <div class="flex flex-1 flex-col gap-1.5 overflow-auto rounded-b-lg rounded-tr-lg bg-black/50 backdrop-blur-md p-2 border border-white/10">
              <For each={remainingPlayers()}>
                {(player) => {
                  const playerVotes = () => votes().filter(
                    (v) => v.playerId === player.identity.toHexString()
                  );
                  const isCurrentUser = player.identity.isEqual(props.currentUser.identity);
                  const playerIndex = () => remainingPlayers().indexOf(player);
                  const accentColors = ["border-l-blue-400", "border-l-emerald-400", "border-l-violet-400", "border-l-amber-400", "border-l-rose-400", "border-l-cyan-400", "border-l-orange-400", "border-l-pink-400"];

                  return (
                    <div
                      class="flex items-center gap-2 rounded-md border-l-[3px] bg-white/10 p-1.5 transition-all hover:bg-white/15"
                      classList={{
                        "ring-1 ring-blue-400/60": isCurrentUser,
                        [accentColors[playerIndex() % accentColors.length]]: true,
                      }}
                    >
                      <div class="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold text-white/80">
                        {(player.name || "A")[0].toUpperCase()}
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="truncate text-xs font-medium text-white/90">
                          {player.name || "Anonymous"}
                          {isCurrentUser && <span class="text-[10px] text-blue-400 ml-1">(you)</span>}
                        </div>
                        <div class="flex gap-1.5 text-[10px] text-white/40">
                          <span>{playerVotes().length}v</span>
                          <span>${player.walletBalance.toFixed(0)}</span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              </For>

              <Show when={eliminatedPlayers().length > 0}>
                <div class="mt-1 text-[10px] font-semibold uppercase tracking-wider text-white/30 px-1">
                  Eliminated ({eliminatedPlayers().length})
                </div>
                <For each={eliminatedPlayers()}>
                  {(player) => (
                    <div class="flex items-center gap-2 rounded-md bg-red-500/10 p-1.5 opacity-60">
                      <span class="text-xs">☠️</span>
                      <span class="text-[10px] line-through text-white/40">
                        {player.name || "Anonymous"}
                      </span>
                    </div>
                  )}
                </For>
              </Show>
            </div>
          </Show>
        </div>

        {/* ── RIGHT: Market Panel ── */}
        <div class="absolute right-3 top-14 bottom-20 z-10 flex flex-col" classList={{ "w-72 xl:w-80": marketOpen(), "w-8": !marketOpen() }}>
          <button
            class="mb-1 flex items-center gap-1.5 rounded-t-lg bg-black/50 backdrop-blur-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/60 border border-white/10 border-b-0 hover:text-white/80 transition-colors"
            onClick={() => setMarketOpen(!marketOpen())}
          >
            <Show when={marketOpen()} fallback={<span>◀</span>}>
              <span>▶</span>
              <span>Market</span>
            </Show>
          </button>
          <Show when={marketOpen()}>
            <div class="flex-1 overflow-auto rounded-b-lg rounded-tl-lg bg-black/50 backdrop-blur-md border border-white/10">
              <VoteMarketPanel
                votes={votes()}
                transactions={transactions()}
                roomId={props.room.id}
                roundNumber={props.room.currentRound}
                currentUserId={props.currentUser.identity.toHexString()}
                userWalletBalance={props.currentUser.walletBalance}
              />
            </div>
          </Show>
        </div>

        {/* ── BOTTOM CENTER: Vote Controls + Chat ── */}
        <div class="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 w-full max-w-2xl px-3">
          {/* Vote control bar */}
          <div class="rounded-xl bg-black/50 backdrop-blur-md p-3 border border-white/10 shadow-2xl">
            {/* Top row: vote summary + chips */}
            <div class="flex items-center gap-2 mb-2">
              <span class="text-xs font-semibold text-white/70">Votes ({myVotes().length})</span>
              <div class="flex gap-1 ml-auto">
                <span class="rounded bg-red-500/30 px-1.5 py-0.5 text-[10px] font-bold text-red-300 border border-red-500/30">{redVotes().length}R</span>
                <span class="rounded bg-blue-500/30 px-1.5 py-0.5 text-[10px] font-bold text-blue-300 border border-blue-500/30">{blueVotes().length}B</span>
                <Show when={unsetVotes().length > 0}>
                  <span class="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-white/50 border border-white/10">{unsetVotes().length}?</span>
                </Show>
              </div>
            </div>

            {/* Vote chips */}
            <div class="flex flex-wrap gap-1 mb-2">
              <For each={myVotes()}>
                {(vote) => {
                  const isSelected = () => viewportSelectedIds().includes(vote.id);
                  return (
                    <button
                      class="flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium transition-all"
                      classList={{
                        "border-red-400/60 bg-red-500/20 text-red-300": vote.color === "red",
                        "border-blue-400/60 bg-blue-500/20 text-blue-300": vote.color === "blue",
                        "border-dashed border-white/20 bg-white/5 text-white/40": !vote.color,
                        "ring-2 ring-green-400/70 ring-offset-1 ring-offset-transparent": isSelected(),
                      }}
                      onClick={() => {
                        setViewportSelectedIds(prev =>
                          prev.includes(vote.id) ? prev.filter(id => id !== vote.id) : [...prev, vote.id]
                        );
                      }}
                      data-testid={TID.voteChip(vote.id)}
                    >
                      <div
                        class="h-2 w-2 rounded-full"
                        classList={{
                          "bg-red-400": vote.color === "red",
                          "bg-blue-400": vote.color === "blue",
                          "bg-white/30": !vote.color,
                        }}
                      />
                      #{vote.id}
                    </button>
                  );
                }}
              </For>
            </div>

            {/* Drop zones — large, prominent */}
            <div class="grid grid-cols-2 gap-2">
              <div
                data-testid={TID.voteRed}
                role="button"
                tabindex="0"
                onDragOver={handleDragOver}
                onDrop={() => handleDrop("red")}
                onClick={() => handleDropZoneClick("red")}
                class="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-red-500/40 bg-red-500/10 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/25 hover:border-red-400/60 transition-all"
                classList={{ "border-red-400 bg-red-500/30": draggedVote() !== null }}
              >
                <div class="h-3 w-3 rounded-full bg-red-500" />
                Red
              </div>
              <div
                data-testid={TID.voteBlue}
                role="button"
                tabindex="0"
                onDragOver={handleDragOver}
                onDrop={() => handleDrop("blue")}
                onClick={() => handleDropZoneClick("blue")}
                class="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-blue-500/40 bg-blue-500/10 py-2 text-sm font-semibold text-blue-400 hover:bg-blue-500/25 hover:border-blue-400/60 transition-all"
                classList={{ "border-blue-400 bg-blue-500/30": draggedVote() !== null }}
              >
                <div class="h-3 w-3 rounded-full bg-blue-500" />
                Blue
              </div>
            </div>

            {/* Unit action toolbar (when units selected) */}
            <Show when={viewportSelectedIds().length > 0}>
              <div class="mt-2 flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 border border-white/10">
                <span class="text-[11px] text-white/50">
                  {viewportSelectedIds().length} unit{viewportSelectedIds().length !== 1 ? "s" : ""}
                </span>
                <div class="flex-1" />
                <button
                  class="rounded bg-red-600/80 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-red-500"
                  onClick={() => handleViewportSetTeam(viewportSelectedIds(), "red")}
                >
                  Set Red
                </button>
                <button
                  class="rounded bg-blue-600/80 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-blue-500"
                  onClick={() => handleViewportSetTeam(viewportSelectedIds(), "blue")}
                >
                  Set Blue
                </button>
                <button
                  class="rounded bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/60 hover:bg-white/20"
                  onClick={() => handleViewportSetTeam(viewportSelectedIds(), "unset")}
                >
                  Unset
                </button>
              </div>
            </Show>

            {/* Chat toggle row */}
            <button
              class="mt-2 flex w-full items-center justify-between rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/50 hover:bg-white/10 hover:text-white/70 transition-colors border border-white/5"
              onClick={() => setChatOpen(!chatOpen())}
            >
              <div class="flex items-center gap-2">
                <span>💬</span>
                <span>Chat</span>
              </div>
              <span class="text-[10px]">{chatOpen() ? "▼ Close" : "▲ Open"}</span>
            </button>
          </div>

          {/* Chat panel (expands below vote bar) */}
          <Show when={chatOpen()}>
            <div class="mt-1 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 h-64 overflow-hidden">
              <Tabs defaultValue="chat">
                <div class="border-b border-white/10 px-3 py-1">
                  <TabsList class="grid w-full max-w-xs grid-cols-2 bg-white/5">
                    <TabsTrigger value="chat" data-testid={TID.chatTab} class="text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50">Chat</TabsTrigger>
                    <TabsTrigger value="replay" class="text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50">Replay</TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="chat" class="h-[calc(100%-2.5rem)] p-0">
                  <ChatPanel roomId={props.room.id} roundNumber={props.room.currentRound} />
                </TabsContent>
                <TabsContent value="replay" class="h-[calc(100%-2.5rem)] overflow-auto p-3">
                  <ReplayViewer
                    roomId={props.room.id}
                    transactions={transactions()}
                    gameEvents={[]}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </Show>
        </div>

        {/* ===== MODALS (layer 50) ===== */}

        {/* Elimination Modal */}
        <Show when={showEliminationModal()}>
          <EliminationModal
            roundNumber={Math.max(props.room.currentRound - 1, 0)}
            eliminatedPlayers={eliminatedPlayers().map(p => p.identity.toHexString())}
            survivingPlayers={remainingPlayers().map(p => p.identity.toHexString())}
            minorityColor={getVoteTotals().minority}
            redVotes={getVoteTotals().red}
            blueVotes={getVoteTotals().blue}
            room={props.room}
            currentUser={props.currentUser}
            onClose={() => setShowEliminationModal(false)}
          />
        </Show>

        {/* Game Over Modal */}
        <Show when={props.room.gameStatus === "completed"}>
          <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <Card class="w-96 shadow-2xl border-white/20 bg-slate-900/90 backdrop-blur-xl">
              <CardHeader>
                <CardTitle class="text-center text-2xl text-white">Game Over!</CardTitle>
              </CardHeader>
              <CardContent class="space-y-4">
                <div class="text-center">
                  <p class="text-lg font-semibold text-white/80">Winners:</p>
                  <For each={remainingPlayers()}>
                    {(player) => (
                      <p class="text-xl font-bold text-emerald-400">
                        {player.name || "Anonymous"} - $
                        {(props.room.potSize / Math.max(remainingPlayers().length, 1)).toFixed(2)}
                      </p>
                    )}
                  </For>
                </div>
                <Button class="w-full" onClick={() => window.location.reload()}>
                  Return to Lobby
                </Button>
              </CardContent>
            </Card>
          </div>
        </Show>
      </div>
    </ErrorBoundary>
  );
};

export default VotingInterface;

