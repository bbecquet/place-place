import { GamePoint } from './types'
import { elt } from './dom'

function getImage(point: GamePoint, color?: string) {
  return elt(
    'div',
    {
      class: `gameMarker ${point.isStarting ? 'startingPoint' : ''}`,
      style: color ? `--color:${color};` : '',
    },
    [elt('div', { style: `background-image: url(${point.picto});` })]
  )
}

function pointPanelItem(point: GamePoint, className = '') {
  return elt('div', { class: `point ${className}` }, [getImage(point), point.name])
}

export { getImage, pointPanelItem as pointItem }
