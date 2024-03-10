import { GamePoint } from './types'
import { formatDistance } from './utils'

class Panel {
  panel: HTMLElement
  onStart: () => void
  onEnd: () => void

  constructor(
    element: HTMLElement,
    { onStart, onEnd }: { onStart: () => void; onEnd: () => void }
  ) {
    this.panel = element
    this.onStart = onStart
    this.onEnd = onEnd

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

  setMessage(status: 'new' | 'lastPoint') {
    if (status === 'new') {
      this._setContent(`
        <p>Ceci est une carte de Paris</p>
        <button id="startButton">Démarrer</button>`)
      document.getElementById('startButton')?.addEventListener('click', this.onStart)
    } else if (status === 'lastPoint') {
      this._setContent(`
        <p>Vous pouvez encore changer la position des points</p>
        <button id="finishButton">Terminer</button>`)
      document.getElementById('finishButton')?.addEventListener('click', this.onEnd)
    }
  }

  setPoint(point: GamePoint) {
    this._setContent(`
        <img class="previewPicto" src="${point.picto}" alt="" />
        <p>Cliquez pour placer <b>${point.name}</b></p>`)
  }

  setScore(score: number) {
    this._setContent(`
        Score final :
        <div id="finalScore">${formatDistance(score)}</div>
        <button id="replayButton">Rejouer</button>
    `)
    document.getElementById('replayButton')?.addEventListener('click', this.onStart)
  }
}

const tpl_placePoint = `
  <img class="previewPicto" src="{picto}" alt="" />
  <p>Cliquez pour placer <b>{name}</b></p>
`

export default Panel
