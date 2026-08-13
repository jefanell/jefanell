import type { Metadata } from "next";
import { MetarDashboard } from "./metar-dashboard";

export const metadata: Metadata = {
  title: "KPTK Visual METAR",
  description: "A graphical live METAR briefing for Oakland County International Airport.",
};

export default function Home() {
  return <MetarDashboard />;
}
