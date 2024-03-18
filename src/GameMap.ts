import L, {
  Control,
  LatLngBounds,
  LatLngExpression,
  LayerGroup,
  LeafletMouseEvent,
  Map,
  MapOptions,
  Marker,
  PointExpression,
  TileLayer,
} from 'leaflet'
import '@kalisio/leaflet-graphicscale'
import 'leaflet-textpath'
import tin from '@turf/tin'
import { featureCollection } from '@turf/helpers'
import { segmentEach } from '@turf/meta'
import { GamePoint } from './types'
import { animatePoint, formatDistance, clamp, isMobile } from './utils'
import { interpolateRgbBasis } from 'd3-interpolate'
import { getImage } from './point'
import Compass from './CompassControl'

const meshStyle = {
  weight: 1,
  color: 'silver',
  dashArray: '2,2',
}

const distanceRatioToColor = interpolateRgbBasis(['green', 'orange', 'red'])

class GameMap {
  map: Map
  background: TileLayer
  markers: LayerGroup
  mesh: LayerGroup
  results: LayerGroup
  iconSize: number
  pointToMarker: Record<string, Marker>
  attrControl: Control

  constructor(
    element: HTMLElement,
    options: MapOptions,
    onClick: (evt: LeafletMouseEvent) => void
  ) {
    this.background = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      className: 'mapBackground',
      attribution: `Fond de carte &copy; <a href="http://openstreetmap.org">contributeurs OpenStreetMap</a>`,
      opacity: 0,
    })
    this.markers = L.layerGroup()
    this.mesh = L.layerGroup()
    this.results = L.layerGroup()
    this.attrControl = L.control.attribution({ prefix: '' })

    /* @ts-ignore no TS declaration for this */
    const scale = L.control.graphicScale({
      fill: 'fill',
      showSubunits: true,
    })

    this.map = L.map(element, {
      ...options,
      minZoom: 11,
      zoomSnap: 0.1,
      wheelPxPerZoomLevel: 90,
      boxZoom: false,
      attributionControl: false,
    })
      .addControl(scale)
      .addControl(new Compass({ position: 'bottomleft' }))
      .addLayer(this.background)
      .addLayer(this.markers)
      .addLayer(this.mesh)
      .addLayer(this.results)
      .on('click', onClick)

    this.iconSize = isMobile() ? 40 : 50
    this.pointToMarker = {}

    new ResizeObserver(() => {
      this.map.invalidateSize()
    }).observe(element)
  }

  toggleBackground(active: boolean) {
    this.background.setOpacity(active ? 0.75 : 0)
    if (active) {
      this.map.addControl(this.attrControl)
    } else {
      this.map.removeControl(this.attrControl)
    }
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

  freezeInput() {
    this.freezeMarkers()
    this.toggleInteractivity(false)
    this.mesh.removeFrom(this.map)
  }

  createMarker(point: GamePoint) {
    const icon = L.divIcon({
      iconSize: [this.iconSize, this.iconSize],
      iconAnchor: [this.iconSize / 2, this.iconSize + 10],
      html: getImage(point),
    })

    const marker = L.marker(point.isStarting ? point.position : point.userPosition, {
      icon,
      draggable: !point.isStarting,
      autoPan: true,
    })
      .bindTooltip(point.name, {
        className: 'pointNameTooltip textOnlyTooltip',
        direction: 'top',
        offset: [0, -this.iconSize - 5],
        opacity: 1,
        permanent: true,
      })
      .on('dragend', evt => {
        // TODO: avoid this on-place modification of the model
        point.userPosition = evt.target.getLatLng()
      })
      .addTo(this.markers)
      .on('drag', () => {
        this.drawMesh()
      })

    this.pointToMarker[point.id] = marker

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
    this.results.clearLayers()
    this.pointToMarker = {}
  }

  // Totally empiric hack to fix fit bounds for small screens,
  // which over-zooms when the bounds is a narrow vertical rectangle.
  // Artificially expand the bounds
  fixBoundsForFit(bounds: LatLngBounds): LatLngBounds {
    if (!isMobile()) {
      return bounds
    }
    const wDelta = bounds.getEast() - bounds.getWest()
    const hDelta = bounds.getNorth() - bounds.getSouth()
    if (hDelta / wDelta < 0.9) {
      return bounds
    }
    return bounds
      .extend([bounds.getNorth(), bounds.getWest() - 0.025])
      .extend([bounds.getSouth(), bounds.getEast() + 0.025])
  }

  fit(points?: LatLngExpression[], disableAnimation?: boolean) {
    const coords = points || this.markers.getLayers().map(m => (m as Marker).getLatLng())
    const padding: PointExpression = isMobile() ? [50, 50] : [150, 150]
    this.map.flyToBounds(this.fixBoundsForFit(L.latLngBounds(coords)), {
      padding,
      animate: disableAnimation !== undefined && true ? false : undefined,
      duration: 0.5,
    })
  }

  checkPlace(
    point: GamePoint,
    animate: boolean,
    onUpdateDistance?: (distance: number, color: string) => void
  ) {
    return new Promise(resolve => {
      const distanceLine = L.polyline([point.userPosition], {
        dashArray: '5,10',
        color: 'blue',
      }).addTo(this.results)

      const fixedUserPositionMarker = L.circleMarker(point.userPosition, {
        radius: 8,
        fillOpacity: 1,
        stroke: false,
        fillColor: 'blue',
      })
        .bindTooltip('', {
          className: 'distanceTooltip textOnlyTooltip',
          offset: [0, -6],
          permanent: true,
          direction: 'top',
        })
        .addTo(this.results)

      const fullDistance = point.userPosition.distanceTo(point.position)
      // duration proportional to distance, with max 2s, min 1/2s
      const duration = animate ? clamp(fullDistance, 500, 1500) : 0
      const pointMarker = this.pointToMarker[point.id]

      animatePoint(point.userPosition, L.latLng(point.position), duration, (p, isFinished) => {
        const dist = p.distanceTo(point.userPosition)
        const color = distanceRatioToColor((dist - 250) / 3000)

        pointMarker.setLatLng(p).setIcon(
          L.divIcon({
            iconSize: [this.iconSize, this.iconSize],
            iconAnchor: [this.iconSize / 2, this.iconSize + 10],
            html: getImage(point, color),
          })
        )

        fixedUserPositionMarker
          .setTooltipContent(
            `<div class="content" style="--color: ${color}">${formatDistance(dist, true)}</div>`
          )
          .setStyle({ fillColor: color })
        distanceLine.setLatLngs([point.userPosition, p]).setStyle({ color })

        if (onUpdateDistance) {
          onUpdateDistance(dist, color)
        }

        if (isFinished) {
          resolve('finished!')
        }
      })
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
    this.mesh.clearLayers().addTo(this.map)
    lines.forEach(latLngs => {
      this.mesh.addLayer(
        L.polyline(latLngs, meshStyle)
          /* @ts-ignore leaflet-path doesn't have Typescript declarations */
          .setText(formatDistance(latLngs[0].distanceTo(latLngs[1]), true), {
            center: true,
            attributes: { fill: 'silver', dy: '-4px' },
          })
      )
    })
  }
}

export default GameMap
