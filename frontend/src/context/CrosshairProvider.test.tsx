import { renderHook, act } from '@testing-library/react'
import { CrosshairProvider, useCrosshair } from './CrosshairProvider'

test('useCrosshair defaults to null hoverTime', () => {
  const { result } = renderHook(() => useCrosshair(), {
    wrapper: CrosshairProvider,
  })
  expect(result.current.hoverTime).toBeNull()
})

test('setHoverTime updates context', () => {
  const { result } = renderHook(() => useCrosshair(), {
    wrapper: CrosshairProvider,
  })
  act(() => result.current.setHoverTime(42.5))
  expect(result.current.hoverTime).toBe(42.5)
})

test('useCrosshair throws outside provider', () => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
  expect(() => renderHook(() => useCrosshair())).toThrow()
  spy.mockRestore()
})
