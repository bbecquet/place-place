import L, { LatLng } from 'leaflet'
import '@kalisio/leaflet-graphicscale'
import { formatDistance, shuffleArray } from './utils'
import GameMap from './GameMap'
import { GamePoint } from './types'

const getId = L.DomUtil.get

class Game {
  points: GamePoint[]
  guessingPoints: GamePoint[]
  startPoints: GamePoint[]
  map: GameMap
  finished: boolean
  currentPointIndex: number

  constructor(points: GamePoint[]) {
    this.points = points
    this.startPoints = []
    this.guessingPoints = []
    this.finished = true
    this.currentPointIndex = -1

    this.map = new GameMap(
      'map',
      {
        center: [48.85, 2.35],
        zoom: 12,
      },
      evt => {
        if (this.finished) {
          return
        }
        this.placePoint(this.guessingPoints[this.currentPointIndex], evt.latlng)
        this.advancePoint()
      }
    )

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

    this.map.toggleBackground(false)
    this.map.clear()

    const { startPoints, guessingPoints } = this.preparePoints(this.points, 2)
    this.startPoints = startPoints
    this.guessingPoints = guessingPoints
    this.finished = false
    this.currentPointIndex = -1

    startPoints.forEach(startPoint => {
      this.map.createMarker(startPoint, true)
    })
    this.map.fit()

    this.map.setCursor('crosshair')

    this.advancePoint()
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
      this.map.setCursor('pointer')
    } else {
      this.showCurrentPoint(this.guessingPoints[this.currentPointIndex])
    }
  }

  placePoint(pointDefinition: GamePoint, clickedPosition: LatLng) {
    pointDefinition.userPosition = clickedPosition
    this.map.createMarker(pointDefinition, false)
  }

  async validateInput() {
    // this.gameOverlays.removeLayer(this.mesh)
    L.DomUtil.addClass(L.DomUtil.get('dialog'), 'hidden')

    this.map.freezeInput()

    for (let i = 0; i < this.guessingPoints.length; i++) {
      await this.map.checkPlace(this.guessingPoints[i])
    }

    this.map.fit()
    this.map.toggleInteractivity(true)

    this.showScoreScreen()
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

  showScoreScreen() {
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
