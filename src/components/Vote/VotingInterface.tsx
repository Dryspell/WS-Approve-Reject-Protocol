import { type Component, createSignal, createMemo, For, Show, onMount, onCleanup, createEffect } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import type { User, GameRoom, Vote, Transaction, Unit, Resource, UnitStats, UnitInventory, UnitTaskQueue, EndRoundVote, Equipment, BattleArena, BattleUnit, SideBet, LaborerGenetics, Tournament, GameEvent } from "~/module_bindings/types";
import { useSpacetimeDB } from "~/hooks/useSpacetimeDB";
import RoundTimer from "./RoundTimer";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import ColonyViewport, { type ColonyUnit, type ColonyResource, type ColonyBuilding, type TeamColor, type OtherPlayerAvatar } from "../game/ColonyViewport";
import UnitContextPanel from "../game/UnitContextPanel";
import BuildingPanel from "../game/BuildingPanel";
import EquipmentPanel from "../game/EquipmentPanel";
import BattleArenaViewport from "../game/BattleArenaViewport";
import GeneticsPanel from "../game/GeneticsPanel";
import SideBetPanel from "../game/SideBetPanel";
import EVCalculator from "../game/EVCalculator";
import TournamentPanel from "../game/TournamentPanel";
import { characterForIndex, type CharacterClass } from "~/lib/asset-loader";
import { resolvePlayerName } from "~/lib/game-utils";
import { TID } from "~/lib/test-ids";


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
  const [endRoundVotes, setEndRoundVotes] = createSignal<EndRoundVote[]>([]);
  const [otherPlayerAvatars, setOtherPlayerAvatars] = createSignal<OtherPlayerAvatar[]>([]);
  const [tradePopup, setTradePopup] = createSignal<{ offerId: number; x: number; y: number } | null>(null);
  const [equipment, setEquipment] = createSignal<Equipment[]>([]);
  const [battleArenas, setBattleArenas] = createSignal<BattleArena[]>([]);
  const [battleUnits, setBattleUnits] = createSignal<BattleUnit[]>([]);
  const [sideBets, setSideBets] = createSignal<SideBet[]>([]);
  const [genetics, setGenetics] = createSignal<LaborerGenetics[]>([]);
  const [tournaments, setTournaments] = createSignal<Tournament[]>([]);
  const [activePanel, setActivePanel] = createSignal<string | null>(null);
  const [battleDismissed, setBattleDismissed] = createSignal(false);
  const [gameOverDismissed, setGameOverDismissed] = createSignal(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = createSignal(false);
  const [gameEvents, setGameEvents] = createSignal<GameEvent[]>([]);

  // Round processing is now server-authoritative via RoundTimerEntry scheduler.
  // Clients are passive observers — room state changes drive the UI.

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

        // Auto-trigger combat when a new round starts, if combat is enabled for this room
        if (newRoom.combatEnabled && newRoom.gameStatus === "in_progress") {
          const roomUnits = serverUnits().filter(
            (u) => u.roomId === props.room.id && u.unitType === "minion"
          );
          const redIds = roomUnits.filter((u) => u.voteColor === "red").map((u) => u.id);
          const blueIds = roomUnits.filter((u) => u.voteColor === "blue").map((u) => u.id);
          if (redIds.length > 0 && blueIds.length > 0) {
            try {
              connection.reducers.createBattleArena({ roomId: props.room.id, redUnitIds: redIds, blueUnitIds: blueIds });
            } catch (e) {
              console.warn("Auto-battle trigger failed:", e);
            }
          }
        }
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
    connection.db.unit_stats.onDelete((ctx, stats) => {
      setUnitStats((prev) => prev.filter((s) => s.unitId !== stats.unitId));
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
    connection.db.unit_inventory.onDelete((ctx, inv) => {
      setUnitInventories((prev) => prev.filter((i) => i.unitId !== inv.unitId));
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

    // Subscribe to new Phase tables
    connection.db.equipment.onInsert((ctx, eq) => setEquipment(prev => [...prev, eq]));
    connection.db.equipment.onUpdate((ctx, old, eq) => setEquipment(prev => prev.map(e => e.id === eq.id ? eq : e)));
    connection.db.equipment.onDelete((ctx, eq) => setEquipment(prev => prev.filter(e => e.id !== eq.id)));
    setEquipment(Array.from(connection.db.equipment.iter()));

    connection.db.battle_arena.onInsert((ctx, a) => { setBattleDismissed(false); setBattleArenas(prev => [...prev, a]); });
    connection.db.battle_arena.onUpdate((ctx, old, a) => setBattleArenas(prev => prev.map(x => x.id === a.id ? a : x)));
    connection.db.battle_arena.onDelete((ctx, a) => setBattleArenas(prev => prev.filter(x => x.id !== a.id)));
    setBattleArenas(Array.from(connection.db.battle_arena.iter()));

    connection.db.battle_unit.onInsert((ctx, bu) => setBattleUnits(prev => [...prev, bu]));
    connection.db.battle_unit.onUpdate((ctx, old, bu) => setBattleUnits(prev => prev.map(x => x.id === bu.id ? bu : x)));
    connection.db.battle_unit.onDelete((ctx, bu) => setBattleUnits(prev => prev.filter(x => x.id !== bu.id)));
    setBattleUnits(Array.from(connection.db.battle_unit.iter()));

    connection.db.side_bet.onInsert((ctx, sb) => setSideBets(prev => [...prev, sb]));
    connection.db.side_bet.onUpdate((ctx, old, sb) => setSideBets(prev => prev.map(x => x.id === sb.id ? sb : x)));
    connection.db.side_bet.onDelete((ctx, sb) => setSideBets(prev => prev.filter(x => x.id !== sb.id)));
    setSideBets(Array.from(connection.db.side_bet.iter()));

    connection.db.laborer_genetics.onInsert((ctx, g) => setGenetics(prev => [...prev, g]));
    connection.db.laborer_genetics.onUpdate((ctx, old, g) => setGenetics(prev => prev.map(x => x.unitId === g.unitId ? g : x)));
    connection.db.laborer_genetics.onDelete((ctx, g) => setGenetics(prev => prev.filter(x => x.unitId !== g.unitId)));
    setGenetics(Array.from(connection.db.laborer_genetics.iter()));

    connection.db.tournament.onInsert((ctx, t) => setTournaments(prev => [...prev, t]));
    connection.db.tournament.onUpdate((ctx, old, t) => setTournaments(prev => prev.map(x => x.id === t.id ? t : x)));
    connection.db.tournament.onDelete((ctx, t) => setTournaments(prev => prev.filter(x => x.id !== t.id)));
    setTournaments(Array.from(connection.db.tournament.iter()));

    // Subscribe to game events for the activity feed and replay viewer
    const roomIdStr = props.room.id.toString();
    connection.db.game_event.onInsert((ctx, event) => {
      if (event.roomId === roomIdStr) {
        setGameEvents((prev) => [...prev, event]);
      }
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
  const [hoveredVoteId, setHoveredVoteId] = createSignal<number | null>(null);
  const [voteFlashColor, setVoteFlashColor] = createSignal<string | null>(null);

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

  const handleBuyVote = async (voteId: number, price: number) => {
    const connection = conn();
    if (!connection) return;
    if (props.currentUser.walletBalance < price) {
      ToastHelper.warning("Insufficient Funds", `You need $${price}`);
      return;
    }
    try {
      connection.reducers.transferVoteOwnership({
        voteId,
        buyerId: props.currentUser.identity.toHexString(),
        price,
      });
      ToastHelper.success("Vote Purchased", `Bought vote #${voteId} for $${price}`);
      sounds.tradeComplete();
    } catch {
      ToastHelper.error("Failed to purchase vote");
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
        offers.push({ unitId: unit.id, offerId: v.id, type: "sell", price: v.salePrice || 0, color: (v.color as "red" | "blue") || null });
      }
    }
    return offers;
  });

  const handleTradeOfferClick = (offerId: number, screenX: number, screenY: number) => {
    setTradePopup({ offerId, x: screenX, y: screenY });
  };

  // Phase B-J handlers
  const roomBuildings = createMemo(() =>
    serverUnits().filter(u => u.roomId === props.room.id && u.buildingType)
  );

  const handleConstructBuilding = (buildingType: string, x: number, z: number) => {
    const connection = conn();
    if (!connection) return;
    try {
      connection.reducers.constructBuilding({ roomId: props.room.id, position: { x, y: z }, buildingType });
      ToastHelper.success("Building", `Started constructing ${buildingType}`);
    } catch { ToastHelper.error("Failed to construct building"); }
  };

  const handleAssignUnit = (unitId: number, buildingId: number) => {
    const connection = conn();
    if (!connection) return;
    try {
      connection.reducers.assignUnitToBuilding({ unitId, buildingId });
    } catch { ToastHelper.error("Failed to assign unit"); }
  };

  const handleContribute = (buildingId: number, resourceType: string, amount: number, sourceUnitId: number) => {
    const connection = conn();
    if (!connection) return;
    try {
      connection.reducers.contributeToBuilding({ buildingId, resourceType, amount, sourceUnitId });
    } catch { ToastHelper.error("Failed to contribute"); }
  };

  const handleSetBuildingTax = (buildingId: number, taxRate: number) => {
    const connection = conn();
    if (!connection) return;
    try {
      connection.reducers.setBuildingTax({ buildingId, taxRate });
    } catch { ToastHelper.error("Failed to set tax"); }
  };

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

  const handleSpawnLaborer = () => {
    const connection = conn();
    if (!connection) return;
    try {
      connection.reducers.spawnLaborer({ roomId: props.room.id });
      ToastHelper.success("Laborer", "New laborer spawned!");
    } catch { ToastHelper.error("Failed to spawn laborer"); }
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

  const handleCraftEquipment = (buildingId: number, equipmentType: string, material: string) => {
    const connection = conn();
    if (!connection) return;
    try {
      connection.reducers.craftEquipment({ roomId: props.room.id, buildingId, equipmentType, material });
      ToastHelper.success("Crafted!", `${material} ${equipmentType} crafted`);
    } catch { ToastHelper.error("Failed to craft equipment"); }
  };

  const handleProcessBattleTurn = (arenaId: number) => {
    const connection = conn();
    if (!connection) return;
    try {
      connection.reducers.processBattleTurn({ arenaId });
    } catch { ToastHelper.error("Failed to process battle turn"); }
  };

  const handlePlaceSideBet = (betType: string, betTarget: string, amount: number) => {
    const connection = conn();
    if (!connection) return;
    try {
      connection.reducers.placeSideBet({ roomId: props.room.id, betType, betTarget, amount });
      ToastHelper.success("Bet Placed", `$${amount} on ${betTarget}`);
    } catch { ToastHelper.error("Failed to place bet"); }
  };

  const handleBreed = (parentAId: number, parentBId: number, buildingId: number) => {
    const connection = conn();
    if (!connection) return;
    try {
      connection.reducers.breedLaborers({ roomId: props.room.id, parentAId, parentBId, breedingBuildingId: buildingId });
      ToastHelper.success("Breeding", "Offspring created!");
    } catch { ToastHelper.error("Failed to breed"); }
  };

  const handleJoinTournament = (tournamentId: number) => {
    const connection = conn();
    if (!connection) return;
    try {
      connection.reducers.joinTournament({ tournamentId });
    } catch { ToastHelper.error("Failed to join tournament"); }
  };

  const handleCreateTournament = (name: string, entryFee: number, maxParticipants: number, bracketType: string) => {
    const connection = conn();
    if (!connection) return;
    try {
      connection.reducers.createTournament({ name, entryFee, maxParticipants, bracketType });
      ToastHelper.success("Tournament Created", name);
    } catch { ToastHelper.error("Failed to create tournament"); }
  };

  const activeBattle = createMemo(() => {
    if (battleDismissed()) return undefined;
    return battleArenas().find(a => a.roomId === props.room.id && a.status !== "completed");
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
            activeOffers={activeOffers()}
            onMoveUnit={handleMoveUnit}
            onTradeOfferClick={handleTradeOfferClick}
          />
        </div>

        {/* ===== HUD OVERLAYS (layer 10+) ===== */}

        {/* Floating chat bubbles (bottom-left, layer 20) */}
        <FloatingChatBubbles roomId={props.room.id} players={allPlayers()} />

        {/* Unit Context Panel (right side) */}
        <Show when={selectedUnit()}>
          <div class="absolute right-4 top-16 z-30 pointer-events-none">
            <UnitContextPanel
              unit={selectedUnit()!}
              stats={selectedUnitStats()}
              inventory={selectedUnitInventory()}
              tasks={selectedUnitTasks()}
              resources={roomResources()}
              onClose={() => setViewportSelectedIds([])}
              onSetVoteColor={handleSetUnitVoteColor}
              onQueueTask={handleQueueTask}
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
                    <p class="font-semibold text-white">🗳️ Voting Phase</p>
                    <p>Place your votes on Red or Blue using the drop zones. You can trade votes on the market, sell guarantees, and make deals with other players.</p>
                    <p class="font-semibold text-white mt-2">⚡ Action Phase</p>
                    <p>Time to finalize deals. Check the EV Calculator to see which strategy is best given the current vote distribution.</p>
                    <p class="font-semibold text-white mt-2">📊 Resolution Phase</p>
                    <p>Votes are counted. The <strong class="text-red-300">majority color</strong> is eliminated. Minority survivors split the pot.</p>
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
                        <div class="flex items-center gap-1.5 text-[10px] text-white/40">
                          <div class="flex items-center gap-0.5">
                            <For each={playerVotes()}>
                              {(v) => (
                                <div
                                  class="h-1.5 w-1.5 rounded-full"
                                  classList={{
                                    "bg-red-400": v.color === "red",
                                    "bg-blue-400": v.color === "blue",
                                    "bg-white/30": !v.color,
                                  }}
                                  title={`Vote #${v.id}: ${v.color || "unset"}`}
                                />
                              )}
                            </For>
                            <span class="ml-0.5">{playerVotes().length}v</span>
                          </div>
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
                players={allPlayers()}
              />
            </div>
          </Show>
        </div>

        {/* ── Panel Toolbar (bottom-left quick access) ── */}
        <div class="absolute left-3 bottom-[calc(100%-100vh+4rem)] z-20 flex flex-col gap-1" style="bottom: auto; top: auto;">
        </div>

        {/* Floating panel buttons along top-right of viewport */}
        <div class="absolute right-[calc(theme(spacing.3)+theme(spacing.8)+0.25rem)] top-14 z-20 flex flex-col gap-1">
          {[
            { key: "buildings", label: "Build", icon: "🏗️" },
            { key: "equipment", label: "Equip", icon: "⚔️" },
            { key: "genetics", label: "Gene", icon: "🧬" },
            { key: "ev", label: "EV", icon: "📊" },
            { key: "tournament", label: "Tour.", icon: "🏆" },
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

        {/* Slide-out feature panels */}
        <Show when={activePanel() === "buildings"}>
          <div class="absolute left-60 top-14 bottom-20 z-20 w-80 overflow-auto rounded-lg bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl">
            <BuildingPanel
              buildings={roomBuildings()}
              units={roomUnits()}
              onConstruct={handleConstructBuilding}
              onAssignUnit={handleAssignUnit}
              onContribute={handleContribute}
              onSetTax={handleSetBuildingTax}
              onSpawnLaborer={handleSpawnLaborer}
            />
          </div>
        </Show>

        <Show when={activePanel() === "equipment"}>
          <div class="absolute left-60 top-14 bottom-20 z-20 w-80 overflow-auto rounded-lg bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl">
            <EquipmentPanel
              selectedUnitId={viewportSelectedIds().length === 1 ? viewportSelectedIds()[0] : null}
              equipment={equipment().filter(e => e.roomId === props.room.id)}
              onEquip={handleEquipItem}
              onUnequip={handleUnequipItem}
              onCraft={handleCraftEquipment}
              buildings={roomBuildings().filter(b => 
                b.buildingType?.startsWith("manufacturing_")
              )}
            />
          </div>
        </Show>

        <Show when={activePanel() === "genetics"}>
          <div class="absolute left-60 top-14 bottom-20 z-20 w-80 overflow-auto rounded-lg bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl">
            <GeneticsPanel
              selectedUnitId={viewportSelectedIds().length >= 1 ? viewportSelectedIds()[0] : null}
              selectedUnitIdB={viewportSelectedIds().length >= 2 ? viewportSelectedIds()[1] : null}
              genetics={genetics()}
              units={roomUnits()}
              onBreed={handleBreed}
              breedingBuildings={roomBuildings().filter(b => b.buildingType === "breeding")}
            />
          </div>
        </Show>

        <Show when={activePanel() === "ev"}>
          <div class="absolute left-60 top-14 bottom-20 z-20 w-80 overflow-auto rounded-lg bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl">
            <EVCalculator
              playerCount={remainingPlayers().length}
              potSize={props.room.potSize}
              buyinAmount={props.room.buyinAmount}
              myVoteCount={myVotes().length}
              totalVotes={votes().filter(v => v.roomId === props.room.id).length}
              guaranteesPurchased={0}
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

        <Show when={activePanel() === "tournament"}>
          <div class="absolute left-60 top-14 bottom-20 z-20 w-80 overflow-auto rounded-lg bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl">
            <TournamentPanel
              tournaments={tournaments()}
              currentUserId={props.currentUser.identity.toHexString()}
              onJoin={handleJoinTournament}
              onCreate={handleCreateTournament}
            />
          </div>
        </Show>

        {/* Battle Arena Overlay */}
        <Show when={activeBattle()}>
          {(arena) => (
            <BattleArenaViewport
              arena={arena()}
              battleUnits={battleUnits().filter(bu => bu.arenaId === arena().id)}
              onProcessTurn={handleProcessBattleTurn}
              onClose={() => setBattleDismissed(true)}
            />
          )}
        </Show>

        {/* ── BOTTOM CENTER: Vote Controls + Chat ── */}
        <div class="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 w-full max-w-2xl px-3">
          {/* Vote control bar */}
          <div class="rounded-xl bg-black/50 backdrop-blur-md p-3 border border-white/10 shadow-2xl">
            {/* Top row: vote summary + chips */}
            <div class="flex items-center gap-2 mb-2">
              <span class="text-xs font-semibold text-white/70">Your Votes ({myVotes().length})</span>
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
                  return (
                    <button
                      class="flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium transition-all"
                      classList={{
                        "border-red-400/60 bg-red-500/20 text-red-300": vote.color === "red",
                        "border-blue-400/60 bg-blue-500/20 text-blue-300": vote.color === "blue",
                        "border-dashed border-white/20 bg-white/5 text-white/40": !vote.color,
                        "ring-2 ring-green-400/70 ring-offset-1 ring-offset-transparent": isSelected(),
                        "scale-110 shadow-lg shadow-amber-400/20": hoveredVoteId() === vote.id,
                      }}
                      onClick={() => {
                        setViewportSelectedIds(prev =>
                          prev.includes(vote.id) ? prev.filter(id => id !== vote.id) : [...prev, vote.id]
                        );
                      }}
                      onMouseEnter={() => setHoveredVoteId(vote.id)}
                      onMouseLeave={() => setHoveredVoteId(null)}
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

            {/* Drop zones — large, prominent, with live tally */}
            {(() => {
              const roomVotes = () => votes().filter(v => v.roomId === props.room.id);
              const totalRed = () => roomVotes().filter(v => v.color === "red").length;
              const totalBlue = () => roomVotes().filter(v => v.color === "blue").length;
              return (
                <div class="grid grid-cols-2 gap-2">
                  <div
                    data-testid={TID.voteRed}
                    role="button"
                    tabindex="0"
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop("red")}
                    onClick={() => {
                      handleDropZoneClick("red");
                      setVoteFlashColor("red");
                      setTimeout(() => setVoteFlashColor(null), 400);
                    }}
                    class="flex cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-dashed border-red-500/40 bg-red-500/10 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/25 hover:border-red-400/60 transition-all active:scale-95"
                    classList={{
                      "border-red-400 bg-red-500/30": draggedVote() !== null,
                      "animate-vote-flash-red": voteFlashColor() === "red",
                    }}
                  >
                    <div class="flex items-center gap-1.5">
                      <div class="h-3 w-3 rounded-full bg-red-500" />
                      Red
                    </div>
                    <span class="text-[10px] font-normal text-red-400/60">{totalRed()} total</span>
                  </div>
                  <div
                    data-testid={TID.voteBlue}
                    role="button"
                    tabindex="0"
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop("blue")}
                    onClick={() => {
                      handleDropZoneClick("blue");
                      setVoteFlashColor("blue");
                      setTimeout(() => setVoteFlashColor(null), 400);
                    }}
                    class="flex cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-dashed border-blue-500/40 bg-blue-500/10 py-2 text-sm font-semibold text-blue-400 hover:bg-blue-500/25 hover:border-blue-400/60 transition-all active:scale-95"
                    classList={{
                      "border-blue-400 bg-blue-500/30": draggedVote() !== null,
                      "animate-vote-flash-blue": voteFlashColor() === "blue",
                    }}
                  >
                    <div class="flex items-center gap-1.5">
                      <div class="h-3 w-3 rounded-full bg-blue-500" />
                      Blue
                    </div>
                    <span class="text-[10px] font-normal text-blue-400/60">{totalBlue()} total</span>
                  </div>
                </div>
              );
            })()}

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

        {/* ===== TRADE POPUP (layer 40) ===== */}
        <Show when={tradePopup()}>
          {(popup) => {
            const offer = () => {
              const v = votes().find((v) => v.id === popup().offerId);
              if (v) return { type: "sell" as const, price: v.salePrice || 0, color: v.color, seller: v.playerId, voteId: v.id };
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
                              onClick={() => {
                                setCounterPrice(Math.max(o().price * 0.8, 0.01));
                                setShowCounter(true);
                              }}
                            >
                              Counter
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
                                  const connection = conn();
                                  if (connection) {
                                    try {
                                      connection.reducers.createTradeOffer({
                                        roomId: props.room.id,
                                        roundNumber: props.room.currentRound,
                                        offerType: "buy_vote",
                                        voteId: undefined,
                                        price: counterPrice(),
                                      });
                                      ToastHelper.success("Counter Offer", `Buy offer posted at $${counterPrice().toFixed(2)}`);
                                    } catch {
                                      ToastHelper.error("Failed to create counter offer");
                                    }
                                  }
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
            minorityColor={(getVoteTotals().minority === "tie" ? "red" : getVoteTotals().minority) as "red" | "blue"}
            tiebreaker={getVoteTotals().minority === "tie"}
            redVotes={getVoteTotals().red}
            blueVotes={getVoteTotals().blue}
            room={props.room}
            currentUser={props.currentUser}
            onClose={() => setShowEliminationModal(false)}
          />
          </div>
        </Show>

        {/* Game Over Modal — z-[70] so it sits above ChatOverlay z-[60] */}
        <Show when={props.room.gameStatus === "completed" && !gameOverDismissed()}>
          <div class="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
            <div class="w-96 rounded-xl border border-white/20 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-xl animate-scale-in">
              <h2 class="mb-4 text-center text-2xl font-bold text-white">Game Over!</h2>
              <div class="space-y-4">
                <div class="text-center">
                  <p class="text-lg font-semibold text-white/80">Winners:</p>
                  <For each={remainingPlayers()}>
                    {(player) => (
                      <p class="text-xl font-bold text-emerald-400">
                        {resolvePlayerName(player.identity.toHexString(), conn())} - $
                        {(props.room.potSize / Math.max(remainingPlayers().length, 1)).toFixed(2)}
                      </p>
                    )}
                  </For>
                  <Show when={remainingPlayers().length === 0}>
                    <p class="text-sm text-white/40 mt-2">No survivors — pot returned</p>
                  </Show>
                </div>
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

