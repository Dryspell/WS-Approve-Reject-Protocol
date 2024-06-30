import { formatDistance } from "date-fns";
import { Accessor } from "solid-js";
import { ChatRoom } from "~/lib/Server/chat";

export default function ChatMessage(props: {
  senderId: string;
  user: Accessor<{ id: string; name: string }>;
  members: ChatRoom[2];
  timestamp: number;
  message: string;
}) {
  return (
    <div class={`chat ${props.senderId === props.user().id ? "chat-start" : "chat-end"}`}>
      <div class="avatar chat-image">
        <div class="w-10 rounded-full">
          <img
            alt="Tailwind CSS chat bubble component"
            src="https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.jpg"
          />
        </div>
      </div>
      <div class="chat-header">
        {props.members.find(([id, name]) => id === props.senderId)?.[1]}
        <time class="px-2 text-xs opacity-50">
          {formatDistance(new Date(props.timestamp), new Date(), {
            addSuffix: true,
          })}
        </time>
      </div>
      <div class="chat-bubble">{props.message}</div>
      <div class="chat-footer opacity-50">Delivered</div>
    </div>
  );
}
