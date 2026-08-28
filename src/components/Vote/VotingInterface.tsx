import { type Component, createSignal, createMemo, For, Show, onMount, onCleanup, createEffect, getOwner, runWithOwner, type Owner } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import type { User, GameRoom, Vote, Transaction, Unit, Resource, UnitStats, UnitInventory, UnitTaskQueue, EndRoundVote, Equipment, BattleArena, BattleUnit, BattleCombatEvent, SideBet, GameEvent, Guarantee, GuaranteePurchase, OwnedLaborer, OwnedEquipment } from "~/module_bindings/types";
import { useSpacetimeDB } from "~/hooks/useSpacetimeDB";
import RoundTimer, { type GamePhase } from "./RoundTimer";
import VoteMarketPanel from "./VoteMarketPanel";
import EliminationModal from "./EliminationModal";
import ChatPanel from "../game/ChatPanel";
import ReplayViewer from "../game/ReplayViewer";
import ActivityFeed from "../game/ActivityFeed";
import FloatingChatBubbles from "../game/ChatBubble";
import { SoundToggle } from "~/components/ui/sound-toggle";
import { ErrorBoundary } from "~/components/ui/error-boundary";
import { DebugPanel } from "~/components/dev/DebugPanel";
import { AdminPanel } from "~/components/dev/AdminPanel";
import { ToastHelper } from "~/lib/toast-helpers";
import { sounds } from "~/lib/sounds";
import { buyListedVote, listVote, unlistVote, makeOffer } from "~/lib/vote-trading";
import { playerFateAtLock, suggestedListPrice, visibleVoteColor } from "~/lib/vote-tally";
import { isVoteGuaranteed } from "~/lib/guarantees";
import { encodeWhisper } from "~/lib/whisper";
import VoteTallyBoard from "./VoteTallyBoard";
import VoteCoach from "./VoteCoach";
import PlayerContextMenu, { type PlayerMenuTarget } from "../game/PlayerContextMenu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import ColonyViewport, { type ColonyUnit, type ColonyResource, type ColonyBuilding, type TeamColor, type OtherPlayerAvatar } from "../game/ColonyViewport";
import UnitContextPanel from "../game/UnitContextPanel";
import EquipmentPanel from "../game/EquipmentPanel";
import BattleArenaViewport from "../game/BattleArenaViewport";
import SideBetPanel from "../game/SideBetPanel";
import { characterForIndex, type CharacterClass } from "~/lib/asset-loader";
import { resolvePlayerName } from "~/lib/game-utils";
import { TID } from "~/lib/test-ids";
import AccountSaveCard from "../game/AccountSaveCard";


interface VotingInterfaceProps {
  room: GameRoom;
  currentUser: User;
}

