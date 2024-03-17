import { Map, Control, ControlOptions } from 'leaflet'
import { elt } from './dom'

class Compass extends Control {
  constructor(opts?: ControlOptions) {
    super(opts || { position: 'bottomright' })
  }

  onAdd(map: Map) {
    const img = elt('img', { src: 'images/compass.svg', class: 'compass-control' })
    return img
  }

  onRemove(map: Map) {
    // Nothing to do here
  }
}

export default Compass
