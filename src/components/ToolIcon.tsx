import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlignLeft,
  ArrowLeftRight,
  Atom,
  Bot,
  Box,
  Boxes,
  Calculator,
  ChartLine,
  Clock,
  Crosshair,
  Dna,
  FlaskConical,
  GitBranch,
  LayoutGrid,
  Microscope,
  Network,
  Pill,
  Radar,
  Scissors,
  Search,
  ShieldAlert,
  Slice,
  Skull,
  Syringe,
  Target,
  TestTube,
} from "lucide-react";

/**
 * Central Lucide icon registry — single source of truth for the hub.
 * Keyed by tool route so nav, hub cards and page heroes stay in sync.
 * One icon pack (Lucide, ISC license) across the app; no hand-rolled SVG
 * strings and no emoji icons.
 */
export const TOOL_ICONS: Record<string, LucideIcon> = {
  "/": LayoutGrid,
  "/drug-repurposing": Pill,
  "/admet": Activity,
  "/pkpd": ChartLine,
  "/dose-calculator": Calculator,
  "/pdb-viewer": Box,
  "/epitopes": Target,
  "/vaccine-designer": Syringe,
  "/sequence-id": Search,
  "/outbreak-surveillance": Radar,
  "/toxicity-ml": Skull,
  "/variant-effect": GitBranch,
  "/structure-prediction": Boxes,
  "/primer-designer": Crosshair,
  "/amr": ShieldAlert,
  "/crispr": Slice,
  "/codon-optimizer": ArrowLeftRight,
  "/ai-vet": Bot,
  "/alignment": AlignLeft,
  "/phylogeny": Network,
  "/restriction-map": Scissors,
  "/plasmid-map": Atom,
  "/molecular-clock": Clock,
  "/elisa": TestTube,
};

/** Category-level icons for the hub page. */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  pharmacology: Pill,
  "vaccines-diagnostics": Syringe,
  genomics: Dna,
  "diagnostics-tools": Microscope,
};

interface IconProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
}

/** Tool icon by route href. Falls back to a flask. */
export function ToolIcon({ href, size = 16, className, strokeWidth = 2 }: IconProps & { href: string }) {
  const Icon = TOOL_ICONS[href] ?? FlaskConical;
  return <Icon size={size} strokeWidth={strokeWidth} className={className} aria-hidden="true" />;
}

/** Category icon by category id. */
export function CategoryIcon({ id, size = 20, className, strokeWidth = 2 }: IconProps & { id: string }) {
  const Icon = CATEGORY_ICONS[id] ?? FlaskConical;
  return <Icon size={size} strokeWidth={strokeWidth} className={className} aria-hidden="true" />;
}
