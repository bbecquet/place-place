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

  setMessage(status: 'new' | 'lastPoint' | 'scoring') {
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
    } else if (status === 'scoring') {
      this._setContent(`<p>Résultats :</p><ul id="pointScores"></ul>`)
    }
  }

  setPoint(point: GamePoint) {
    this._setContent(`
        <img class="previewPicto" src="${point.picto}" alt="" />
        <p>Cliquez pour placer <b>${point.name}</b></p>`)
  }

  setScore(score: number) {
    this.panel.innerHTML += `
        Score final :
        <div id="finalScore">${formatDistance(score)}</div>
        <button id="replayButton">Rejouer</button>
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
      li.innerHTML = `<div>${point.name}</div>`
      li.appendChild(dist)
      list.appendChild(li)
    }
    ;(dist as HTMLElement).style.cssText = '--color:' + color
    dist.innerHTML = formatDistance(distance, true)
  }
}

const tpl_placePoint = `
  <img class="previewPicto" src="{picto}" alt="" />
  <p>Cliquez pour placer <b>{name}</b></p>
`

export default Panel
