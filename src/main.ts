import L, { LatLng } from 'leaflet'
import { getRememberedPoints, rememberPoints, forgetPreviousPoints, shuffleArray } from './utils'
import { Point, GamePoint, Area } from './types'
import GameMap from './GameMap'
import Panel from './Panel'

class Game {
  area: Area
  guessingPoints: GamePoint[]
  startPoints: GamePoint[]
  map: GameMap
  panel: Panel
  activeGame: boolean
  currentPointIndex: number
  skipValidation: boolean
  waitHandle: any

  constructor(area: Area) {
    this.area = area
    this.startPoints = []
    this.guessingPoints = []
    this.activeGame = false
    this.currentPointIndex = -1
    this.skipValidation = false

    this.map = new GameMap(
      document.getElementById('map') as HTMLElement,
      {
        center: L.latLngBounds(area.bounds).getCenter(),
        zoom: 12,
        maxBounds: area.bounds,
      },
      evt => {
        if (!this.activeGame) {
          return
        }
        this.placePoint(this.guessingPoints[this.currentPointIndex], evt.latlng)
        this.advancePoint()
      }
    )

    this.panel = new Panel(document.getElementById('panel') as HTMLElement, {
      onStart: () => this.startGame(),
      onRestart: (pickNew: boolean) => this.initGame(pickNew),
      onEnd: () => this.validateInput(),
      onJumpToResult: () => this.jumpToResult(),
    })

    this.initGame()
  }

  initGame(pickNew = false) {
    this.map.toggleBackground(false)
    this.map.clear()

    if (pickNew) {
      forgetPreviousPoints()
    }

    const { startPoints, guessingPoints } = this.preparePoints(this.area.points, 2)
    this.startPoints = startPoints
    this.guessingPoints = guessingPoints
    this.currentPointIndex = -1
    this.skipValidation = false

    this.panel.setNewGame(this.area.name, this.startPoints)

    startPoints.forEach(startPoint => {
      this.map.createMarker(startPoint)
    })
    this.map.fit()
  }

  startGame() {
    this.activeGame = true
    rememberPoints(this.startPoints)
    this.advancePoint()
  }

  preparePoints(points: Point[], nbStart: number) {
    const shuffledPoints = shuffleArray(points)
    const pointsFromUrl = getRememberedPoints()
      .map(id => shuffledPoints.find(pt => pt.id === id))
      .filter(pt => pt) as Point[]

    let startPoints: Point[], guessingPoints
    if (pointsFromUrl.length >= 2) {
      startPoints = pointsFromUrl
      guessingPoints = shuffledPoints.filter(pt => !startPoints.find(sp => sp.id === pt.id))
    } else {
      startPoints = shuffledPoints.slice(0, nbStart)
      guessingPoints = shuffledPoints.slice(nbStart)
    }

    return {
      startPoints: startPoints.map(pt => ({
        ...pt,
        isStarting: true,
        userPosition: L.latLng(pt.position),
      })),
      guessingPoints: guessingPoints.map(pt => ({
        ...pt,
        isStarting: false,
        userPosition: L.latLng(pt.position),
      })),
    }
  }

  advancePoint() {
    this.map.setCursor('crosshair')
    this.currentPointIndex++
    if (this.currentPointIndex >= this.guessingPoints.length) {
      this.activeGame = false
      this.panel.setMessage('lastPoint')
      this.map.setCursor('pointer')
    } else {
      this.panel.setPoint(this.guessingPoints[this.currentPointIndex], this.currentPointIndex === 0)
    }
  }

  placePoint(pointDefinition: GamePoint, clickedPosition: LatLng) {
    pointDefinition.userPosition = clickedPosition
    this.map.createMarker(pointDefinition)
  }

  waitFor(ms: number) {
    return new Promise(resolve => {
      this.waitHandle = setTimeout(() => resolve('waiting'), ms)
    })
  }

  async validateInput() {
    this.panel.setMessage('scoring')
    this.map.freezeInput()
    this.map.fit(
      [...this.startPoints, ...this.guessingPoints].flatMap(point => [
        point.position,
        point.userPosition,
      ])
    )
    await this.waitFor(1000) // wait for map animation and add some time

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
  fetch('game.json')
    .then(response => response.json())
    .then((area: Area) => {
      new Game(area)
    })
}
