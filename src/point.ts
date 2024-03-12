import { GamePoint } from './types'

function getImage(point: GamePoint, color?: string) {
  return `<div class="gameMarker ${point.isStarting ? 'startingPoint' : ''}" ${
    color ? 'style="--color:' + color + ';"' : ''
  }>
    <div style="background-image: url(${point.picto});"></div>
  </div>`
}

export { getImage }
