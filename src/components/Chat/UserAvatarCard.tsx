import { Card } from "../ui/card";

export default function UserAvatarCard(props: { name: string }) {
  return (
    <Card class="m-1.5 p-2">
      <div class="flex flex-row items-center justify-center">
        <div class="avatar chat-image pr-2">
          <div class="w-10 rounded-full">
            <img
              alt="Tailwind CSS chat bubble component"
              src="https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.jpg"
            />
          </div>
        </div>
        <div class="chat-header">{props.name}</div>
      </div>
    </Card>
  );
}
