import AgentPageComponent from "./agent/page";
import { Suspense } from "react";

export default function Home() {

  return (
    <Suspense>
      <AgentPageComponent />
    </Suspense>
  );
}
