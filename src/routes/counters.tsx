import useSocketCounter from "~/hooks/useCounters";
import { socket } from "~/lib/Client/socket";

export default function CountersPage() {
  // socket.on("connect", () => {
  // 	console.log("connected to server!!");
  // });

  const { Counters } = useSocketCounter("1");

  return (
    <main class="mx-auto p-4 text-gray-700">
      <div>
        <Counters class="py-[1rem]" />
      </div>
    </main>
  );
}
