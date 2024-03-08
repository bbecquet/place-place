import L, { LatLng } from 'leaflet'
import '@kalisio/leaflet-graphicscale'
import { formatDistance, shuffleArray } from './utils'
import GameMap from './GameMap'
import { GamePoint } from './types'

const getId = L.DomUtil.get

function setPanel(content: string | Node | null) {
  const panel = getId('panel') as HTMLElement
  if (typeof content === 'string') {
    panel.innerHTML = content
  } else {
    L.DomUtil.empty(panel)
    panel.appendChild(content)
  }
}

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
    this.map.freezeInput()

    for (let i = 0; i < this.guessingPoints.length; i++) {
      await this.map.checkPlace(this.guessingPoints[i])
    }

    this.map.fit()
    this.map.toggleInteractivity(true)

    this.showScoreScreen()
  }

  showStartScreen() {
    setPanel(getId('startMessage'))
  }

  showEndMessage() {
    setPanel(getId('endMessage'))
  }

  showScoreScreen() {
    const totalDistance = this.guessingPoints
      .map(pt => pt.userPosition.distanceTo(pt.position))
      .reduce((sum, points) => sum + points, 0)
    getId('finalScore').innerHTML = formatDistance(totalDistance)
    setPanel(getId('scoreMessage'))
  }

  showCurrentPoint(point: GamePoint) {
    setPanel(`<img class="previewPicto" src="pictos/${point.picto}" /><br />
            Placez <b>${point.name}</b>`)
  }
}

window.onload = function () {
  fetch('points.json')
    .then(response => response.json())
    .then(points => {
      const game = new Game(
        points.map((pt: Omit<GamePoint, 'userPosition'>) => ({
          ...pt,
          userPosition: L.latLng([0, 0]),
        })) as GamePoint[]
      )
      game.showStartScreen()
    })
}
