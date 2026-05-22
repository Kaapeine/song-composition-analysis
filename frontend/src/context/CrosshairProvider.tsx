import { createContext, useContext, useState, type ReactNode } from 'react'

interface CrosshairCtx {
  hoverTime: number | null
  setHoverTime: (t: number | null) => void
}

const Ctx = createContext<CrosshairCtx | null>(null)

export function CrosshairProvider({ children }: { children: ReactNode }) {
  const [hoverTime, setHoverTime] = useState<number | null>(null)
  return <Ctx.Provider value={{ hoverTime, setHoverTime }}>{children}</Ctx.Provider>
}

export function useCrosshair(): CrosshairCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useCrosshair must be used inside CrosshairProvider')
  return ctx
}
