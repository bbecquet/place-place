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

export type Area = {
  name: string
  points: Point[]
  bounds: [[number, number], [number, number]]
}
