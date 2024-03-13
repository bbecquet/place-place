import { GamePoint } from './types'
import { formatDistance } from './utils'
import { startIcon, restartIcon, checkIcon, fastForwardIcon } from './icons'
import { pointPanelItem } from './point'

class Panel {
  panel: HTMLElement
  onStart: () => void
  onRestart: (pickNew: boolean) => void
  onEnd: () => void
  onJumpToResult: () => void

  constructor(
    element: HTMLElement,
    {
      onStart,
      onRestart,
      onEnd,
      onJumpToResult,
    }: {
      onStart: () => void
      onRestart: (pickNew: boolean) => void
      onEnd: () => void
      onJumpToResult: () => void
    }
  ) {
    this.panel = element
    this.onStart = onStart
    this.onRestart = onRestart
    this.onEnd = onEnd
    this.onJumpToResult = onJumpToResult
  }

  _setContent = (content: string | Node) => {
    if (typeof content === 'string') {
      this.panel.innerHTML = content
    } else {
      this.panel.innerHTML = ''
      this.panel.appendChild(content)
    }
  }

  setMessage(status: 'lastPoint' | 'scoring') {
    if (status === 'lastPoint') {
      this._setContent(`
        <p>Vous pouvez encore changer la position des points avant de les vérifier.</p>
        <button id="finishButton">${checkIcon} Vérifier les positions</button>`)
      document.getElementById('finishButton')?.addEventListener('click', this.onEnd)
    } else if (status === 'scoring') {
      this._setContent(`
        <div class="detailedResults">
          <ul id="pointScores"></ul>
          <button id="speedupScoring">${fastForwardIcon} Score final</button>
        </div>`)
      document.getElementById('speedupScoring')?.addEventListener('click', evt => {
        this.onJumpToResult()
        ;(evt.target as HTMLElement).remove()
      })
    }
  }

  setNewGame(points: GamePoint[]) {
    this.panel.className = 'new'
    this._setContent(`
        <p>Ceci est une carte de <b>Paris</b>.</p>
        <p>Les points suivants sont déjà placés&nbsp:</p>
        <ul>${points.map(pt => `<li>${pointPanelItem(pt)}</li>`).join('')}</ul>
        <p>Saurez-vous placer les autres ?</p>
        <button id="startButton">${startIcon} Démarrer</button>`)
    document.getElementById('startButton')?.addEventListener('click', this.onStart)
  }

  setPoint(point: GamePoint, isFirst?: boolean) {
    this.panel.className = 'placing'
    this._setContent(`
    <p>Cliquez sur la carte pour placer</p>
    ${pointPanelItem(point, 'currentPoint')}
    ${
      !isFirst
        ? '<p class="small">Vous pouvez aussi déplacer les points précédents.</p>'
        : '<p class="small">Vous pouvez déplacer et zoomer/dézoomer la carte.</p>'
    }`)
  }

  setScore(score: number) {
    this.panel.className = 'score'
    document.getElementById('speedupScoring')?.remove()
    this.panel.innerHTML += `
        <div id="finalScore"><div>Score final</div><div>${formatDistance(score)}</div></div>
        <button id="replayButton">${restartIcon} <div>Rejouer <div class="small">Mêmes points de départ</div></div></button>
        <button id="replayButtonNew">${restartIcon} <div>Rejouer <div class="small">Nouveaux points</div></div></button>
    `
    document.getElementById('replayButton')?.addEventListener('click', () => this.onRestart(false))
    document
      .getElementById('replayButtonNew')
      ?.addEventListener('click', () => this.onRestart(true))
  }

  updateScoringDistance(point: GamePoint, distance: number, color: string) {
    let dist = document.querySelector('#pointScore_' + point.id + ' .dist')
    if (!dist) {
      const list = document.getElementById('pointScores') as HTMLElement
      const li = document.createElement('li')
      li.id = 'pointScore_' + point.id
      li.className = 'pointScore'
      dist = document.createElement('div')
      dist.className = 'dist'
      li.innerHTML = pointPanelItem(point)
      li.appendChild(dist)
      list.appendChild(li)
    }
    ;(dist.parentElement as HTMLElement).style.cssText = '--color:' + color
    dist.innerHTML = formatDistance(distance, true)
  }
}

const tpl_placePoint = `
  <img class="previewPicto" src="{picto}" alt="" />
  <p>Cliquez pour placer <b>{name}</b></p>
`

export default Panel
