import L, {
  LatLngExpression,
  LayerGroup,
  LeafletMouseEvent,
  Map,
  MapOptions,
  Marker,
  TileLayer,
} from 'leaflet'
import '@kalisio/leaflet-graphicscale'
import 'leaflet-textpath'
import tin from '@turf/tin'
import { featureCollection } from '@turf/helpers'
import { segmentEach } from '@turf/meta'
import { GamePoint } from './types'
import { animatePoint, formatDistance, last, clamp } from './utils'

const meshStyle = {
  weight: 1,
  color: 'silver',
  dashArray: '2,2',
}

class GameMap {
  map: Map
  background: TileLayer
  markers: LayerGroup
  mesh: LayerGroup

  constructor(
    element: string | HTMLElement,
    options: MapOptions,
    onClick: (evt: LeafletMouseEvent) => void
  ) {
    this.background = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      className: 'mapBackground',
      attribution: `Data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> & contributors`,
    })
    this.markers = L.layerGroup()
    this.mesh = L.layerGroup()

    /* @ts-ignore no TS declaration for this */
    const scale = L.control.graphicScale({
      fill: 'fill',
      showSubunits: true,
    })

    this.map = L.map(element, options)
      .addControl(scale)
      .addLayer(this.background)
      .addLayer(this.markers)
      .addLayer(this.mesh)
      .on('click', onClick)
  }

  toggleBackground(active: boolean) {
    this.background.setOpacity(active ? 0.75 : 0)
  }

  setCursor(cursor: string) {
    this.map.getContainer().style.cursor = cursor
  }

  toggleInteractivity(active: boolean) {
    // @ts-ignore fiddling with Leaflet's private internals
    this.map._handlers.forEach(handler => {
      active ? handler.enable() : handler.disable()
    })
  }

  createMarker(point: GamePoint, isStarting?: boolean) {
    const icon = L.divIcon({
      className: 'gameMarker' + (isStarting ? ' startingPoint' : ''),
      iconSize: [60, 60],
      iconAnchor: [30, 60],
      html: `<div style="background-image: url(pictos/${point.picto});"></div>`,
    })

    L.marker(isStarting ? point.position : point.userPosition || [0, 0], {
      icon,
      draggable: !isStarting,
    })
      .bindTooltip(point.name, { direction: 'bottom', offset: [0, 20] })
      .on('dragend', evt => {
        // TODO: avoid this on-place modification of the model
        point.userPosition = evt.target.getLatLng()
      })
      .addTo(this.markers)
      .on('drag', () => {
        this.drawMesh()
      })

    this.drawMesh()
  }

  freezeMarkers() {
    this.markers.eachLayer(m => {
      ;(m as Marker).dragging?.disable()
    })
  }

  clear() {
    this.markers.clearLayers()
    this.mesh.clearLayers()
  }

  fit(points?: LatLngExpression[]) {
    const coords = points || this.markers.getLayers().map(m => (m as Marker).getLatLng())
    this.map.flyToBounds(L.latLngBounds(coords), { padding: [100, 100] })
  }

  checkPlace(place: GamePoint) {
    return new Promise(resolve => {
      setTimeout(() => {
        const distanceLine = L.polyline([place.userPosition], {
          dashArray: '5,10',
          color: 'blue',
        })
          .bindTooltip(
            line =>
              formatDistance(
                last((line as Polyline).getLatLngs() as LatLng[]).distanceTo(place.userPosition)
              ),
            {
              className: 'distanceTooltip',
              permanent: true,
              direction: 'top',
            }
          )
          .addTo(this.markers)

        const fullDistance = place.userPosition.distanceTo(place.position)
        // duration proportional to distance, with max 2s, min 1/2s
        const duration = clamp(fullDistance, 500, 2000)

        animatePoint(
          place.userPosition || L.latLng([0, 0]),
          L.latLng(place.position),
          duration,
          (p, isFinished) => {
            distanceLine.addLatLng(p).openTooltip(p)

            if (isFinished) {
              setTimeout(resolve, 1000)
            }
          }
        )
      }, 1000)
    })
  }

  drawMesh() {
    const mesh = tin(
      featureCollection(this.markers.getLayers().map(marker => (marker as Marker).toGeoJSON()))
    )
    const uniqueLines: Record<string, number[][]> = {}
    segmentEach(mesh, segment => {
      if (segment) {
        const coords = segment.geometry.coordinates.slice().sort()
        uniqueLines[coords.flat().join('|')] = coords
      }
    })
    const lines = Object.values(uniqueLines).map(line => line.map(pt => L.latLng(pt[1], pt[0])))
    this.mesh.clearLayers()
    lines.forEach(latLngs => {
      this.mesh.addLayer(
        L.polyline(latLngs, meshStyle)
          /* @ts-ignore leaflet-path doesn't have Typescript declarations */
          .setText(formatDistance(latLngs[0].distanceTo(latLngs[1])), {
            center: true,
          })
      )
    })
  }
}

export default GameMap
