import { Map, LatLng } from 'leaflet'

export function disableInteractivity(map: Map) {
  // @ts-ignore
  map._handlers.forEach(handler => {
    handler.disable()
  })
}

export function enableInteractivity(map: Map) {
  // @ts-ignore
  map._handlers.forEach(handler => {
    handler.enable()
  })
}

export const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(n, max))

function interpolateLatLng(p1: LatLng, p2: LatLng, duration: number, elapsed: number): LatLng {
  const k = clamp(elapsed / duration, 0, 1)
  return new LatLng(p1.lat + k * (p2.lat - p1.lat), p1.lng + k * (p2.lng - p1.lng))
}

export function animatePoint(
  p1: LatLng,
  p2: LatLng,
  duration: number,
  callback: (point: LatLng, finished?: boolean) => void
) {
  if (duration <= 0) {
    callback(p2, true)
    return
  }

  let start = -1

  function animationFrame(timeStamp: number) {
    if (start === -1) {
      start = timeStamp
    }
    const p = interpolateLatLng(p1, p2, duration, timeStamp - start)

    if (p.equals(p2)) {
      callback(p2, true)
      return
    }

    callback(p)
    requestAnimationFrame(animationFrame)
  }

  requestAnimationFrame(animationFrame)
}

export const formatDistance = (meters: number) => `${Math.round(meters / 10) * 10} m`

export const shuffleArray = <T>(array: Array<T>) => {
  const a = array.slice()
  let j, x, i
  for (i = a.length - 1; i > 0; i--) {
    j = Math.floor(Math.random() * (i + 1))
    x = a[i]
    a[i] = a[j]
    a[j] = x
  }
  return a
}

export const last = <T>(array: Array<T>) => array[array.length - 1]
