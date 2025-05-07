import { formatDistance } from "date-fns";
import { Component } from "solid-js";
import { ChatRoom } from "~/lib/Server/chat";
import { User } from "~/types/user";

export default function ChatMessage(props: {
  senderId: string;
  roomId: string;
  timestamp: number;
  message: string;
  members: User[];
}) {
  return (
    <div class={`chat ${props.senderId === props.senderId ? "chat-start" : "chat-end"}`}>
      <div class="avatar chat-image">
        <div class="w-10 rounded-full">
          <img
            alt="Tailwind CSS chat bubble component"
            src="https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.jpg"
          />
        </div>
      </div>
      <div class="chat-header">
        {props.members.find(member => member.id === props.senderId)?.username}
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
