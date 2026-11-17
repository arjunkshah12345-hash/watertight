import { Closing } from "@/components/site/closing";
import { Deck } from "@/components/site/deck";
import { Hero } from "@/components/site/hero";
import { Hull } from "@/components/site/hull";
import { Proof } from "@/components/site/proof";
import { Verify } from "@/components/site/verify";

export default function Home() {
  return (
    <main className="flex-1">
      <Hero />
      <Verify />
      <Hull />
      <Proof />
      <Deck />
      <Closing />
    </main>
  );
}
