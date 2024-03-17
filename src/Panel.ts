import { GamePoint } from './types'
import { formatDistance } from './utils'
import { elt, setContent } from './dom'
import { startIcon, restartIcon, checkIcon, fastForwardIcon } from './icons'
import { pointItem } from './point'

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

  setMessage(status: 'lastPoint' | 'scoring') {
    if (status === 'lastPoint') {
      setContent(this.panel, [
        elt('p', {}, 'Vous pouvez encore changer la position des points avant de les vérifier.'),
        elt('button', { id: 'finishButton' }, `${checkIcon} Vérifier les positions`),
      ])
      document.getElementById('finishButton')?.addEventListener('click', this.onEnd)
    } else if (status === 'scoring') {
      setContent(this.panel, [
        elt('div', { class: 'detailedResults' }, [
          elt('ul', { id: 'pointScores' }),
          elt('button', { id: 'speedupScoring' }, `${fastForwardIcon} Score final`),
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
    setContent(this.panel, [
      elt('p', {}, `Ceci est une carte de <b>${placeName}</b>.`),
      elt('p', {}, `Les points suivants sont déjà placés&nbsp:`),
      elt(
        'ul',
        {},
        points.map(pt => elt('li', {}, pointItem(pt)))
      ),
      elt('p', {}, `Saurez-vous placer les autres ?`),
      elt('button', { id: 'startButton' }, `${startIcon} Jouer</button>`),
    ])
    document.getElementById('startButton')?.addEventListener('click', this.onStart)
  }

  setPoint(point: GamePoint, isFirst?: boolean) {
    this.panel.className = 'placing'
    setContent(this.panel, [
      elt('p', {}, 'Cliquez sur la carte pour placer'),
      pointItem(point, 'currentPoint'),
      elt(
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
    setContent(
      this.panel,
      [
        `<div id="finalScore"><div>Score final</div><div>${formatDistance(score)}</div></div>`,
        elt(
          'button',
          { id: 'replayButton' },
          `${restartIcon} <div>Rejouer <div class="small">Mêmes points de départ</div></div>`
        ),
        elt(
          'button',
          { id: 'replayButtonNew' },
          `${restartIcon} <div>Rejouer <div class="small">Nouveaux points</div></div>`
        ),
      ],
      true
    )
    document.getElementById('replayButton')?.addEventListener('click', () => this.onRestart(false))
    document
      .getElementById('replayButtonNew')
      ?.addEventListener('click', () => this.onRestart(true))
  }

  updateScoringDistance(point: GamePoint, distance: number, color: string) {
    let dist = document.querySelector('#pointScore_' + point.id + ' .dist')
    if (!dist) {
      dist = elt('div', { class: 'dist' })
      setContent(
        document.getElementById('pointScores') as HTMLElement,
        elt('li', { id: 'pointScore_' + point.id, class: 'pointScore' }, [pointItem(point), dist]),
        true
      )
    }
    ;(dist.parentElement as HTMLElement).style.cssText = '--color:' + color
    setContent(dist as HTMLElement, formatDistance(distance))
  }
}

export default Panel
