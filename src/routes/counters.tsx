import useSocketCounter from "~/hooks/useCounters";

export default function CountersPage() {
  const { Counters } = useSocketCounter("1");

  return (
    <main class="mx-auto p-4 text-gray-700">
      <div>
        <Counters class="py-[1rem]" />
      </div>
    </main>
  );
}
