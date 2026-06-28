import { CliRenderEvents, type TerminalColors } from "@opentui/core"
import { useRenderer } from "@opentui/react"
import { useEffect, useState } from "react"

// DEC private mode 2031: ask the terminal to emit a notification
// (CSI ? 997 ; 1|2 n) whenever its color scheme changes. OpenTUI reacts to
// that notification but never enables the mode itself, so we do it here.
const ENABLE_COLOR_SCHEME_UPDATES = "\x1B[?2031h"
const DISABLE_COLOR_SCHEME_UPDATES = "\x1B[?2031l"

// Fallback for terminals that don't support mode 2031: re-query periodically.
const POLL_INTERVAL_MS = 200

function signature(colors: TerminalColors): string {
  return [colors.defaultForeground, colors.defaultBackground, ...colors.palette].join("|")
}

export function useTerminalColors() {
  const renderer = useRenderer()
  const [colors, setColors] = useState<TerminalColors | null>(null)

  useEffect(() => {
    let alive = true
    let lastSignature: string | null = null

    const update = (next: TerminalColors) => {
      if (!alive) return
      const sig = signature(next)
      if (sig === lastSignature) return
      lastSignature = sig
      setColors(next)
    }

    process.stdout.write(ENABLE_COLOR_SCHEME_UPDATES)

    renderer.getPalette({ timeout: 200 }).then(update).catch(() => {})
    renderer.on(CliRenderEvents.PALETTE, update)

    const poll = setInterval(() => {
      renderer.clearPaletteCache()
      renderer.getPalette({ timeout: 200 }).then(update).catch(() => {})
    }, POLL_INTERVAL_MS)

    return () => {
      alive = false
      clearInterval(poll)
      renderer.off(CliRenderEvents.PALETTE, update)
      process.stdout.write(DISABLE_COLOR_SCHEME_UPDATES)
    }
  }, [renderer])

  return colors?.palette.map((c) => c?.toString()) ?? [];
}
