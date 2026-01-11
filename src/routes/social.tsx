import { clientOnly } from "@solidjs/start";

const SocialPanel = clientOnly(() => import("~/components/Social/SocialPanel"));

export default function SocialPage() {
  return (
    <main class="container mx-auto max-w-4xl p-4">
      <SocialPanel />
    </main>
  );
}
