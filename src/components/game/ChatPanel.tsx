import { Component, createSignal, For, Show, onMount, createEffect } from "solid-js";
import { useSpacetimeDB } from "~/hooks/useSpacetimeDB";
import type { ChatMessage as DBChatMessage } from "~/module_bindings/types";
import { showToast } from "~/components/ui/toast";
import { TID } from "~/lib/test-ids";

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: number;
  type: 'player' | 'system' | 'trade-offer';
  tradeOfferId?: number;
  tradeOfferType?: string;
  tradeOfferPrice?: number;
  tradeOfferStatus?: string;
}

interface ChatPanelProps {
  roomId: number;
  roundNumber?: number;
  minimized?: boolean;
  onToggleMinimize?: () => void;
}

export const ChatPanel: Component<ChatPanelProps> = (props) => {
  const { conn, identity, connected } = useSpacetimeDB();
  const [messages, setMessages] = createSignal<ChatMessage[]>([]);
  const [inputValue, setInputValue] = createSignal('');
  const [scrollAreaRef, setScrollAreaRef] = createSignal<HTMLDivElement>();
  const [chatRoomId, setChatRoomId] = createSignal<string>(`game_${props.roomId}`);
  const [showTradeForm, setShowTradeForm] = createSignal(false);
  const [tradeType, setTradeType] = createSignal<'sell_vote' | 'buy_vote'>('sell_vote');
  const [tradePrice, setTradePrice] = createSignal(5);

  // Auto-scroll to bottom when new messages arrive
  createEffect(() => {
    const scrollArea = scrollAreaRef();
    if (scrollArea) {
      setTimeout(() => {
        scrollArea.scrollTop = scrollArea.scrollHeight;
      }, 50);
    }
  });

  onMount(() => {
    const connection = conn();
    if (!connection) return;

    // Subscribe to chat messages
    connection.db.chat_message.onInsert((ctx, message) => {
      if (message.roomId === chatRoomId()) {
        addMessageFromDB(message);
      }
    });

    // Load existing messages
    const existingMessages = Array.from(connection.db.chat_message.iter())
      .filter(m => m.roomId === chatRoomId())
      .sort((a, b) => {
        const timeA = a.timestamp.seconds * 1000 + a.timestamp.nanoseconds / 1000000;
        const timeB = b.timestamp.seconds * 1000 + b.timestamp.nanoseconds / 1000000;
        return timeA - timeB;
      });

    existingMessages.forEach(msg => addMessageFromDB(msg));

    // Add welcome message if no messages yet
    if (existingMessages.length === 0) {
      addSystemMessage('Welcome to the game chat! You can communicate with other players here.');
    }

    // Subscribe to trade offers
    connection.db.trade_offer.onInsert((ctx, offer) => {
      if (offer.roomId === props.roomId) {
        addTradeOfferMessage(offer);
      }
    });

    connection.db.trade_offer.onUpdate((ctx, oldOffer, newOffer) => {
      if (newOffer.roomId === props.roomId && newOffer.status !== oldOffer.status) {
        setMessages(prev => prev.map(msg => {
          if (msg.tradeOfferId === newOffer.id) {
            return { ...msg, tradeOfferStatus: newOffer.status };
          }
          return msg;
        }));
      }
    });

    // Load existing trade offers
    const existingOffers = Array.from(connection.db.trade_offer.iter())
      .filter(o => o.roomId === props.roomId && o.status === 'open');
    existingOffers.forEach(offer => addTradeOfferMessage(offer));
  });

  const addMessageFromDB = (dbMessage: DBChatMessage) => {
    const connection = conn();
    if (!connection) return;

    const sender = Array.from(connection.db.user.iter()).find(u => u.identity.toHexString() === dbMessage.sender.toHexString());
    const timestamp = dbMessage.timestamp.seconds * 1000 + dbMessage.timestamp.nanoseconds / 1000000;

    const msg: ChatMessage = {
      id: dbMessage.id,
      senderId: dbMessage.sender.toHexString(),
      senderName: sender?.name || 'Anonymous',
      message: dbMessage.text,
      timestamp,
      type: 'player',
    };

    setMessages(prev => {
      // Avoid duplicates
      if (prev.some(m => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  };

  const addSystemMessage = (text: string) => {
    const msg: ChatMessage = {
      id: `system-${Date.now()}`,
      senderId: 'system',
      senderName: 'System',
      message: text,
      timestamp: Date.now(),
      type: 'system',
    };
    setMessages(prev => [...prev, msg]);
  };

  const addTradeOfferMessage = (offer: any) => {
    const connection = conn();
    if (!connection) return;

    const sender = Array.from(connection.db.user.iter()).find(
      u => u.identity.toHexString() === offer.fromPlayer
    );
    const label = offer.offerType === 'sell_vote' ? 'selling a vote' : 'looking to buy a vote';

    const msg: ChatMessage = {
      id: `trade-${offer.id}`,
      senderId: offer.fromPlayer,
      senderName: sender?.name || 'Anonymous',
      message: `${label} for $${offer.price.toFixed(2)}`,
      timestamp: Number(offer.createdAt?.seconds ?? Date.now() / 1000) * 1000,
      type: 'trade-offer',
      tradeOfferId: offer.id,
      tradeOfferType: offer.offerType,
      tradeOfferPrice: offer.price,
      tradeOfferStatus: offer.status,
    };

    setMessages(prev => {
      if (prev.some(m => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  };

  const handleAcceptOffer = async (offerId: number) => {
    const connection = conn();
    if (!connection) return;
    try {
      await connection.reducers.acceptTradeOffer({ offerId });
      showToast({ title: "Trade Accepted", description: "The trade has been completed!", variant: "success" });
    } catch (error: any) {
      showToast({ title: "Trade Failed", description: error?.message || "Could not complete trade", variant: "error" });
    }
  };

  const handleDeclineOffer = async (offerId: number) => {
    const connection = conn();
    if (!connection) return;
    try {
      await connection.reducers.cancelTradeOffer({ offerId });
    } catch {
      // Only the creator can cancel; declining as a non-creator is just ignoring it
    }
  };

  const handleCreateTradeOffer = async () => {
    const connection = conn();
    if (!connection) return;
    try {
      const voteId = tradeType() === 'sell_vote'
        ? (() => {
            const myVotes = Array.from(connection.db.vote.iter()).filter(
              v => v.roomId === props.roomId && v.playerId === identity()?.toHexString()
            );
            return myVotes.length > 0 ? myVotes[0].id : null;
          })()
        : null;

      await connection.reducers.createTradeOffer({
        roomId: props.roomId,
        roundNumber: props.roundNumber ?? 1,
        offerType: tradeType(),
        voteId,
        price: tradePrice(),
      });
      setShowTradeForm(false);
      showToast({ title: "Offer Posted", description: `Your ${tradeType() === 'sell_vote' ? 'sell' : 'buy'} offer has been posted`, variant: "success" });
    } catch (error: any) {
      showToast({ title: "Error", description: error?.message || "Failed to create offer", variant: "error" });
    }
  };

  const sendMessage = () => {
    const message = inputValue().trim();
    if (!message || !identity()) return;

    const connection = conn();
    if (!connection) return;

    try {
      // Send via SpacetimeDB reducer
      connection.reducers.sendChatMessage({ roomId: chatRoomId(), text: message, roundNumber: null });
      setInputValue('');
    } catch (error) {
      console.error('Failed to send chat message:', error);
      showToast({
        title: "Error",
        description: "Failed to send message. Make sure you have chat permissions.",
        variant: "error",
      });
    }
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getMessageTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div class="flex h-full flex-col bg-transparent" classList={{
      'h-12': props.minimized,
    }}>
      <Show when={props.onToggleMinimize}>
        <div class="cursor-pointer px-3 py-2 border-b border-white/10" onClick={props.onToggleMinimize}>
          <div class="flex items-center justify-between">
            <span class="flex items-center gap-2 text-sm font-semibold text-white/80">
              Chat {props.minimized && <span class="rounded border border-white/20 px-1.5 py-0.5 text-[10px] text-white/50">Minimized</span>}
            </span>
            <span class="text-[10px] text-white/40">
              {props.minimized ? '▲' : '▼'}
            </span>
          </div>
        </div>
      </Show>

      <Show when={!props.minimized}>
        <div class="flex flex-1 flex-col overflow-hidden">
          {/* Messages */}
          <div class="flex-1 overflow-auto p-3" ref={setScrollAreaRef} data-testid="chat-messages">
            <div class="space-y-2.5">
              <For each={messages()} fallback={
                <div class="py-6 text-center text-xs text-white/30">
                  No messages yet. Be the first to chat!
                </div>
              }>
                {(msg) => (
                  <div classList={{
                    'text-center': msg.type === 'system',
                  }}>
                    <Show when={msg.type === 'system'}>
                      <div class="inline-block rounded bg-white/5 px-3 py-1 text-xs text-white/40">
                        {msg.message}
                      </div>
                    </Show>

                    <Show when={msg.type === 'player'}>
                      <div classList={{
                        'text-right': msg.senderId === identity()?.toHexString(),
                      }}>
                        <div class="mb-0.5 flex items-center gap-2" classList={{
                          'justify-end': msg.senderId === identity()?.toHexString(),
                        }}>
                          <span class="text-[10px] font-semibold text-white/60">
                            {msg.senderName}
                          </span>
                          <span class="text-[10px] text-white/25">
                            {getMessageTime(msg.timestamp)}
                          </span>
                        </div>
                        <div class="inline-block max-w-[80%] rounded-lg px-2.5 py-1.5 text-xs" classList={{
                          'bg-blue-500/80 text-white': msg.senderId === identity()?.toHexString(),
                          'bg-white/10 text-white/80': msg.senderId !== identity()?.toHexString(),
                        }}>
                          {msg.message}
                        </div>
                      </div>
                    </Show>

                    <Show when={msg.type === 'trade-offer'}>
                      <div class="rounded-lg border" classList={{
                        "border-amber-500/30 bg-amber-500/10": msg.tradeOfferStatus === 'open',
                        "border-white/5 bg-white/5 opacity-50": msg.tradeOfferStatus !== 'open',
                      }}>
                        <div class="p-2.5 text-xs">
                          <div class="flex items-center justify-between">
                            <div class="font-semibold text-white/80">
                              {msg.tradeOfferType === 'sell_vote' ? 'Selling Vote' : 'Buying Vote'}
                            </div>
                            <span class="rounded border border-amber-400/30 bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                              ${msg.tradeOfferPrice?.toFixed(2)}
                            </span>
                          </div>
                          <div class="mt-1 text-[10px] text-white/40">
                            {msg.senderName} is {msg.message}
                          </div>
                          <Show when={msg.tradeOfferStatus === 'open' && msg.senderId !== identity()?.toHexString()}>
                            <div class="mt-2 flex gap-1.5">
                              <button class="rounded bg-emerald-600/80 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-emerald-500" onClick={() => handleAcceptOffer(msg.tradeOfferId!)}>
                                Accept
                              </button>
                              <button class="rounded bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/50 hover:bg-white/20" onClick={() => handleDeclineOffer(msg.tradeOfferId!)}>
                                Ignore
                              </button>
                            </div>
                          </Show>
                          <Show when={msg.tradeOfferStatus === 'open' && msg.senderId === identity()?.toHexString()}>
                            <div class="mt-2">
                              <button class="rounded bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/50 hover:bg-white/20" onClick={() => handleDeclineOffer(msg.tradeOfferId!)}>
                                Cancel Offer
                              </button>
                            </div>
                          </Show>
                          <Show when={msg.tradeOfferStatus === 'accepted'}>
                            <div class="mt-1.5 text-[10px] font-semibold text-emerald-400">Trade completed</div>
                          </Show>
                          <Show when={msg.tradeOfferStatus === 'cancelled'}>
                            <div class="mt-1.5 text-[10px] text-white/30">Cancelled</div>
                          </Show>
                        </div>
                      </div>
                    </Show>
                  </div>
                )}
              </For>
            </div>
          </div>

          {/* Trade Offer Form */}
          <Show when={showTradeForm()}>
            <div class="border-t border-amber-500/20 bg-amber-500/5 p-2.5 space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-white/70">Create Trade Offer</span>
                <button class="text-white/40 hover:text-white/70 text-xs" onClick={() => setShowTradeForm(false)}>✕</button>
              </div>
              <div class="flex gap-2">
                <select
                  class="flex-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80"
                  value={tradeType()}
                  onChange={(e) => setTradeType(e.currentTarget.value as 'sell_vote' | 'buy_vote')}
                >
                  <option value="sell_vote">Sell my vote</option>
                  <option value="buy_vote">Buy a vote</option>
                </select>
                <input
                  type="number"
                  min="0.01"
                  step="0.5"
                  value={tradePrice()}
                  onInput={(e) => setTradePrice(parseFloat(e.currentTarget.value) || 0)}
                  class="w-20 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80"
                />
              </div>
              <button class="w-full rounded bg-amber-600/80 px-2 py-1 text-xs font-medium text-white hover:bg-amber-500" onClick={handleCreateTradeOffer}>
                Post Offer (${tradePrice().toFixed(2)})
              </button>
            </div>
          </Show>

          {/* Input */}
          <div class="border-t border-white/10 p-2.5">
            <div class="flex gap-1.5">
              <input
                data-testid="chat-input"
                placeholder="Type a message..."
                value={inputValue()}
                onInput={(e) => setInputValue(e.currentTarget.value)}
                onKeyPress={handleKeyPress}
                class="flex-1 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white placeholder-white/25 outline-none focus:border-white/20"
              />
              <button
                class="rounded bg-white/10 px-2 py-1 text-sm hover:bg-white/20"
                onClick={() => setShowTradeForm(!showTradeForm())}
                title="Trade Offer"
              >
                🤝
              </button>
              <button
                data-testid={TID.sendButton}
                onClick={sendMessage}
                disabled={!inputValue().trim()}
                class="rounded bg-blue-600/80 px-3 py-1 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
            <div class="mt-1.5 text-[10px] text-white/20">
              Enter to send
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default ChatPanel;

