import { Card } from "../ui/card";
import { children, JSXElement } from "solid-js";
import BsPersonCircle from "./BsPersonCircle";
import { User } from "~/types/user";

export default function UserAvatarCard(props: { user: User; children?: JSXElement }) {
  const { id, username, avatarURL } = props.user;
  const c = children(() => props.children);

  return (
    <Card class="m-1.5 p-2">
      <div class="flex flex-row items-center justify-center pb-1">
        <div class="avatar chat-image pr-2">
          {avatarURL ? (
            <div class="w-10 rounded-full">
              <img alt="Tailwind CSS chat bubble component" src={avatarURL} />
            </div>
          ) : (
            <BsPersonCircle />
          )}
        </div>
        <div class="chat-header">{username}</div>
      </div>
      {c()}
    </Card>
  );
}
