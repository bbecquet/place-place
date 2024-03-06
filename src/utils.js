export function disableInteractivity(map) {
  map._handlers.forEach(handler => {
    handler.disable()
  })
}

export function enableInteractivity(map) {
  map._handlers.forEach(handler => {
    handler.enable()
  })
}

function interpolateLatLng(p1, p2, duration, t) {
  let k = t / duration
  k = k < 0 ? 0 : k
  k = k > 1 ? 1 : k
  return L.latLng(p1.lat + k * (p2.lat - p1.lat), p1.lng + k * (p2.lng - p1.lng))
}

export function animatePoint(p1, p2, duration, callback) {
  if (duration <= 0) {
    callback(L.latLng(p2), true)
    return
  }

  let start = null

  function animationFrame(timeStamp) {
    if (start === null) {
      start = timeStamp
    }
    const elapsed = timeStamp - start
    let p = interpolateLatLng(L.latLng(p1), L.latLng(p2), duration, elapsed)

    if (p.equals(p2)) {
      callback(p, true)
      return
    }

    callback(p)
    L.Util.requestAnimFrame(animationFrame)
  }

  L.Util.requestAnimFrame(animationFrame)
}

export const formatDistance = (meters) => `${Math.round(meters / 10) * 10} m`

export function shuffleArray(array) {
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