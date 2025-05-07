import { formatDistance } from "date-fns";
import { Component } from "solid-js";
import { User } from "~/types/user";
import BsPersonCircle from "./BsPersonCircle";

export default function ChatMessage(props: {
  senderId: string;
  roomId: string;
  timestamp: number;
  message: string;
  members: User[];
}) {
  const sender = props.members.find(member => member.id === props.senderId);
  const isCurrentUser = props.senderId === props.senderId;

  return (
    <div class={`chat ${isCurrentUser ? "chat-end" : "chat-start"}`}>
      <div class="avatar chat-image">
        <div class="w-10 rounded-full">
          {sender?.avatarURL ? (
            <img
              alt={`${sender.username}'s avatar`}
              src={sender.avatarURL}
              class="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <BsPersonCircle />
            </div>
          )}
        </div>
      </div>
      <div class="chat-header">
        {sender?.username || "Unknown User"}
        <time class="px-2 text-xs opacity-50">
          {formatDistance(new Date(props.timestamp), new Date(), {
            addSuffix: true,
          })}
        </time>
      </div>
      <div class={`chat-bubble ${isCurrentUser ? "chat-bubble-primary" : ""}`}>
        {props.message}
      </div>
      <div class="chat-footer opacity-50">
        {formatDistance(new Date(props.timestamp), new Date(), {
          addSuffix: true,
        })}
      </div>
    </div>
  );
}
