import { createStore } from "solid-js/store";
import { useSpacetimeDB } from "~/hooks/useSpacetimeDB";
import { withSpacetimeDBErrorHandling, withRetry, SpacetimeDBErrorCodes, SpacetimeDBError } from "~/lib/spacetime-errors";
import type { Unit, Vote, GameRoom } from "~/module_bindings";
import type { SpacetimeDBGameClient } from "~/types/spacetime-client";

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
  const { db, connected } = useSpacetimeDB();

  const subscribeToVotes = () => {
    const client = db() as SpacetimeDBGameClient;
    if (!client || !connected()) {
      throw new SpacetimeDBError(
        "Not connected to SpacetimeDB",
        SpacetimeDBErrorCodes.CONNECTION_ERROR
      );
    }

    // Subscribe to unit updates
    client.subscribe("unit", "*", (unit: Unit) => {
      if (!unit) return;

      setVoteState("unitVotes", unit.id, {
        color: unit.voteColor,
        owner: unit.voteOwner,
        price: unit.votePrice,
        guarantee: unit.voteGuarantee,
      });
    });

    // Subscribe to vote updates
    client.subscribe("vote", "*", (vote: Vote) => {
      if (!vote) return;

      setVoteState("roundVotes", vote.roundNumber, {
        roundNumber: vote.roundNumber,
        votes: [...(voteState.roundVotes[vote.roundNumber]?.votes || []), vote],
        timestamp: Date.now(),
      });
    });
  };

  const setUnitVoteColor = async (unitId: number, color: string) => {
    const client = db() as SpacetimeDBGameClient;
    if (!client || !connected()) {
      throw new SpacetimeDBError(
        "Not connected to SpacetimeDB",
        SpacetimeDBErrorCodes.CONNECTION_ERROR
      );
    }

    await withSpacetimeDBErrorHandling(async () => {
      await withRetry(() => client.reducers.set_unit_vote_color(unitId, color));
    }, "Failed to set unit vote color");
  };

  const tradeUnitVote = async (unitId: number, buyerId: string, price: number) => {
    const client = db() as SpacetimeDBGameClient;
    if (!client || !connected()) {
      throw new SpacetimeDBError(
        "Not connected to SpacetimeDB",
        SpacetimeDBErrorCodes.CONNECTION_ERROR
      );
    }

    await withSpacetimeDBErrorHandling(async () => {
      await withRetry(() => client.reducers.trade_unit_vote(unitId, buyerId, price));
    }, "Failed to trade unit vote");
  };

  const processRoundVotes = async (roomId: number, roundNumber: number) => {
    const client = db() as SpacetimeDBGameClient;
    if (!client || !connected()) {
      throw new SpacetimeDBError(
        "Not connected to SpacetimeDB",
        SpacetimeDBErrorCodes.CONNECTION_ERROR
      );
    }

    await withSpacetimeDBErrorHandling(async () => {
      await withRetry(() => client.reducers.process_round_votes(roomId, roundNumber));
    }, "Failed to process round votes");
  };

  return {
    voteState,
    subscribeToVotes,
    setUnitVoteColor,
    tradeUnitVote,
    processRoundVotes,
  };
}; 