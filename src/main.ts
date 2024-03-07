import L, { LatLng, Layer, LayerGroup, Map, Marker, Polyline, TileLayer } from 'leaflet'
import '@kalisio/leaflet-graphicscale'
import {
  disableInteractivity,
  enableInteractivity,
  animatePoint,
  formatDistance,
  shuffleArray,
  last,
  clamp,
} from './utils'
import tin from '@turf/tin'
import { featureCollection } from '@turf/helpers'

const getId = L.DomUtil.get

type GamePoint = {
  name: string
  picto: string
  position: [number, number]
  userPosition?: LatLng
}

class Game {
  finished: boolean
  points: GamePoint[]
  guessingPoints: GamePoint[]
  startPoints: GamePoint[]
  map: Map
  mapBackground: TileLayer
  gameOverlays: LayerGroup
  markers: LayerGroup
  currentPointIndex: number
  mesh?: Layer

  constructor(points: GamePoint[]) {
    this.points = points
    this.startPoints = []
    this.guessingPoints = []
    this.finished = true
    this.currentPointIndex = -1
    this.mapBackground = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      className: 'mapBackground',
      attribution: `Data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> & contributors`,
    })

    this.map = L.map('map', {
      center: [48.85, 2.35],
      zoom: 12,
    })
      .addControl(
        /* @ts-ignore */
        L.control.graphicScale({
          fill: 'fill',
          showSubunits: true,
        })
      )
      .addLayer(this.mapBackground)
      .on('click', evt => {
        if (this.finished) {
          return
        }
        this.placePoint(this.guessingPoints[this.currentPointIndex], evt.latlng)
        this.advancePoint()
      })

    this.gameOverlays = L.layerGroup().addTo(this.map)
    this.markers = L.layerGroup()
    L.DomEvent.on(getId('startButton'), 'click', () => {
      this.initGame()
    })
    L.DomEvent.on(getId('replayButton'), 'click', () => {
      this.initGame()
    })
    L.DomEvent.on(getId('finishButton'), 'click', () => {
      this.validateInput()
    })
  }

  initGame() {
    L.DomUtil.addClass(L.DomUtil.get('dialog'), 'hidden')

    this.mapBackground.setOpacity(0)
    this.gameOverlays.clearLayers()
    this.markers = L.layerGroup().addTo(this.gameOverlays)

    const { startPoints, guessingPoints } = this.preparePoints(this.points, 2)
    this.startPoints = startPoints
    this.guessingPoints = guessingPoints

    this.fitMap()
    startPoints.forEach(startPoint => {
      this.createMarker(startPoint, true).addTo(this.markers)
    })

    this.finished = false
    this.currentPointIndex = -1

    this.map.getContainer().style.cursor = 'crosshair'

    this.advancePoint()
  }

  drawMesh() {
    const points = featureCollection(
      this.markers.getLayers().map(marker => (marker as Marker).toGeoJSON())
    )
    const mesh = tin(points)
    if (this.mesh) {
      this.gameOverlays.removeLayer(this.mesh)
    }
    this.mesh = L.geoJSON(mesh, {
      style: () => ({
        fillOpacity: 0,
        weight: 1,
        color: 'silver',
        dashArray: '2,2',
      }),
    }).addTo(this.gameOverlays)
  }

  preparePoints(points: GamePoint[], nbStart: number) {
    const shuffledPoints = shuffleArray(points)
    return {
      startPoints: shuffledPoints.slice(0, nbStart),
      guessingPoints: shuffledPoints.slice(nbStart),
    }
  }

  advancePoint() {
    this.currentPointIndex++
    if (this.currentPointIndex >= this.guessingPoints.length) {
      this.showEndMessage()
      this.finished = true
      this.map.getContainer().style.cursor = 'pointer'
    } else {
      this.showCurrentPoint(this.guessingPoints[this.currentPointIndex])
    }
  }

  placePoint(pointDefinition: GamePoint, clickedPosition: LatLng) {
    pointDefinition.userPosition = clickedPosition
    this.createMarker(pointDefinition, false).addTo(this.markers)
    this.drawMesh()
  }

  getIcon(pointDefinition: GamePoint, isStarting?: boolean) {
    return L.divIcon({
      className: 'gameMarker' + (isStarting ? ' startingPoint' : ''),
      iconSize: [60, 60],
      iconAnchor: [30, 60],
      html: `<div style="background-image: url(pictos/${pointDefinition.picto});"></div>`,
    })
  }

  createMarker(pointDef: GamePoint, isStarting?: boolean) {
    return L.marker(isStarting ? pointDef.position : pointDef.userPosition || [0, 0], {
      icon: this.getIcon(pointDef, isStarting),
      draggable: !isStarting,
    })
      .bindTooltip(pointDef.name, {
        direction: 'bottom',
        offset: [0, 20],
      })
      .on('dragend', evt => {
        pointDef.userPosition = evt.target.getLatLng()
      })
      .on('drag', () => {
        this.drawMesh()
      })
  }

  async validateInput() {
    this.gameOverlays.removeLayer(this.mesh)
    L.DomUtil.addClass(L.DomUtil.get('dialog'), 'hidden')

    disableInteractivity(this.map)
    this.markers.eachLayer(m => {
      ;(m as Marker).dragging?.disable()
    })
    this.mapBackground.setOpacity(0.75)

    for (let i = 0; i < this.guessingPoints.length; i++) {
      await this.checkPlace(this.guessingPoints[i])
    }

    this.showScoreScreen()
    enableInteractivity(this.map)
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
          .addTo(this.gameOverlays)
        const fullDistance = place.userPosition.distanceTo(place.position)
        animatePoint(
          place.userPosition || L.latLng([0, 0]),
          L.latLng(place.position),
          this.getAnimationDuration(fullDistance),
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

  getAnimationDuration(distance: number) {
    // duration proportional to distance, with max 3s, min 1/2s
    return clamp(distance, 500, 3000)
  }

  showDialog(content) {
    const dialog = getId('dialog')
    if (dialog.hasChildNodes() && dialog.dataset.saveNode) {
      getId('hide').appendChild(dialog.firstChild)
    } else {
      L.DomUtil.empty(dialog)
    }
    if (typeof content === 'string') {
      dialog.innerHTML = content
      dialog.dataset.saveNode = ''
    } else {
      dialog.appendChild(content)
      dialog.dataset.saveNode = 'true'
    }
    dialog.classList.remove('hidden')
  }

  showStartScreen() {
    this.showDialog(getId('startMessage'))
  }

  showEndMessage() {
    this.showDialog(getId('endMessage'))
  }

  fitMap() {
    this.map.flyToBounds(
      this.points.map(p => p.position),
      { padding: [100, 100] }
    )
  }

  showScoreScreen() {
    this.fitMap()

    const totalDistance = this.guessingPoints
      .map(pt => pt.userPosition.distanceTo(pt.position))
      .reduce((sum, points) => sum + points, 0)
    getId('finalScore').innerHTML = formatDistance(totalDistance)
    this.showDialog(getId('scoreMessage'))
  }

  showCurrentPoint(point: GamePoint) {
    this.showDialog(`<img class="previewPicto" src="pictos/${point.picto}" /><br />
            Placez <b>${point.name}</b>`)
  }
}

window.onload = function () {
  fetch('points.json')
    .then(response => response.json())
    .then(points => {
      const game = new Game(points as GamePoint[])
      game.showStartScreen()
    })
}
