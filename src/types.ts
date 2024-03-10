import { LatLng } from 'leaflet'

export type GamePoint = {
  id: string
  name: string
  picto: string
  position: [number, number]
  userPosition: LatLng
}