const VotingInterface: Component<VotingInterfaceProps> = (props) => {
  const navigate = useNavigate();
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
  const [showEliminationModal, setShowEliminationModal] = createSignal(false);
  const [lastProcessedRound, setLastProcessedRound] = createSignal(0);
  const [savedRoundTotals, setSavedRoundTotals] = createSignal<{ red: number; blue: number; minority: "red" | "blue" | "tie" }>({ red: 0, blue: 0, minority: "tie" });
  const [endRoundVotes, setEndRoundVotes] = createSignal<EndRoundVote[]>([]);
  const [otherPlayerAvatars, setOtherPlayerAvatars] = createSignal<OtherPlayerAvatar[]>([]);
  const [tradePopup, setTradePopup] = createSignal<{ offerId: number; x: number; y: number } | null>(null);
  const [equipment, setEquipment] = createSignal<Equipment[]>([]);
  const [battleArenas, setBattleArenas] = createSignal<BattleArena[]>([]);
  const [battleUnits, setBattleUnits] = createSignal<BattleUnit[]>([]);
  const [battleEvents, setBattleEvents] = createSignal<BattleCombatEvent[]>([]);
  const [sideBets, setSideBets] = createSignal<SideBet[]>([]);
  const [guarantees, setGuarantees] = createSignal<Guarantee[]>([]);
  const [guaranteePurchases, setGuaranteePurchases] = createSignal<GuaranteePurchase[]>([]);
  const [activePanel, setActivePanel] = createSignal<string | null>(null);
  const [gamePhase, setGamePhase] = createSignal<GamePhase>("voting");
  const [battleDismissed, setBattleDismissed] = createSignal(false);
  const [watchingArenaId, setWatchingArenaId] = createSignal<number | null>(null);
  const [gameOverDismissed, setGameOverDismissed] = createSignal(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = createSignal(false);
  const [gameEvents, setGameEvents] = createSignal<GameEvent[]>([]);
  const [ownedLaborers, setOwnedLaborers] = createSignal<OwnedLaborer[]>([]);
  const [ownedEquipment, setOwnedEquipment] = createSignal<OwnedEquipment[]>([]);

  // Round processing is now server-authoritative via RoundTimerEntry scheduler.
  // Clients are passive observers — room state changes drive the UI.

  onMount(() => {
    const connection = conn();
    if (!connection || !connected()) return;

    const owner = getOwner();
    const owned = <T,>(fn: () => T) => { if (owner) runWithOwner(owner, fn); else fn(); };

    // Subscribe to votes
    connection.db.vote.onInsert((ctx, vote) => {
      owned(() => setVotes((prev) => {
        if (prev.some((v) => v.id === vote.id)) return prev;
        return [...prev, vote];
      }));
    });

    connection.db.vote.onUpdate((ctx, oldVote, newVote) => {
      owned(() => setVotes((prev) =>
        prev.map((v) => (v.id === newVote.id ? newVote : v))
      ));
    });

    connection.db.vote.onDelete((ctx, vote) => {
      owned(() => setVotes((prev) => prev.filter((v) => v.id !== vote.id)));
    });

    // Subscribe to users
    connection.db.user.onInsert((ctx, user) => {
      owned(() => setAllPlayers((prev) => {
        if (prev.some((u) => u.identity.isEqual(user.identity))) return prev;
        return [...prev, user];
      }));
    });

    connection.db.user.onUpdate((ctx, oldUser, newUser) => {
      owned(() => setAllPlayers((prev) =>
        prev.map((u) => (u.identity.isEqual(newUser.identity) ? newUser : u))
      ));
    });

    // Subscribe to GameRoom updates to detect round changes
    connection.db.game_room.onUpdate((ctx, oldRoom, newRoom) => {
      owned(() => {
        if (
          newRoom.id === props.room.id &&
          (oldRoom.gameStatus === "active" || oldRoom.gameStatus === "arena") &&
          newRoom.gameStatus === "completed"
        ) {
          const roundVotes = votes().filter(
            (v) => v.roomId === props.room.id && v.roundNumber === oldRoom.currentRound
          );
          const red = roundVotes.filter((v) => v.color === "red").length;
          const blue = roundVotes.filter((v) => v.color === "blue").length;
          const minority: "red" | "blue" | "tie" =
            red < blue ? "red" : blue < red ? "blue" : "tie";
          setSavedRoundTotals({ red, blue, minority });
          if (minority === "tie" && red + blue > 0) {
            setShowEliminationModal(true);
          }
        }
        if (newRoom.id === props.room.id && newRoom.currentRound > lastProcessedRound()) {
          const prevRound = lastProcessedRound();
          const prevRoundVotes = votes().filter(
            (v) => v.roomId === props.room.id && v.roundNumber === prevRound
          );
          const red = prevRoundVotes.filter((v) => v.color === "red").length;
          const blue = prevRoundVotes.filter((v) => v.color === "blue").length;
          const minority: "red" | "blue" | "tie" =
            red < blue ? "red" : blue < red ? "blue" : "tie";
          setSavedRoundTotals({ red, blue, minority });

          if (prevRound > 0) {
            setShowEliminationModal(true);
          }
          setLastProcessedRound(newRoom.currentRound);
        }
      });
    });

    // Subscribe to transactions for market history
    connection.db.transaction.onInsert((ctx, transaction) => {
      owned(() => setTransactions((prev) => {
        if (prev.some((t) => t.id === transaction.id)) return prev;
        return [...prev, transaction];
      }));
    });

    // Subscribe to units
    connection.db.unit.onInsert((ctx, unit) => {
      owned(() => setServerUnits((prev) => {
        if (prev.some((u) => u.id === unit.id)) return prev;
        return [...prev, unit];
      }));
    });
    connection.db.unit.onUpdate((ctx, oldUnit, newUnit) => {
      owned(() => setServerUnits((prev) => prev.map((u) => (u.id === newUnit.id ? newUnit : u))));
    });
    connection.db.unit.onDelete((ctx, unit) => {
      owned(() => setServerUnits((prev) => prev.filter((u) => u.id !== unit.id)));
    });

    // Subscribe to resources
    connection.db.resource.onInsert((ctx, resource) => {
      owned(() => setServerResources((prev) => {
        if (prev.some((r) => r.id === resource.id)) return prev;
        return [...prev, resource];
      }));
    });
    connection.db.resource.onUpdate((ctx, oldRes, newRes) => {
      owned(() => setServerResources((prev) => prev.map((r) => (r.id === newRes.id ? newRes : r))));
    });
    connection.db.resource.onDelete((ctx, resource) => {
      owned(() => setServerResources((prev) => prev.filter((r) => r.id !== resource.id)));
    });

    // Subscribe to unit stats
    connection.db.unit_stats.onInsert((ctx, stats) => {
      owned(() => setUnitStats((prev) => {
        if (prev.some((s) => s.unitId === stats.unitId)) return prev;
        return [...prev, stats];
      }));
    });
    connection.db.unit_stats.onUpdate((ctx, oldStats, newStats) => {
      owned(() => setUnitStats((prev) => prev.map((s) => (s.unitId === newStats.unitId ? newStats : s))));
    });
    connection.db.unit_stats.onDelete((ctx, stats) => {
      owned(() => setUnitStats((prev) => prev.filter((s) => s.unitId !== stats.unitId)));
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
      owned(() => setUnitInventories((prev) => {
        if (prev.some((i) => i.unitId === inv.unitId)) return prev;
        return [...prev, inv];
      }));
    });
    connection.db.unit_inventory.onUpdate((ctx, oldInv, newInv) => {
      owned(() => setUnitInventories((prev) => prev.map((i) => (i.unitId === newInv.unitId ? newInv : i))));
    });
    connection.db.unit_inventory.onDelete((ctx, inv) => {
      owned(() => setUnitInventories((prev) => prev.filter((i) => i.unitId !== inv.unitId)));
    });

    // Subscribe to task queues
    connection.db.unit_task_queue.onInsert((ctx, task) => {
      owned(() => setUnitTaskQueues((prev) => {
        if (prev.some((t) => t.id === task.id)) return prev;
        return [...prev, task];
      }));
    });
    connection.db.unit_task_queue.onUpdate((ctx, oldTask, newTask) => {
      owned(() => setUnitTaskQueues((prev) => prev.map((t) => (t.id === newTask.id ? newTask : t))));
    });
    connection.db.unit_task_queue.onDelete((ctx, task) => {
      owned(() => setUnitTaskQueues((prev) => prev.filter((t) => t.id !== task.id)));
    });

    // Subscribe to end-round votes
    connection.db.end_round_vote.onInsert((ctx, erv) => {
      owned(() => setEndRoundVotes((prev) => {
        if (prev.some((v) => v.id === erv.id)) return prev;
        return [...prev, erv];
      }));
    });
    connection.db.end_round_vote.onDelete((ctx, erv) => {
      owned(() => setEndRoundVotes((prev) => prev.filter((v) => v.id !== erv.id)));
    });

    // Subscribe to player positions
    const refreshPlayerPositions = () => {
      owned(() => {
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
      });
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

    // Subscribe to new Phase tables
    connection.db.equipment.onInsert((ctx, eq) => owned(() => setEquipment(prev => prev.some(e => e.id === eq.id) ? prev : [...prev, eq])));
    connection.db.equipment.onUpdate((ctx, old, eq) => owned(() => setEquipment(prev => prev.map(e => e.id === eq.id ? eq : e))));
    connection.db.equipment.onDelete((ctx, eq) => owned(() => setEquipment(prev => prev.filter(e => e.id !== eq.id))));
    setEquipment(Array.from(connection.db.equipment.iter()));

    connection.db.owned_laborer.onInsert((_ctx, lab) => owned(() => setOwnedLaborers((prev) => prev.some((x) => x.id === lab.id) ? prev : [...prev, lab])));
    connection.db.owned_laborer.onDelete((_ctx, lab) => owned(() => setOwnedLaborers((prev) => prev.filter((x) => x.id !== lab.id))));
    setOwnedLaborers(Array.from(connection.db.owned_laborer.iter()));
    connection.db.owned_equipment.onInsert((_ctx, item) => owned(() => setOwnedEquipment((prev) => prev.some((x) => x.id === item.id) ? prev : [...prev, item])));
    connection.db.owned_equipment.onDelete((_ctx, item) => owned(() => setOwnedEquipment((prev) => prev.filter((x) => x.id !== item.id))));
    setOwnedEquipment(Array.from(connection.db.owned_equipment.iter()));

    connection.db.battle_arena.onInsert((ctx, a) => owned(() => { setBattleDismissed(false); setBattleArenas(prev => prev.some(x => x.id === a.id) ? prev : [...prev, a]); }));
    connection.db.battle_arena.onUpdate((ctx, old, a) => owned(() => setBattleArenas(prev => prev.map(x => x.id === a.id ? a : x))));
    connection.db.battle_arena.onDelete((ctx, a) => owned(() => setBattleArenas(prev => prev.filter(x => x.id !== a.id))));
    setBattleArenas(Array.from(connection.db.battle_arena.iter()));

    connection.db.battle_unit.onInsert((ctx, bu) => owned(() => setBattleUnits(prev => prev.some(x => x.id === bu.id) ? prev : [...prev, bu])));
    connection.db.battle_unit.onUpdate((ctx, old, bu) => owned(() => setBattleUnits(prev => prev.map(x => x.id === bu.id ? bu : x))));
    connection.db.battle_unit.onDelete((ctx, bu) => owned(() => setBattleUnits(prev => prev.filter(x => x.id !== bu.id))));
    setBattleUnits(Array.from(connection.db.battle_unit.iter()));

    connection.db.battle_combat_event.onInsert((_ctx, ev) => owned(() => setBattleEvents(prev => prev.some(x => x.id === ev.id) ? prev : [...prev, ev])));
    connection.db.battle_combat_event.onDelete((_ctx, ev) => owned(() => setBattleEvents(prev => prev.filter(x => x.id !== ev.id))));
    setBattleEvents(Array.from(connection.db.battle_combat_event.iter()));

    connection.db.side_bet.onInsert((ctx, sb) => owned(() => setSideBets(prev => prev.some(x => x.id === sb.id) ? prev : [...prev, sb])));
    connection.db.side_bet.onUpdate((ctx, old, sb) => owned(() => setSideBets(prev => prev.map(x => x.id === sb.id ? sb : x))));
    connection.db.side_bet.onDelete((ctx, sb) => owned(() => setSideBets(prev => prev.filter(x => x.id !== sb.id))));
    setSideBets(Array.from(connection.db.side_bet.iter()));

    const refreshGuarantees = () => owned(() => setGuarantees(Array.from(connection.db.guarantee.iter())));
    connection.db.guarantee.onInsert(refreshGuarantees);
    connection.db.guarantee.onUpdate(refreshGuarantees);
    connection.db.guarantee.onDelete(refreshGuarantees);
    refreshGuarantees();

    const refreshGuaranteePurchases = () => owned(() => setGuaranteePurchases(Array.from(connection.db.guarantee_purchase.iter())));
    connection.db.guarantee_purchase.onInsert(refreshGuaranteePurchases);
    connection.db.guarantee_purchase.onUpdate(refreshGuaranteePurchases);
    connection.db.guarantee_purchase.onDelete(refreshGuaranteePurchases);
    refreshGuaranteePurchases();

    // Subscribe to game events for the activity feed and replay viewer
    const roomIdStr = props.room.id.toString();
    connection.db.game_event.onInsert((ctx, event) => {
      owned(() => {
        if (event.roomId === roomIdStr) {
          setGameEvents((prev) => [...prev, event]);
        }
      });
    });
    const initialGameEvents = Array.from(connection.db.game_event.iter())
      .filter((e) => e.roomId === roomIdStr);
    setGameEvents(initialGameEvents);

    // Set initial round tracking
    setLastProcessedRound(props.room.currentRound);

    // Leave room automatically when the tab/window is closed to prevent ghost members
    const handleBeforeUnload = () => {
      try {
        connection.reducers.leaveRoom({ roomId: props.room.id });
      } catch (_e) {
        // Best-effort — browser may not wait for async ops on unload
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    onCleanup(() => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    });
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

  const votesRevealed = () =>
    showEliminationModal() || props.room.gameStatus === "completed" || props.room.gameStatus === "arena";

  // Phase-aware HUD: a single source of truth for "what should the player focus
  // on right now". Colony controls recede during Voting and come forward during
  // Action — nothing is ever hidden, only de-emphasized.
  const phaseFocusHint = () => {
    switch (gamePhase()) {
      case "voting": return "🗳️ Trade & vote — minority lives, majority is out.";
      case "action": return "⚡ Colony actions — you can still recast and trade.";
      case "resolution": return "📊 Timeframe ending — votes lock when the timer hits zero.";
    }
  };
  // True while colony/building actions are the priority (Action phase).
  const colonyFocus = () => gamePhase() === "action";

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

  const endedInTie = () =>
    props.room.gameStatus === "completed" && remainingPlayers().length > 2;

  const keptFromThisMatch = createMemo(() => {
    const me = props.currentUser.identity.toHexString();
    return ownedLaborers().filter((lab) => lab.ownerId === me && lab.sourceRoomId === props.room.id);
  });

  const gearNamesFor = (laborerId: number) =>
    ownedEquipment()
      .filter((item) => item.laborerId === laborerId)
      .map((item) => item.itemName)
      .join(" · ");

  const resolvedRoundVotes = () =>
    votes().filter((v) => v.roomId === props.room.id && v.roundNumber === props.room.currentRound);

  const playerPayout = (playerId: string) => {
    if (endedInTie()) {
      const cast = resolvedRoundVotes().filter((v) => v.color === "red" || v.color === "blue");
      const mine = cast.filter((v) => v.playerId === playerId).length;
      if (cast.length === 0) return 0;
      return (props.room.potSize * mine) / cast.length;
    }
    return props.room.potSize / Math.max(remainingPlayers().length, 1);
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
  const [hoveredVoteId, setHoveredVoteId] = createSignal<number | null>(null);
  const [hoveredOwnerId, setHoveredOwnerId] = createSignal<string | null>(null);
  const [playerMenu, setPlayerMenu] = createSignal<PlayerMenuTarget | null>(null);
  const [whisperTarget, setWhisperTarget] = createSignal<{ id: string; name: string } | null>(null);
  const [whisperText, setWhisperText] = createSignal("");
  const [voteFlashColor, setVoteFlashColor] = createSignal<string | null>(null);
  const [listPrice, setListPrice] = createSignal(5);

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
          team: (visibleVoteColor(
            unit.ownerId,
            unit.voteColor,
            props.currentUser.identity.toHexString(),
            votesRevealed(),
          ) || "unset") as TeamColor,
          ownerId: unit.ownerId,
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

  const colonyBuildings = createMemo<ColonyBuilding[]>(() =>
    serverUnits()
      .filter((u) => u.roomId === props.room.id && u.buildingType)
      .map((u) => ({
        id: u.id,
        buildingType: u.buildingType!,
        x: u.position.x - 50,
        z: u.position.y - 50,
        constructionProgress: u.constructionProgress ?? undefined,
        constructionMax: u.constructionMax ?? undefined,
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

  const handleBuyVote = (voteId: number, price: number) => {
    buyListedVote(conn(), {
      voteId,
      buyerId: props.currentUser.identity.toHexString(),
      price,
      walletBalance: props.currentUser.walletBalance,
    });
  };

  const selectedVotes = createMemo(() =>
    myVotes().filter((v) => viewportSelectedIds().includes(v.id)),
  );

  const voteGuaranteed = (voteId: number) =>
    isVoteGuaranteed(voteId, guarantees(), guaranteePurchases());

  const selectedListed = createMemo(() => selectedVotes().filter((v) => v.isForSale));
  const selectedUnlisted = createMemo(() =>
    selectedVotes().filter((v) => !v.isForSale && !voteGuaranteed(v.id)),
  );
  const selectedGuaranteed = createMemo(() =>
    selectedVotes().filter((v) => voteGuaranteed(v.id)),
  );

  const handleListSelected = () => {
    const price = listPrice();
    for (const vote of selectedUnlisted()) {
      listVote(conn(), vote.id, price);
    }
  };

  const handleUnlistSelected = () => {
    for (const vote of selectedListed()) {
      unlistVote(conn(), vote.id);
    }
  };

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
  const [marketOpen, setMarketOpen] = createSignal(true);

  const activeOffers = createMemo(() => {
    const offers: { unitId: number; offerId: number; type: "sell" | "buy" | "guarantee"; price: number; color?: "red" | "blue" | null }[] = [];
    const myUnits = serverUnits().filter((u) => u.roomId === props.room.id);
    for (const v of votes()) {
      if (v.roomId !== props.room.id || !v.isForSale) continue;
      const unit = myUnits.find((u) => u.ownerId === v.playerId);
      if (unit) {
        offers.push({
          unitId: unit.id,
          offerId: v.id,
          type: "sell",
          price: v.salePrice || 0,
          color: (visibleVoteColor(v.playerId, v.color, props.currentUser.identity.toHexString(), votesRevealed()) as "red" | "blue") || null,
        });
      }
    }
    return offers;
  });

  const handleTradeOfferClick = (offerId: number, screenX: number, screenY: number) => {
    setTradePopup({ offerId, x: screenX, y: screenY });
  };

  const openPlayerMenu = (playerId: string, x: number, y: number, unitId?: number) => {
    const player = allPlayers().find((p) => p.identity.toHexString() === playerId);
    const listed = unitId != null
      ? votes().find((v) => v.id === unitId && v.isForSale)
      : votes().find((v) => v.playerId === playerId && v.isForSale);
    setPlayerMenu({
      playerId,
      name: player?.name || "Player",
      unitId,
      isSelf: playerId === props.currentUser.identity.toHexString(),
      listedPrice: listed?.salePrice ?? undefined,
      x,
      y,
    });
  };

  const handleWorldContextMenu = (target: { unitId?: number; playerId?: string }, x: number, y: number) => {
    if (target.playerId) {
      openPlayerMenu(target.playerId, x, y, target.unitId);
      return;
    }
    if (target.unitId != null) {
      const unit = serverUnits().find((u) => u.id === target.unitId);
      if (unit?.ownerId) openPlayerMenu(unit.ownerId, x, y, target.unitId);
    }
  };

  const startWhisper = (playerId: string, name: string) => {
    setPlayerMenu(null);
    setWhisperTarget({ id: playerId, name });
    setWhisperText("");
    setChatOpen(true);
  };

  const sendWhisper = () => {
    const target = whisperTarget();
    const text = whisperText().trim();
    const connection = conn();
    if (!target || !text || !connection) return;
    try {
      connection.reducers.sendChatMessage({
        roomId: `game_${props.room.id}`,
        text: encodeWhisper(target.id, text),
        roundNumber: props.room.currentRound,
      });
      setWhisperText("");
      ToastHelper.success("Whisper sent", `To ${target.name}`);
    } catch (e: any) {
      ToastHelper.error(e?.message || "Failed to send whisper");
    }
  };

  const hoverHint = () => {
    const owner = allPlayers().find((p) => p.identity.toHexString() === hoveredOwnerId());
    const vote = votes().find((v) => v.id === hoveredVoteId());
    const who =
      hoveredOwnerId() === props.currentUser.identity.toHexString()
        ? "You"
        : owner?.name || "Player";
    const shown = visibleVoteColor(vote?.playerId, vote?.color, props.currentUser.identity.toHexString(), votesRevealed());
    const color = shown ? ` · ${shown}` : "";
    const listed = vote?.isForSale ? ` · listed $${vote.salePrice}` : "";
    return `${who}${color}${listed}`;
  };

  const offerToBuyFrom = (playerId: string) => {
    setPlayerMenu(null);
    setChatOpen(true);
    makeOffer(conn(), {
      roomId: props.room.id,
      roundNumber: props.room.currentRound,
      offerType: "buy_vote",
      price: listPrice() > 0 ? listPrice() : 5,
    });
    const name = allPlayers().find((p) => p.identity.toHexString() === playerId)?.name || "them";
    ToastHelper.info("Buy offer posted", `An open bid is in chat — ${name} can accept it.`);
  };

  // ── Vote-market ticker ────────────────────────────────────────────────
  // Persistent, glanceable price signal so players can track the vote market
  // without opening the Market panel. Recent vote sales drive "last trade";
  // open listings drive the lowest ask per color (what you'd pay to buy now).
  const voteSales = createMemo(() =>
    transactions()
      .filter((t) => t.roomId === props.room.id && t.transactionType === "vote_sale")
      .sort((a, b) => Number(b.timestamp) - Number(a.timestamp)),
  );
  const lastTradePrice = () => voteSales()[0]?.amount ?? null;
  const prevTradePrice = () => voteSales()[1]?.amount ?? null;
  const tradeCount = () => voteSales().length;
  const openListings = createMemo(() =>
    votes().filter((v) => v.roomId === props.room.id && v.isForSale),
  );
  const lowestAsk = (color: "red" | "blue") => {
    const prices = openListings()
      .filter((v) => v.color === color)
      .map((v) => v.salePrice || 0)
      .filter((p) => p > 0);
    return prices.length ? Math.min(...prices) : null;
  };
  const anyLowestAsk = () => {
    const prices = openListings()
      .map((v) => v.salePrice || 0)
      .filter((p) => p > 0);
    return prices.length ? Math.min(...prices) : null;
  };

  let seededListPrice = false;
  createEffect(() => {
    if (seededListPrice) return;
    if (lastTradePrice() === null && anyLowestAsk() === null) return;
    setListPrice(suggestedListPrice(lastTradePrice(), anyLowestAsk()));
    seededListPrice = true;
  });

  // Flash the ticker briefly whenever a new trade settles, so the "action"
  // of vote trading is felt even when the Market panel is closed.
  let lastSeenTradeId: number | null = null;
  const [tradeFlash, setTradeFlash] = createSignal(false);
  createEffect(() => {
    const latestId = voteSales()[0]?.id;
    if (latestId === undefined) return;
    if (latestId === lastSeenTradeId) return;
    const firstRun = lastSeenTradeId === null;
    lastSeenTradeId = latestId;
    if (firstRun) return; // don't flash on initial load
    setTradeFlash(true);
    const t = setTimeout(() => setTradeFlash(false), 900);
    onCleanup(() => clearTimeout(t));
  });

  const handleMoveUnit = (unitId: number, x: number, z: number) => {
    const connection = conn();
    if (!connection) return;
    try {
      connection.reducers.moveUnit({ unitId, targetPosition: { x, y: z } });
    } catch { ToastHelper.error("Failed to move unit"); }
  };

  const handleQueueTask = (taskType: string, targetId: string) => {
    const connection = conn();
    if (!connection) return;
    const ids = viewportSelectedIds();
    if (ids.length === 0) return;
    try {
      for (const unitId of ids) {
        connection.reducers.queueUnitTask({ unitId, taskType, targetId });
      }
    } catch { ToastHelper.error("Failed to queue task"); }
  };

  const handleHarvestKind = (resourceType: string) => {
    const connection = conn();
    if (!connection) return;
    const ids = viewportSelectedIds();
    if (ids.length === 0) return;
    try {
      for (const unitId of ids) {
        connection.reducers.harvestKind({ unitId, resourceType });
      }
    } catch { ToastHelper.error("Could not harvest"); }
  };

  const selectedOwnedIds = () => {
    const me = props.currentUser.identity.toHexString();
    return viewportSelectedIds().filter((id) =>
      serverUnits().some((u) => u.id === id && u.ownerId === me && u.unitType === "minion"),
    );
  };

  const hasCamp = createMemo(() => {
    const me = props.currentUser.identity.toHexString();
    return serverUnits().some(
      (u) => u.roomId === props.room.id && u.ownerId === me && u.buildingType === "camp",
    );
  });

  const handleFoundCamp = () => {
    const connection = conn();
    if (!connection) return;
    const unitId = selectedOwnedIds()[0];
    if (unitId == null) return;
    try {
      connection.reducers.foundCamp({ unitId });
    } catch { ToastHelper.error("Could not found a camp"); }
  };

  const handleRefine = (rawType: string) => {
    const connection = conn();
    if (!connection) return;
    try {
      for (const unitId of selectedOwnedIds()) {
        connection.reducers.refineAtCamp({ unitId, rawType });
      }
    } catch { ToastHelper.error("Could not refine"); }
  };

  const handleCraftAndEquip = (recipe: string) => {
    const connection = conn();
    if (!connection) return;
    try {
      for (const unitId of selectedOwnedIds()) {
        connection.reducers.craftAndEquip({ unitId, recipe });
      }
    } catch { ToastHelper.error("Could not craft"); }
  };

  const handleSendHome = () => {
    const connection = conn();
    if (!connection) return;
    const unitId = selectedOwnedIds()[0];
    if (unitId == null) return;
    try {
      connection.reducers.transferLaborerToParent({ unitId, parentServerId: 0 });
      ToastHelper.success("Sent home", "Bag and minion saved to your stash");
    } catch { ToastHelper.error("Could not send home"); }
  };

  const handleEquipItem = (equipmentId: number, unitId: number) => {
    const connection = conn();
    if (!connection) return;
    try {
      connection.reducers.equipItem({ equipmentId, unitId });
    } catch { ToastHelper.error("Failed to equip item"); }
  };

  const handleUnequipItem = (equipmentId: number) => {
    const connection = conn();
    if (!connection) return;
    try {
      connection.reducers.unequipItem({ equipmentId });
    } catch { ToastHelper.error("Failed to unequip item"); }
  };

  const handlePlaceSideBet = (betType: string, betTarget: string, amount: number) => {
    const connection = conn();
    if (!connection) return;
    try {
      connection.reducers.placeSideBet({ roomId: props.room.id, betType, betTarget, amount });
      ToastHelper.success("Bet Placed", `$${amount} on ${betTarget}`);
    } catch { ToastHelper.error("Failed to place bet"); }
  };

  createEffect(() => {
    const latest = battleArenas()
      .filter((a) => a.roomId === props.room.id)
      .sort((a, b) => b.id - a.id)[0];
    if (!latest) return;
    if (latest.status !== "completed" || props.room.gameStatus === "arena") {
      setWatchingArenaId(latest.id);
    }
  });

  const activeBattle = createMemo(() => {
    if (battleDismissed()) return undefined;
    const id = watchingArenaId();
    if (id == null) return undefined;
    return battleArenas().find((a) => a.id === id);
  });

  const isEliminated = createMemo(() =>
    props.room.eliminatedPlayers.includes(props.currentUser.identity.toHexString())
  );

  let _lastPosUpdate = 0;
  let _lastPosX = 0;
  let _lastPosZ = 0;

  const handleAvatarPositionUpdate = (x: number, z: number, rotY: number, moving: boolean) => {
    const now = Date.now();
    if (now - _lastPosUpdate < 100) return;
    if (Math.abs(x - _lastPosX) < 0.1 && Math.abs(z - _lastPosZ) < 0.1 && !moving) return;
    _lastPosX = x;
    _lastPosZ = z;
    _lastPosUpdate = now;
    const connection = conn();
    if (!connection || !connected()) return;
    try {
      connection.reducers.updatePlayerPosition({
        roomId: props.room.id,
        x,
        z,
        rotationY: rotY,
        isMoving: moving,
      });
    } catch {
      // Position updates are fire-and-forget; silently ignore errors
    }
  };

  return (
    <ErrorBoundary>
      <div class="fixed inset-0 z-50 overflow-hidden bg-[#1a1a2e]">
        {/* ===== FULL-SCREEN 3D VIEWPORT (layer 0) ===== */}
        <div class="absolute inset-0 z-0">
          <ColonyViewport
            units={colonyUnits()}
            resources={colonyResources().length > 0 ? colonyResources() : undefined}
            buildings={colonyBuildings().length > 0 ? colonyBuildings() : undefined}
            selectedIds={viewportSelectedIds}
            onSelect={setViewportSelectedIds}
            playerName={props.currentUser.name || "Player"}
            otherPlayers={otherPlayerAvatars()}
            onPositionUpdate={handleAvatarPositionUpdate}
            onSetTeam={handleViewportSetTeam}
            hoveredUnitId={hoveredVoteId()}
            hoveredOwnerId={hoveredOwnerId()}
            localPlayerId={props.currentUser.identity.toHexString()}
            activeOffers={activeOffers()}
            onMoveUnit={handleMoveUnit}
            onTradeOfferClick={handleTradeOfferClick}
            onHoverUnit={setHoveredVoteId}
            onHoverPlayer={setHoveredOwnerId}
            onWorldContextMenu={handleWorldContextMenu}
          />
        </div>

        {/* ===== HUD OVERLAYS (layer 10+) ===== */}

        {/* Floating chat bubbles (bottom-left, layer 20) */}
        <FloatingChatBubbles roomId={props.room.id} players={allPlayers()} />

        {/* Unit Context Panel (right side) — shifts left of the Market panel when
            it's open so the two right-side panels never overlap. */}
        <Show when={selectedUnit()}>
          <div
            class="absolute top-16 z-30 pointer-events-none transition-all"
            classList={{
              "right-[19rem] xl:right-[21rem]": marketOpen(),
              "right-4": !marketOpen(),
            }}
          >
            <UnitContextPanel
              unit={selectedUnit()!}
              stats={selectedUnitStats()}
              inventory={selectedUnitInventory()}
              tasks={selectedUnitTasks()}
              resources={roomResources()}
              canSeeVoteColor={
                votesRevealed() ||
                selectedUnit()!.ownerId === props.currentUser.identity.toHexString()
              }
              onClose={() => setViewportSelectedIds([])}
              onSetVoteColor={handleSetUnitVoteColor}
              onQueueTask={handleQueueTask}
              onHarvestKind={handleHarvestKind}
              onFoundCamp={handleFoundCamp}
              onRefine={handleRefine}
              onCraft={handleCraftAndEquip}
              onSendHome={handleSendHome}
              hasCamp={hasCamp()}
              onCancelTask={handleCancelTask}
            />
          </div>
        </Show>

        {/* Dev tools — only visible on localhost */}
        <Show when={typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")}>
          <div class="absolute right-2 top-14 z-40 flex gap-1">
            <AdminPanel />
          </div>
        </Show>
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
            <span class="rounded bg-white/10 px-2 py-0.5 text-xs font-medium text-white/60" title="Current round">
              Round {props.room.currentRound}
            </span>
          </div>

          <div class="mx-1 h-5 w-px bg-white/20" />

          <div class="flex items-center gap-2 text-white/80" data-testid={TID.roundTimer}>
            <RoundTimer
              roundNumber={props.room.currentRound}
              roundStartTime={props.room.startTime ? BigInt(props.room.startTime) : undefined}
              roundDuration={props.room.roundDuration}
              onPhaseChange={setGamePhase}
            />
          </div>

          {/* In-game help button */}
          {(() => {
            const [helpOpen, setHelpOpen] = createSignal(false);
            return (
              <div class="relative">
                <button
                  class="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs text-white/50 hover:bg-white/20 hover:text-white/80 transition-colors"
                  title="Game rules"
                  onClick={() => setHelpOpen(!helpOpen())}
                >
                  ?
                </button>
                <Show when={helpOpen()}>
                  <div class="absolute left-0 top-8 z-50 w-72 rounded-xl bg-black/90 backdrop-blur-xl border border-white/10 p-4 shadow-2xl text-xs text-white/70 space-y-2">
                    <p class="font-semibold text-white">The one rule</p>
                    <p>The <strong class="text-emerald-300">minority</strong> color stays as votes. The <strong class="text-rose-300">majority</strong> fights in the arena; survivors go back to your roster unless this was the last round. A tie ends the game and splits the pot by vote count.</p>
                    <p class="font-semibold text-white mt-2">🗳️ Casting</p>
                    <p>Each chip is a vote you own. Click Red/Blue or drag a chip onto a color. Split across both colors and you cannot be fully eliminated. Unplaced chips split evenly when the round locks — they no longer die. Other players' colors stay hidden until the round is counted.</p>
                    <p class="font-semibold text-white mt-2">💱 Trading</p>
                    <p>List a selected vote for a price, or buy someone else's listing in the Market. A bought vote becomes yours — recast it however you want. Guarantees lock a vote to a color and cannot be sold or broken.</p>
                    <p class="text-white/40 mt-2">Click ? again to close.</p>
                  </div>
                </Show>
              </div>
            );
          })()}

          <Show when={props.room.gameStatus === "active" && !props.room.eliminatedPlayers.includes(props.currentUser.identity.toHexString())}>
            {(() => {
              const count = () => endRoundVotesForCurrentRound().length;
              const total = () => remainingPlayers().length;
              const pct = () => total() > 0 ? (count() / total()) * 100 : 0;
              const nearThreshold = () => pct() >= 60;
              return (
                <button
                  onClick={handleVoteEndRound}
                  disabled={hasVotedEndRound()}
                  data-testid={TID.endRoundBtn}
                  class="relative overflow-hidden rounded-md text-xs px-3 py-1.5 font-medium transition-all border"
                  classList={{
                    "bg-green-600/80 text-white border-green-500/50 cursor-default": hasVotedEndRound(),
                    "border-white/20 text-white/70 hover:bg-white/10 hover:text-white cursor-pointer": !hasVotedEndRound(),
                    "animate-pulse": nearThreshold() && !hasVotedEndRound(),
                  }}
                >
                  <div
                    class="absolute inset-0 bg-green-500/20 transition-all duration-500"
                    style={{ width: `${pct()}%` }}
                  />
                  <span class="relative z-10 flex items-center gap-1.5">
                    {hasVotedEndRound() ? "Ready" : "End Round"}
                    <span class="opacity-70" data-testid={TID.endRoundCount}>
                      {count()}/{total()}
                    </span>
                  </span>
                </button>
              );
            })()}
          </Show>

          <div class="flex-1" />

          {/* Vote-market ticker — glanceable last-trade price + lowest ask per
              color, with a flash on each new trade. Click to open the Market. */}
          <Show when={props.room.gameStatus === "active"}>
            <button
              onClick={() => setMarketOpen(true)}
              title="Vote market — last trade price and lowest ask to buy a Red/Blue vote. Click to open Market."
              data-testid="vote-market-ticker"
              class="flex items-center gap-2 rounded-md border px-2.5 py-1 transition-colors"
              classList={{
                "border-amber-400/60 bg-amber-400/20": tradeFlash(),
                "border-white/10 bg-white/5 hover:bg-white/10": !tradeFlash(),
              }}
            >
              <span class="text-[10px] uppercase tracking-wide text-white/40">Votes</span>
              <span class="flex items-center gap-1 text-xs">
                <span class="text-white/40">Last</span>
                <Show when={lastTradePrice() !== null} fallback={<span class="text-white/30">—</span>}>
                  <span class="font-semibold text-white">${lastTradePrice()!.toFixed(0)}</span>
                  <Show when={prevTradePrice() !== null && lastTradePrice() !== prevTradePrice()}>
                    <span
                      classList={{
                        "text-emerald-400": lastTradePrice()! > (prevTradePrice() ?? 0),
                        "text-red-400": lastTradePrice()! < (prevTradePrice() ?? 0),
                      }}
                    >
                      {lastTradePrice()! > (prevTradePrice() ?? 0) ? "▲" : "▼"}
                    </span>
                  </Show>
                </Show>
              </span>
              <span class="flex items-center gap-1.5 border-l border-white/10 pl-2 text-xs">
                <Show
                  when={votesRevealed()}
                  fallback={
                    <span class="flex items-center gap-0.5" title="Lowest ask — vote colors stay hidden until the round ends">
                      <span class="text-white/40">Ask</span>
                      <span class="text-white/70">{anyLowestAsk() !== null ? `$${anyLowestAsk()!.toFixed(0)}` : "—"}</span>
                    </span>
                  }
                >
                  <span class="flex items-center gap-0.5" title="Lowest ask — Red vote">
                    <span class="h-2 w-2 rounded-full bg-red-500" />
                    <span class="text-white/70">{lowestAsk("red") !== null ? `$${lowestAsk("red")!.toFixed(0)}` : "—"}</span>
                  </span>
                  <span class="flex items-center gap-0.5" title="Lowest ask — Blue vote">
                    <span class="h-2 w-2 rounded-full bg-blue-500" />
                    <span class="text-white/70">{lowestAsk("blue") !== null ? `$${lowestAsk("blue")!.toFixed(0)}` : "—"}</span>
                  </span>
                </Show>
                <span class="text-[10px] text-white/30" title="Total vote trades this game">
                  {tradeCount()}⇄
                </span>
              </span>
            </button>
          </Show>

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
            <Show when={props.currentUser.totalProfitLoss !== 0}>
              <span
                class="text-[10px]"
                classList={{
                  "text-emerald-400": props.currentUser.totalProfitLoss > 0,
                  "text-red-400": props.currentUser.totalProfitLoss < 0,
                }}
                data-testid={TID.profitLoss}
                title="Total profit/loss this session"
              >
                ({props.currentUser.totalProfitLoss >= 0 ? "+" : ""}
                ${props.currentUser.totalProfitLoss.toFixed(2)})
              </span>
            </Show>
          </div>

          <div class="flex items-center gap-0.5 border-l border-white/10 pl-2">
            <a href="/leaderboard" title="Leaderboard" class="flex items-center justify-center rounded p-1.5 text-white/40 hover:bg-white/10 hover:text-white/70 transition-colors">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </a>
            <a href="/profile" title="Profile" class="flex items-center justify-center rounded p-1.5 text-white/40 hover:bg-white/10 hover:text-white/70 transition-colors">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </a>
          </div>

          <SoundToggle />

          <Show
            when={!showLeaveConfirm()}
            fallback={
              <div class="flex items-center gap-1.5 rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1">
                <span class="text-[11px] text-red-300">Forfeit buy-in?</span>
                <button
                  class="rounded bg-red-600/80 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-red-500"
                  onClick={handleLeaveRoom}
                  data-testid={TID.leaveRoomBtn}
                >
                  Leave
                </button>
                <button
                  class="rounded bg-white/10 px-2 py-0.5 text-[10px] text-white/60 hover:bg-white/20"
                  onClick={() => setShowLeaveConfirm(false)}
                >
                  Cancel
                </button>
              </div>
            }
          >
            <Button
              size="sm"
              variant="ghost"
              class="text-red-400/80 hover:bg-red-500/20 hover:text-red-300"
              onClick={() => setShowLeaveConfirm(true)}
              title="Leave Room"
              data-testid={TID.leaveRoomBtn}
            >
              Leave
            </Button>
          </Show>
        </div>

        {/* Phase focus hint — guides attention each phase without removing any
            controls. Centered under the top bar; non-interactive. */}
        <Show when={props.room.gameStatus === "active"}>
          <div
            class="pointer-events-none absolute left-1/2 top-14 z-20 -translate-x-1/2 flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium backdrop-blur-md transition-colors"
            classList={{
              "border-amber-400/40 bg-amber-500/15 text-amber-200": gamePhase() === "voting",
              "border-green-400/40 bg-green-500/15 text-green-200": gamePhase() === "action",
              "border-rose-400/40 bg-rose-500/15 text-rose-200": gamePhase() === "resolution",
            }}
            data-testid="phase-focus-hint"
          >
            {phaseFocusHint()}
          </div>
        </Show>
        <Show when={props.room.gameStatus === "arena"}>
          <button
            class="absolute left-1/2 top-14 z-20 -translate-x-1/2 flex items-center gap-1.5 rounded-full border border-rose-400/50 bg-rose-500/20 px-3 py-1 text-[11px] font-medium text-rose-100 backdrop-blur-md"
            data-testid="arena-focus-hint"
            onClick={() => setBattleDismissed(false)}
          >
            Majority melee — survivors return to your roster unless this is the last round
          </button>
        </Show>

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
                  const fate = () => playerFateAtLock(playerVotes(), votes().filter((v) => v.roomId === props.room.id));

                  return (
                    <div
                      class="flex items-center gap-2 rounded-md border-l-[3px] bg-white/10 p-1.5 transition-all hover:bg-white/15"
                      classList={{
                        "ring-1 ring-blue-400/60": isCurrentUser,
                        "ring-1 ring-amber-400/50 bg-white/15": !isCurrentUser && hoveredOwnerId() === player.identity.toHexString(),
                        [accentColors[playerIndex() % accentColors.length]]: true,
                      }}
                      onMouseEnter={() => setHoveredOwnerId(player.identity.toHexString())}
                      onMouseLeave={() => setHoveredOwnerId(null)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        openPlayerMenu(player.identity.toHexString(), e.clientX, e.clientY);
                      }}
                      title={isCurrentUser ? "You" : "Right-click to whisper or offer a trade"}
                    >
                      <div class="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold text-white/80">
                        {(player.name || "A")[0].toUpperCase()}
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="truncate text-xs font-medium text-white/90">
                          {player.name || "Anonymous"}
                          {isCurrentUser && <span class="text-[10px] text-blue-400 ml-1">(you)</span>}
                        </div>
                        <div class="flex items-center gap-1.5 text-[10px] text-white/40">
                          <div class="flex items-center gap-0.5">
                            <For each={playerVotes()}>
                              {(v) => {
                                const shown = () =>
                                  visibleVoteColor(
                                    v.playerId,
                                    v.color,
                                    props.currentUser.identity.toHexString(),
                                    votesRevealed(),
                                  );
                                return (
                                <div
                                  class="h-1.5 w-1.5 rounded-full"
                                  classList={{
                                    "bg-red-400": shown() === "red",
                                    "bg-blue-400": shown() === "blue",
                                    "bg-white/30": !shown(),
                                  }}
                                  title={
                                    shown()
                                      ? `Vote #${v.id}: ${shown()}${v.isForSale ? ` · listed $${v.salePrice}` : ""}`
                                      : v.isForSale
                                        ? `Vote listed $${v.salePrice} — color hidden until the round ends`
                                        : "Vote color hidden until the round ends"
                                  }
                                />
                                );
                              }}
                            </For>
                            <span class="ml-0.5">{playerVotes().length}v</span>
                          </div>
                          <span>${player.walletBalance.toFixed(0)}</span>
                          <Show when={fate() === "no_tickets"}>
                            <span
                              class="rounded px-1 py-px text-[9px] font-semibold uppercase tracking-wide bg-amber-500/20 text-amber-300"
                              title="No votes held — buy one before the round ends or you leave"
                            >
                              {votesRevealed() ? "out" : "0 votes"}
                            </span>
                          </Show>
                          <Show when={votesRevealed() && fate() !== "undecided" && fate() !== "no_tickets"}>
                            <span
                              class="rounded px-1 py-px text-[9px] font-semibold uppercase tracking-wide"
                              classList={{
                                "bg-emerald-500/20 text-emerald-300": fate() === "survive",
                                "bg-rose-500/20 text-rose-300": fate() === "eliminated",
                                "bg-amber-500/20 text-amber-300": fate() === "tie",
                              }}
                              title={
                                fate() === "survive"
                                  ? "Would survive if the round locked now"
                                  : fate() === "eliminated"
                                    ? "Would be eliminated if the round locked now"
                                    : "Board is tied — pot would split"
                              }
                            >
                              {fate() === "survive" ? "lives" : fate() === "eliminated" ? "out" : "tie"}
                            </span>
                          </Show>
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
              <Show when={openListings().length > 0}>
                <span class="rounded bg-amber-500/25 px-1 text-[9px] font-bold text-amber-200">
                  {openListings().length} for sale
                </span>
              </Show>
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
                players={allPlayers()}
                votesRevealed={votesRevealed()}
              />
            </div>
          </Show>
        </div>

        {/* Floating panel buttons along top-right of viewport — sits just left of
            the Market panel, tracking its open/collapsed width so they never overlap.
            Colony controls recede during Voting and come forward during the Action
            phase (phase-aware emphasis; still fully clickable at all times). */}
        <div
          class="absolute top-14 z-20 flex flex-col gap-1 transition-all"
          classList={{
            "right-[19rem] xl:right-[21rem]": marketOpen(),
            "right-12": !marketOpen(),
            "opacity-100": colonyFocus() || activePanel() !== null,
            "opacity-50 hover:opacity-100": !colonyFocus() && activePanel() === null,
          }}
        >
          {[
            { key: "equipment", label: "Equip", icon: "⚔️" },
            { key: "sidebets", label: "Bet", icon: "💰" },
          ].map(btn => (
            <button
              class="w-12 rounded-lg text-[9px] font-bold transition-all border flex flex-col items-center py-1.5 px-1 gap-0.5"
              classList={{
                "bg-amber-500/30 border-amber-400/50 text-amber-200": activePanel() === btn.key,
                "bg-black/40 backdrop-blur border-white/10 text-white/50 hover:bg-white/10 hover:text-white/70": activePanel() !== btn.key,
              }}
              onClick={() => setActivePanel(activePanel() === btn.key ? null : btn.key)}
              title={btn.label}
            >
              <span class="text-sm leading-none">{btn.icon}</span>
              <span class="leading-none">{btn.label}</span>
            </button>
          ))}
        </div>

        <Show when={activePanel() === "equipment"}>
          <div class="absolute left-60 top-14 bottom-20 z-20 w-80 overflow-auto rounded-lg bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl">
            <EquipmentPanel
              selectedUnitId={viewportSelectedIds().length === 1 ? viewportSelectedIds()[0] : null}
              equipment={equipment().filter(e => e.roomId === props.room.id)}
              onEquip={handleEquipItem}
              onUnequip={handleUnequipItem}
            />
          </div>
        </Show>

        <Show when={activePanel() === "sidebets"}>
          <div class="absolute left-60 top-14 bottom-20 z-20 w-80 overflow-auto rounded-lg bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl">
            <SideBetPanel
              roomId={props.room.id}
              roundNumber={props.room.currentRound}
              sideBets={sideBets().filter(sb => sb.roomId === props.room.id)}
              players={remainingPlayers()}
              currentUserId={props.currentUser.identity.toHexString()}
              onPlaceBet={handlePlaceSideBet}
            />
          </div>
        </Show>

        {/* Battle Arena Overlay */}
        <Show when={activeBattle()}>
          {(arena) => (
            <BattleArenaViewport
              arena={arena()}
              battleUnits={battleUnits().filter(bu => bu.arenaId === arena().id)}
              events={battleEvents().filter(ev => ev.arenaId === arena().id)}
              ownerLabel={(ownerId) => resolvePlayerName(ownerId, conn())}
              onClose={() => setBattleDismissed(true)}
              onWatchingDone={() => setBattleDismissed(true)}
            />
          )}
        </Show>

        {/* ── BOTTOM CENTER: Vote Controls + Chat ── */}
        <div class="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 w-full max-w-2xl px-3">
          <VoteCoach onOpenMarket={() => setMarketOpen(true)} />
          {/* Vote control bar */}
          <div class="rounded-xl bg-black/50 backdrop-blur-md p-3 border border-white/10 shadow-2xl">
            {/* Top row: vote summary + chips */}
            <div class="flex items-center gap-2 mb-2">
              <span class="text-xs font-semibold text-white/70">Your Votes ({myVotes().length})</span>
              <Show
                when={hoveredOwnerId() || hoveredVoteId() != null}
                fallback={<span class="text-[10px] text-white/35">hover a unit to see its owner · right-click a player to whisper</span>}
              >
                <span class="text-[10px] text-amber-200/80">{hoverHint()}</span>
              </Show>
              <div class="flex gap-1 ml-auto">
                <span
                  class="rounded bg-red-500/30 px-1.5 py-0.5 text-[10px] font-bold text-red-300 border border-red-500/30"
                  title={`${redVotes().length} vote${redVotes().length !== 1 ? "s" : ""} cast for Red`}
                >
                  {redVotes().length} 🔴
                </span>
                <span
                  class="rounded bg-blue-500/30 px-1.5 py-0.5 text-[10px] font-bold text-blue-300 border border-blue-500/30"
                  title={`${blueVotes().length} vote${blueVotes().length !== 1 ? "s" : ""} cast for Blue`}
                >
                  {blueVotes().length} 🔵
                </span>
                <Show when={unsetVotes().length > 0}>
                  <span class="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-white/50 border border-white/10" title="Votes not yet placed on a color">
                    {unsetVotes().length} ❓
                  </span>
                </Show>
              </div>
            </div>

            {/* Vote chips */}
            <div class="flex flex-wrap gap-1 mb-2">
              <For each={myVotes()}>
                {(vote) => {
                  const isSelected = () => viewportSelectedIds().includes(vote.id);
                  const isDragging = () => draggedVote()?.id === vote.id;
                  return (
                    <button
                      draggable={true}
                      title={
                        voteGuaranteed(vote.id)
                          ? "Guaranteed — color is locked and this vote cannot be sold"
                          : vote.isForSale
                            ? `Listed for $${(vote.salePrice || 0).toFixed(2)} — click to select, drag to recast`
                            : "Click to select, drag onto Red/Blue to cast, then List to sell"
                      }
                      class="flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium transition-all cursor-grab active:cursor-grabbing"
                      classList={{
                        "border-red-400/60 bg-red-500/20 text-red-300": vote.color === "red" && !vote.isForSale && !voteGuaranteed(vote.id),
                        "border-blue-400/60 bg-blue-500/20 text-blue-300": vote.color === "blue" && !vote.isForSale && !voteGuaranteed(vote.id),
                        "border-dashed border-white/20 bg-white/5 text-white/40": !vote.color && !vote.isForSale && !voteGuaranteed(vote.id),
                        "border-amber-400/70 bg-amber-500/15 text-amber-200": vote.isForSale && !voteGuaranteed(vote.id),
                        "border-violet-400/70 bg-violet-500/15 text-violet-200": voteGuaranteed(vote.id),
                        "ring-2 ring-green-400/70 ring-offset-1 ring-offset-transparent": isSelected(),
                        "scale-110 shadow-lg shadow-amber-400/20": hoveredVoteId() === vote.id,
                        "opacity-40": isDragging(),
                      }}
                      onDragStart={(e) => {
                        if (e.dataTransfer) {
                          e.dataTransfer.effectAllowed = "move";
                          e.dataTransfer.setData("text/plain", String(vote.id));
                        }
                        handleDragStart(vote);
                      }}
                      onDragEnd={() => setDraggedVote(null)}
                      onClick={() => {
                        setViewportSelectedIds(prev =>
                          prev.includes(vote.id) ? prev.filter(id => id !== vote.id) : [...prev, vote.id]
                        );
                      }}
                      onMouseEnter={() => {
                        setHoveredVoteId(vote.id);
                        setHoveredOwnerId(props.currentUser.identity.toHexString());
                      }}
                      onMouseLeave={() => {
                        setHoveredVoteId(null);
                        setHoveredOwnerId(null);
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
                      <Show when={voteGuaranteed(vote.id)}>
                        <span class="rounded bg-violet-500/30 px-1 text-[9px] font-bold text-violet-200">
                          locked
                        </span>
                      </Show>
                      <Show when={vote.isForSale && !voteGuaranteed(vote.id)}>
                        <span class="rounded bg-amber-500/30 px-1 text-[9px] font-bold text-amber-200">
                          ${vote.salePrice}
                        </span>
                      </Show>
                    </button>
                  );
                }}
              </For>
            </div>

            <VoteTallyBoard
              roomVotes={votes().filter((v) => v.roomId === props.room.id)}
              myVotes={myVotes()}
              revealed={votesRevealed()}
              draggedVote={draggedVote() !== null}
              voteFlashColor={voteFlashColor()}
              onDragOver={handleDragOver}
              onDrop={(color) => handleDrop(color)}
              onClick={(color) => {
                handleDropZoneClick(color);
                setVoteFlashColor(color);
                setTimeout(() => setVoteFlashColor(null), 400);
              }}
            />

            {/* Unit action toolbar (when units selected) */}
            <Show when={viewportSelectedIds().length > 0}>
              <div class="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 border border-white/10">
                <span class="text-[11px] text-white/50">
                  {viewportSelectedIds().length} vote{viewportSelectedIds().length !== 1 ? "s" : ""} selected
                </span>
                <div class="flex-1" />
                <button
                  class="rounded bg-red-600/80 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-red-500"
                  onClick={() => handleViewportSetTeam(viewportSelectedIds(), "red")}
                >
                  Cast Red
                </button>
                <button
                  class="rounded bg-blue-600/80 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-blue-500"
                  onClick={() => handleViewportSetTeam(viewportSelectedIds(), "blue")}
                >
                  Cast Blue
                </button>
                <button
                  class="rounded bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/60 hover:bg-white/20"
                  onClick={() => handleViewportSetTeam(viewportSelectedIds(), "unset")}
                >
                  Unset
                </button>
                <Show when={selectedGuaranteed().length > 0}>
                  <span class="text-[10px] text-violet-300/80">
                    {selectedGuaranteed().length} guaranteed — cannot sell
                  </span>
                </Show>
                <Show when={selectedUnlisted().length > 0}>
                  <div class="flex items-center gap-1 border-l border-white/10 pl-2">
                    <span class="text-[10px] text-white/40">$</span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.5"
                      value={listPrice()}
                      onInput={(e) => setListPrice(parseFloat(e.currentTarget.value) || 0)}
                      class="w-14 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-white/80 outline-none focus:border-amber-400/50"
                      title="List price — buyers pay this and take the vote"
                    />
                    <button
                      class="rounded bg-amber-500/80 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-amber-400 disabled:opacity-30"
                      onClick={handleListSelected}
                      disabled={!(listPrice() > 0)}
                      data-testid={TID.listVoteBtn}
                      title="Put selected votes on the open market at this price"
                    >
                      List {selectedUnlisted().length}
                    </button>
                  </div>
                </Show>
                <Show when={selectedListed().length > 0}>
                  <button
                    class="rounded border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-white/60 hover:bg-white/10"
                    onClick={handleUnlistSelected}
                    data-testid={TID.unlistVoteBtn}
                  >
                    Unlist {selectedListed().length}
                  </button>
                </Show>
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
              <svg class="h-3 w-3 transition-transform" classList={{ "rotate-180": chatOpen() }} fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7" />
              </svg>
            </button>
          </div>

          {/* Chat panel (expands below vote bar) */}
          <Show when={chatOpen()}>
            <div class="mt-1 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 h-64 overflow-hidden">
              <Tabs defaultValue="chat">
                <div class="border-b border-white/10 px-3 py-1">
                  <TabsList class="grid w-full max-w-xs grid-cols-3 bg-white/5">
                    <TabsTrigger value="chat" data-testid={TID.chatTab} class="text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50">Chat</TabsTrigger>
                    <TabsTrigger value="activity" class="text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50">Activity</TabsTrigger>
                    <TabsTrigger value="replay" class="text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50">Replay</TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="chat" class="h-[calc(100%-2.5rem)] p-0">
                  <ChatPanel roomId={props.room.id} roundNumber={props.room.currentRound} />
                </TabsContent>
                <TabsContent value="activity" class="h-[calc(100%-2.5rem)] overflow-auto">
                  <ActivityFeed events={gameEvents()} roomId={props.room.id} players={allPlayers()} />
                </TabsContent>
                <TabsContent value="replay" class="h-[calc(100%-2.5rem)] overflow-auto p-3">
                  <ReplayViewer
                    roomId={props.room.id}
                    transactions={transactions()}
                    gameEvents={gameEvents()}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </Show>
        </div>

        <Show when={playerMenu()}>
          {(menu) => (
            <>
              <div class="fixed inset-0 z-40" onClick={() => setPlayerMenu(null)} onContextMenu={(e) => { e.preventDefault(); setPlayerMenu(null); }} />
              <PlayerContextMenu
                target={menu()}
                onWhisper={() => startWhisper(menu().playerId, menu().name)}
                onOfferTrade={() => offerToBuyFrom(menu().playerId)}
                onBuyVote={
                  menu().listedPrice != null && menu().unitId != null
                    ? () => {
                        handleBuyVote(menu().unitId!, menu().listedPrice!);
                        setPlayerMenu(null);
                      }
                    : undefined
                }
                onClose={() => setPlayerMenu(null)}
              />
            </>
          )}
        </Show>

        <Show when={whisperTarget()}>
          {(target) => (
            <div class="absolute bottom-36 left-1/2 z-40 w-full max-w-md -translate-x-1/2 px-3">
              <div class="rounded-xl border border-violet-400/30 bg-slate-900/95 p-3 shadow-2xl backdrop-blur-xl">
                <div class="mb-2 flex items-center justify-between">
                  <span class="text-xs font-semibold text-violet-200">Whisper to {target().name}</span>
                  <button class="text-[10px] text-white/40 hover:text-white/70" onClick={() => setWhisperTarget(null)}>✕</button>
                </div>
                <p class="mb-2 text-[10px] text-white/40">Only you and they will see this in the game chat.</p>
                <div class="flex gap-1.5">
                  <input
                    type="text"
                    value={whisperText()}
                    onInput={(e) => setWhisperText(e.currentTarget.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") sendWhisper(); }}
                    placeholder="Private message…"
                    class="flex-1 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white placeholder-white/25 outline-none focus:border-violet-400/50"
                  />
                  <button
                    class="rounded bg-violet-600/80 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-30"
                    disabled={!whisperText().trim()}
                    onClick={sendWhisper}
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}
        </Show>

        {/* ===== TRADE POPUP (layer 40) ===== */}
        <Show when={tradePopup()}>
          {(popup) => {
            const offer = () => {
              const v = votes().find((v) => v.id === popup().offerId);
              if (v) return { type: "sell" as const, price: v.salePrice || 0, color: visibleVoteColor(v.playerId, v.color, props.currentUser.identity.toHexString(), votesRevealed()), seller: v.playerId, voteId: v.id };
              return null;
            };

            const [counterPrice, setCounterPrice] = createSignal(0);
            const [showCounter, setShowCounter] = createSignal(false);

            return (
              <div
                class="fixed z-40 animate-fade-in"
                style={{
                  left: `${Math.min(popup().x, window.innerWidth - 260)}px`,
                  top: `${Math.min(popup().y, window.innerHeight - 200)}px`,
                }}
              >
                <div class="w-56 rounded-xl border border-white/20 bg-slate-900/95 p-3 shadow-2xl backdrop-blur-xl">
                  <div class="mb-2 flex items-center justify-between">
                    <span class="text-xs font-semibold text-white/80">Trade Offer</span>
                    <button
                      class="text-white/30 hover:text-white/60 text-xs"
                      onClick={() => setTradePopup(null)}
                    >
                      ✕
                    </button>
                  </div>

                  <Show when={offer()} fallback={<p class="text-[10px] text-white/30">Offer no longer available</p>}>
                    {(o) => (
                      <div class="space-y-2">
                        <div class="flex items-center gap-2">
                          <div
                            class="h-3 w-3 rounded-full"
                            classList={{
                              "bg-red-500": o().color === "red",
                              "bg-blue-500": o().color === "blue",
                              "bg-white/30": !o().color,
                            }}
                          />
                          <span class="text-xs text-white/60">Vote #{o().voteId}</span>
                          <span class="ml-auto text-sm font-bold text-amber-300">${o().price.toFixed(2)}</span>
                        </div>
                        <div class="text-[10px] text-white/40">
                          Seller: {resolvePlayerName(o().seller, conn())}
                        </div>

                        <Show when={!showCounter()}>
                          <div class="flex gap-1.5">
                            <button
                              class="flex-1 rounded bg-green-600/80 py-1.5 text-[10px] font-semibold text-white transition-colors hover:bg-green-500"
                              onClick={() => {
                                handleBuyVote(o().voteId, o().price);
                                setTradePopup(null);
                              }}
                              disabled={props.currentUser.walletBalance < o().price}
                            >
                              Accept (${o().price.toFixed(2)})
                            </button>
                            <button
                              class="rounded border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] text-white/50 hover:bg-white/10"
                              title="Post an open buy offer at your own price"
                              onClick={() => {
                                setCounterPrice(Math.max(o().price * 0.8, 0.01));
                                setShowCounter(true);
                              }}
                            >
                              Make Offer
                            </button>
                          </div>
                        </Show>

                        <Show when={showCounter()}>
                          <div class="space-y-1.5">
                            <div class="flex gap-1">
                              <input
                                type="number"
                                min="0.01"
                                step="0.5"
                                value={counterPrice()}
                                onInput={(e) => setCounterPrice(parseFloat(e.currentTarget.value))}
                                class="flex-1 rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80 outline-none focus:border-white/20"
                              />
                              <button
                                class="rounded bg-amber-500/80 px-2 py-1 text-[10px] font-semibold text-white hover:bg-amber-400"
                                onClick={() => {
                                  makeOffer(conn(), {
                                    roomId: props.room.id,
                                    roundNumber: props.room.currentRound,
                                    offerType: "buy_vote",
                                    voteId: undefined,
                                    price: counterPrice(),
                                  });
                                  setTradePopup(null);
                                }}
                              >
                                Send
                              </button>
                            </div>
                            <button
                              class="w-full text-[9px] text-white/30 hover:text-white/50"
                              onClick={() => setShowCounter(false)}
                            >
                              Cancel
                            </button>
                          </div>
                        </Show>
                      </div>
                    )}
                  </Show>
                </div>
              </div>
            );
          }}
        </Show>

        {/* ===== MODALS (layer 50) ===== */}

        {/* Elimination Modal */}
        <Show when={showEliminationModal()}>
          <div class="animate-fade-in">
          <EliminationModal
            roundNumber={Math.max(props.room.currentRound - 1, 0)}
            eliminatedPlayers={eliminatedPlayers().map(p => p.identity.toHexString())}
            survivingPlayers={remainingPlayers().map(p => p.identity.toHexString())}
            minorityColor={(savedRoundTotals().minority === "tie" ? "red" : savedRoundTotals().minority) as "red" | "blue"}
            tiebreaker={false}
            redVotes={savedRoundTotals().red}
            blueVotes={savedRoundTotals().blue}
            room={props.room}
            currentUser={props.currentUser}
            onClose={() => setShowEliminationModal(false)}
          />
          </div>
        </Show>

        {/* Game Over Modal — z-[70] so it sits above ChatOverlay z-[60] */}
        <Show when={props.room.gameStatus === "completed" && !gameOverDismissed()}>
          <div class="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
            <div class="w-[28rem] max-h-[90vh] max-w-[90vw] overflow-y-auto rounded-xl border border-white/20 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-xl animate-scale-in">
              <h2 class="mb-4 text-center text-2xl font-bold text-white">Game Over!</h2>
              <div class="space-y-4">
                <div class="text-center">
                  <Show when={endedInTie()} fallback={<p class="text-lg font-semibold text-white/80">Winners:</p>}>
                    <p class="text-lg font-semibold text-white/80">Tie — pot split by votes</p>
                    <p class="mt-1 text-xs text-white/50">Each ticket cast this round takes an equal share.</p>
                  </Show>
                  <For each={remainingPlayers()}>
                    {(player) => (
                      <p class="text-xl font-bold text-emerald-400">
                        {resolvePlayerName(player.identity.toHexString(), conn())} - $
                        {playerPayout(player.identity.toHexString()).toFixed(2)}
                      </p>
                    )}
                  </For>
                  <Show when={remainingPlayers().length === 0}>
                    <p class="text-sm text-white/40 mt-2">No survivors — pot returned</p>
                  </Show>
                </div>
                <Show when={keptFromThisMatch().length > 0}>
                  <div class="rounded-lg border border-white/10 bg-white/5 p-3 text-left">
                    <div class="mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                      Kept on your account
                    </div>
                    <For each={keptFromThisMatch()}>
                      {(lab) => (
                        <p class="text-[11px] text-white/70">
                          {lab.displayName}
                          {" · "}
                          {lab.origin === "sent_home" ? "sent home" : lab.origin === "arena" ? "arena" : "survived"}
                          {" · Wood L"}{lab.woodcuttingLevel}
                          {" / Mine L"}{lab.miningLevel}
                          <Show when={gearNamesFor(lab.id)}>
                            {" · "}{gearNamesFor(lab.id)}
                          </Show>
                        </p>
                      )}
                    </For>
                    <p class="mt-2 text-[10px] text-white/35">
                      Sent-home veterans already left this expedition. They return in the next lobby, not this one.
                    </p>
                  </div>
                </Show>
                <AccountSaveCard
                  conn={conn}
                  identityHex={props.currentUser.identity.toHexString()}
                  compact
                />
                <div class="flex gap-2">
                  <button
                    class="flex-1 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:from-purple-500 hover:to-blue-500"
                    onClick={() => {
                      setGameOverDismissed(true);
                      try {
                        const connection = conn();
                        if (connection) {
                          connection.reducers.leaveRoom({ roomId: props.room.id });
                        }
                      } catch {}
                      navigate("/vote");
                    }}
                  >
                    Return to Lobby
                  </button>
                  <button
                    class="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/70 transition-all hover:bg-white/10"
                    onClick={() => {
                      setGameOverDismissed(true);
                      navigate("/");
                    }}
                  >
                    Home
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Show>
      </div>
    </ErrorBoundary>
  );
};

export default VotingInterface;

