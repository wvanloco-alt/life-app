"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { resolvePaletteColor, resolveChartColors, type PaletteColor } from "@/lib/palette";

export function usePalette() {
  const { resolvedTheme } = useTheme();
  const [, setTick] = useState(0);

  useEffect(() => {
    setTick((t) => t + 1);
  }, [resolvedTheme]);

  return {
    resolve: resolvePaletteColor,
    chartColors: (count: number) => resolveChartColors(count),
    color: (name: PaletteColor) => resolvePaletteColor(name),
  };
}
