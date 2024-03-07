import { LatLng } from 'leaflet'

export type GamePoint = {
  name: string
  picto: string
  position: [number, number]
  userPosition?: LatLng
}
