import { GamePoint } from './types'
import { formatDistance } from './utils'
import { startIcon, restartIcon, checkIcon, fastForwardIcon } from './icons'
import { getImage } from './point'

class Panel {
  panel: HTMLElement
  onStart: () => void
  onEnd: () => void
  onJumpToResult: () => void

  constructor(
    element: HTMLElement,
    {
      onStart,
      onEnd,
      onJumpToResult,
    }: { onStart: () => void; onEnd: () => void; onJumpToResult: () => void }
  ) {
    this.panel = element
    this.onStart = onStart
    this.onEnd = onEnd
    this.onJumpToResult = onJumpToResult

    this.setMessage('new')
  }

  _setContent = (content: string | Node) => {
    if (typeof content === 'string') {
      this.panel.innerHTML = content
    } else {
      this.panel.innerHTML = ''
      this.panel.appendChild(content)
    }
  }

  setMessage(status: 'new' | 'lastPoint' | 'scoring') {
    this.panel.classList.remove('score')
    if (status === 'new') {
      this._setContent(`
        <p>Ceci est une carte de Paris</p>
        <button id="startButton">${startIcon} Démarrer</button>`)
      document.getElementById('startButton')?.addEventListener('click', this.onStart)
    } else if (status === 'lastPoint') {
      this._setContent(`
        <p>Vous pouvez encore changer la position des points.</p>
        <button id="finishButton">${checkIcon} Terminer</button>`)
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

  setPoint(point: GamePoint, isFirst?: boolean) {
    this._setContent(`
    <p>Cliquez sur la carte pour placer</p>
    <div class="currentPoint">
        ${getImage(point, false)}
        <b>${point.name}</b></div>
    ${!isFirst ? '<p class="small">Vous pouvez aussi déplacer les points précédents.</p>' : ''}`)
  }

  setScore(score: number) {
    this.panel.classList.add('score')
    document.getElementById('speedupScoring')?.remove()
    this.panel.innerHTML += `
        <div id="finalScore"><div>Score final</div><div>${formatDistance(score)}</div></div>
        <button id="replayButton">${restartIcon} Rejouer</button>
    `
    document.getElementById('replayButton')?.addEventListener('click', this.onStart)
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
      li.innerHTML = `${getImage(point, false)}<div>${point.name}</div>`
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
