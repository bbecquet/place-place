import L, { LatLng } from 'leaflet'
import { shuffleArray } from './utils'
import { GamePoint } from './types'
import GameMap from './GameMap'
import Panel from './Panel'

class Game {
  points: GamePoint[]
  guessingPoints: GamePoint[]
  startPoints: GamePoint[]
  map: GameMap
  panel: Panel
  finished: boolean
  currentPointIndex: number

  constructor(points: GamePoint[]) {
    this.points = points
    this.startPoints = []
    this.guessingPoints = []
    this.finished = true
    this.currentPointIndex = -1

    this.map = new GameMap(
      document.getElementById('map') as HTMLElement,
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

    this.panel = new Panel(document.getElementById('panel') as HTMLElement, {
      onStart: () => this.initGame(),
      onEnd: () => this.validateInput(),
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

    this.map.fit(undefined, true)
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
      this.finished = true
      this.panel.setMessage('lastPoint')
      this.map.setCursor('pointer')
    } else {
      this.panel.setPoint(this.guessingPoints[this.currentPointIndex])
    }
  }

  placePoint(pointDefinition: GamePoint, clickedPosition: LatLng) {
    pointDefinition.userPosition = clickedPosition
    this.map.createMarker(pointDefinition, false)
  }

  async validateInput() {
    this.map.fit(this.points.flatMap(point => [point.position, point.userPosition]))
    this.map.freezeInput()
    this.panel.setMessage('scoring')

    for (let i = 0; i < this.guessingPoints.length; i++) {
      const point = this.guessingPoints[i]
      await this.map.checkPlace(point, (dist, color) =>
        this.panel.updateScoringDistance(point, dist, color)
      )
    }

    this.map.toggleInteractivity(true)

    const totalDistance = this.guessingPoints
      .map(pt => pt.userPosition.distanceTo(pt.position))
      .reduce((sum, points) => sum + points, 0)
    this.panel.setScore(totalDistance)
  }
}

window.onload = function () {
  fetch('points.json')
    .then(response => response.json())
    .then(points => {
      new Game(
        points.map((pt: Omit<GamePoint, 'userPosition'>) => ({
          ...pt,
          userPosition: L.latLng(pt.position),
        })) as GamePoint[]
      )
    })
}
