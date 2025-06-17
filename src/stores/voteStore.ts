import { createStore } from "solid-js/store";
import { createEffect } from "solid-js";
import { useSpacetimeDB } from "~/hooks/useSpacetimeDB";
import { withSpacetimeDBErrorHandling, withRetry, SpacetimeDBErrorCodes, SpacetimeDBError } from "~/lib/spacetime-errors";

// Import types from their specific modules to avoid conflicts
import type { Unit } from "~/module_bindings/unit_type";
import type { Vote } from "~/module_bindings/vote_type";
import type { GameRoom } from "~/module_bindings/game_room_type";

export interface VoteState {
  unitVotes: Record<number, {
    color: string | null;
    owner: string | null;
    price: number | null;
    guarantee: string | null;
  }>;
  roundVotes: Record<number, {
    roundNumber: number;
    votes: Vote[];
    timestamp: number;
  }>;
  tradingState: {
    activeOffers: Record<number, {
      unitId: number;
      sellerId: string;
      price: number;
      timestamp: number;
    }>;
  };
}

const [voteState, setVoteState] = createStore<VoteState>({
  unitVotes: {},
  roundVotes: {},
  tradingState: {
    activeOffers: {},
  },
});

export const useVoteStore = () => {
  const { conn, connected } = useSpacetimeDB();

  createEffect(() => {
    const connection = conn();
    if (!connection || !connected()) return;

    // Subscribe to unit updates
    const onUnitInsert = (_ctx: any, row: Unit) => {
      setVoteState("unitVotes", row.id, {
        color: row.voteColor,
        owner: row.voteOwner,
        price: row.votePrice,
        guarantee: row.voteGuarantee,
      });
    };

    const onUnitUpdate = (_ctx: any, oldRow: Unit, newRow: Unit) => {
      setVoteState("unitVotes", newRow.id, {
        color: newRow.voteColor,
        owner: newRow.voteOwner,
        price: newRow.votePrice,
        guarantee: newRow.voteGuarantee,
      });
    };

    const onUnitDelete = (_ctx: any, row: Unit) => {
      const { [row.id]: _, ...rest } = voteState.unitVotes;
      setVoteState("unitVotes", rest);
    };

    // Subscribe to vote updates
    const onVoteInsert = (_ctx: any, row: Vote) => {
      setVoteState("roundVotes", row.roundNumber, (prev) => ({
        roundNumber: row.roundNumber,
        votes: [...(prev?.votes || []), row],
        timestamp: Date.now(),
      }));
    };

    connection.db.unit.onInsert(onUnitInsert);
    connection.db.unit.onUpdate(onUnitUpdate);
    connection.db.unit.onDelete(onUnitDelete);
    connection.db.vote.onInsert(onVoteInsert);

    // Cleanup subscriptions
    return () => {
      connection.db.unit.removeOnInsert(onUnitInsert);
      connection.db.unit.removeOnUpdate(onUnitUpdate);
      connection.db.unit.removeOnDelete(onUnitDelete);
      connection.db.vote.removeOnInsert(onVoteInsert);
    };
  });

  const setUnitVoteColor = async (unitId: number, color: string) => {
    const connection = conn();
    if (!connection || !connected()) {
      throw new SpacetimeDBError(
        "Not connected to SpacetimeDB",
        SpacetimeDBErrorCodes.CONNECTION_ERROR
      );
    }

    try {
      connection.reducers.setUnitVoteColor(unitId, color);
    } catch (error) {
      throw new SpacetimeDBError(
        "Failed to set unit vote color",
        SpacetimeDBErrorCodes.REDUCER_ERROR
      );
    }
  };

  const tradeUnitVote = async (unitId: number, buyerId: string, price: number) => {
    const connection = conn();
    if (!connection || !connected()) {
      throw new SpacetimeDBError(
        "Not connected to SpacetimeDB",
        SpacetimeDBErrorCodes.CONNECTION_ERROR
      );
    }

    try {
      connection.reducers.tradeUnitVote(unitId, buyerId, price);
    } catch (error) {
      throw new SpacetimeDBError(
        "Failed to trade unit vote",
        SpacetimeDBErrorCodes.REDUCER_ERROR
      );
    }
  };

  const processRoundVotes = async (roomId: number, roundNumber: number) => {
    const connection = conn();
    if (!connection || !connected()) {
      throw new SpacetimeDBError(
        "Not connected to SpacetimeDB",
        SpacetimeDBErrorCodes.CONNECTION_ERROR
      );
    }

    try {
      connection.reducers.processRoundVotes(roomId, roundNumber);
    } catch (error) {
      throw new SpacetimeDBError(
        "Failed to process round votes",
        SpacetimeDBErrorCodes.REDUCER_ERROR
      );
    }
  };

  return {
    voteState,
    setUnitVoteColor,
    tradeUnitVote,
    processRoundVotes,
  };
}; 