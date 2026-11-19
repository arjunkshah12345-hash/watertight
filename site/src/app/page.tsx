import { Closing } from "@/components/site/closing";
import { Hero } from "@/components/site/hero";
import { Hull } from "@/components/site/hull";
import { Leak } from "@/components/site/leak";
import { Redline } from "@/components/site/redline";
import { Room } from "@/components/site/room";
import { Verify } from "@/components/site/verify";

export default function Home() {
  return (
    <main className="flex-1">
      <Hero />
      <Leak />
      <Room />
      <Redline />
      <Verify />
      <Hull />
      <Closing />
    </main>
  );
}
