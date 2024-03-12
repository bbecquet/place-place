import { GamePoint } from './types'

function getImage(point: GamePoint, color?: string) {
  return `<div class="gameMarker ${point.isStarting ? 'startingPoint' : ''}" ${
    color ? 'style="--color:' + color + ';"' : ''
  }>
    <div style="background-image: url(${point.picto});"></div>
  </div>`
}

function pointPanelItem(point: GamePoint, className = '') {
  return `<div class="point ${className}">
    ${getImage(point)}
    ${point.name}
  </div>`
}

export { getImage, pointPanelItem }
