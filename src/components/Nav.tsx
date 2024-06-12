import { useLocation } from "@solidjs/router";
import { For } from "solid-js";

const routes = [
	{
		value: "counters",
		label: "Counters",
	},
	{
		value: "pokemon",
		label: "Pokemon",
	},
	{
		value: "serialization",
		label: "Serialization",
	},
];

export default function Nav() {
	const location = useLocation();
	const active = (path: string) =>
		path == location.pathname
			? "border-sky-600"
			: "border-transparent hover:border-sky-600";
	return (
		<nav class="bg-sky-800">
			<ul class="container flex items-center p-3 text-gray-200">
				<For each={routes}>
					{({ value, label }) => (
						<li
							class={`border-b-2 ${active(
								`/${value}`
							)} mx-1.5 sm:mx-6`}
						>
							<a href={`/${value}`}>{label}</a>
						</li>
					)}
				</For>
			</ul>
		</nav>
	);
}
