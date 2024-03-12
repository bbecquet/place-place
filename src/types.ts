import { LatLng } from 'leaflet'

export type Point = {
  id: string
  name: string
  picto: string
  position: [number, number]
}

export type GamePoint = Point & {
  userPosition: LatLng
  isStarting: boolean
}
