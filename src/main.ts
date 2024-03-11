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
  skipValidation: boolean
  waitHandle: any

  constructor(points: GamePoint[]) {
    this.points = points
    this.startPoints = []
    this.guessingPoints = []
    this.finished = true
    this.currentPointIndex = -1
    this.skipValidation = false

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
      onJumpToResult: () => this.jumpToResult(),
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
    this.skipValidation = false

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
      this.panel.setPoint(this.guessingPoints[this.currentPointIndex], this.currentPointIndex === 0)
    }
  }

  placePoint(pointDefinition: GamePoint, clickedPosition: LatLng) {
    pointDefinition.userPosition = clickedPosition
    this.map.createMarker(pointDefinition, false)
  }

  waitFor(ms: number) {
    return new Promise(resolve => {
      this.waitHandle = setTimeout(() => resolve('waiting'), ms)
    })
  }

  async validateInput() {
    this.map.freezeInput()
    this.map.fit(this.points.flatMap(point => [point.position, point.userPosition]))
    await this.waitFor(500)
    this.panel.setMessage('scoring')

    for (let i = 0; i < this.guessingPoints.length; i++) {
      const point = this.guessingPoints[i]
      await this.map.checkPlace(point, !this.skipValidation, (dist, color) =>
        this.panel.updateScoringDistance(point, dist, color)
      )
      if (!this.skipValidation) {
        await this.waitFor(1500)
      }
    }

    this.map.toggleBackground(true)
    this.map.toggleInteractivity(true)

    const totalDistance = this.guessingPoints
      .map(pt => pt.userPosition.distanceTo(pt.position))
      .reduce((sum, points) => sum + points, 0)
    this.panel.setScore(totalDistance)
  }

  jumpToResult() {
    this.skipValidation = true
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
