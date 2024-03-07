import L, { LayerGroup, LeafletMouseEvent, Map, MapOptions, Marker, TileLayer } from 'leaflet'
import '@kalisio/leaflet-graphicscale'
import { animatePoint, formatDistance, last, clamp } from './utils'
// import tin from '@turf/tin'
// import { featureCollection } from '@turf/helpers'
import { GamePoint } from './types'

class GameMap {
  map: Map
  background: TileLayer
  markers: LayerGroup
  // mesh?: Layer

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

    /* @ts-ignore no TS declaration for this */
    const scale = L.control.graphicScale({
      fill: 'fill',
      showSubunits: true,
    })

    this.map = L.map(element, options)
      .addControl(scale)
      .addLayer(this.background)
      .addLayer(this.markers)
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

    return L.marker(isStarting ? point.position : point.userPosition || [0, 0], {
      icon,
      draggable: !isStarting,
    })
      .bindTooltip(point.name, { direction: 'bottom', offset: [0, 20] })
      .on('dragend', evt => {
        point.userPosition = evt.target.getLatLng()
      })
      .addTo(this.map)
    // .on('drag', () => {
    //   this.drawMesh()
    // })
  }

  freezeMarkers() {
    this.markers.eachLayer(m => {
      ;(m as Marker).dragging?.disable()
    })
  }

  clear() {
    this.markers.clearLayers()
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

  // drawMesh() {
  //   const mesh = tin(featureCollection(
  //     this.markers.getLayers().map(marker => (marker as Marker).toGeoJSON())
  //   ))
  //   if (this.mesh) {
  //     this.gameOverlays.removeLayer(this.mesh)
  //   }
  //   this.mesh = L.geoJSON(mesh, {
  //     style: () => ({
  //       fillOpacity: 0,
  //       weight: 1,
  //       color: 'silver',
  //       dashArray: '2,2',
  //     }),
  //   }).addTo(this.gameOverlays)
  // }
}

export default GameMap
