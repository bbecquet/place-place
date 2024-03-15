import { GamePoint } from './types'
import { formatDistance } from './utils'
import { startIcon, restartIcon, checkIcon, fastForwardIcon } from './icons'
import { pointPanelItem } from './point'

type DomContent = string | Node | Array<string | Node>

const ce = (
  tagName: string,
  attributes: Record<string, string>,
  content?: DomContent
): HTMLElement => {
  console.log('plup')
  const elt = document.createElement(tagName)
  Object.entries(attributes).forEach(([k, v]) => {
    elt.setAttribute(k, v)
  })
  if (content) {
    ec(elt, content)
  }
  return elt
}

const ec = (elt: HTMLElement, content: DomContent) => {
  // TODO: replaceChildren
  if (Array.isArray(content)) {
    content.forEach(n => {
      ec(elt, n)
    })
  } else if (typeof content === 'string') {
    elt.innerHTML = content
  } else {
    elt.appendChild(content)
  }
}

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

  _setContent = (content: DomContent) => {
    ec(this.panel, content)
  }

  setMessage(status: 'lastPoint' | 'scoring') {
    if (status === 'lastPoint') {
      this._setContent([
        ce('p', {}, 'Vous pouvez encore changer la position des points avant de les vérifier.'),
        ce('button', { id: 'finishButton' }, `${checkIcon} Vérifier les positions`),
      ])
      document.getElementById('finishButton')?.addEventListener('click', this.onEnd)
    } else if (status === 'scoring') {
      this._setContent([
        ce('div', { class: 'detailedResults' }, [
          ce('ul', { id: 'pointScores' }),
          ce('button', { id: 'speedupScoring' }, `${fastForwardIcon} Score final`),
        ]),
      ])
      document.getElementById('speedupScoring')?.addEventListener('click', evt => {
        this.onJumpToResult()
        ;(evt.target as HTMLElement).remove()
      })
    }
  }

  setNewGame(placeName: string, points: GamePoint[]) {
    this.panel.className = 'new'
    this._setContent([
      ce('p', {}, `Ceci est une carte de <b>${placeName}</b>.`),
      ce('p', {}, `Les points suivants sont déjà placés&nbsp:`),
      ce(
        'ul',
        {},
        points.map(pt => ce('li', {}, pointPanelItem(pt)))
      ),
      ce('p', {}, `Saurez-vous placer les autres ?`),
      ce('button', { id: 'startButton' }, `${startIcon} Démarrer</button>`),
    ])
    document.getElementById('startButton')?.addEventListener('click', this.onStart)
  }

  setPoint(point: GamePoint, isFirst?: boolean) {
    this.panel.className = 'placing'
    this._setContent([
      ce('p', {}, 'Cliquez sur la carte pour placer'),
      pointPanelItem(point, 'currentPoint'),
      ce(
        'p',
        { class: 'small' },
        !isFirst
          ? 'Vous pouvez aussi déplacer les points précédents.'
          : 'Vous pouvez déplacer et zoomer/dézoomer la carte.'
      ),
    ])
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
      dist = ce('div', { class: 'dist' })
      const list = document.getElementById('pointScores') as HTMLElement
      ec(
        list,
        ce('li', { id: 'pointScore_' + point.id, class: 'pointScore' }, [
          pointPanelItem(point),
          dist,
        ])
      )
    }
    ;(dist.parentElement as HTMLElement).style.cssText = '--color:' + color
    dist.innerHTML = formatDistance(distance, true)
  }
}

export default Panel
