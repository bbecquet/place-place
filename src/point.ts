import { GamePoint } from './types'

function getImage(point: GamePoint, isStarting: boolean, color?: string) {
  return `<div class="gameMarker ${isStarting ? 'startingPoint' : ''}" ${
    color ? 'style="--color:' + color + ';"' : ''
  }>
    <div style="background-image: url(${point.picto});"></div>
  </div>`
}

export { getImage }
