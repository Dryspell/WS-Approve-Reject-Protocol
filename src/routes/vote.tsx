import { clientOnly } from "@solidjs/start";
const VoteBox = clientOnly(() => import("~/components/VoteBox"));

export default function VotePage() {
	return (
		<main class="mx-auto text-gray-700 p-4">
			<VoteBox />
		</main>
	);
}
