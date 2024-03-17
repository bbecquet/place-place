type DomContent = string | Node | Array<string | Node>

export const elt = (
  tagName: string,
  attributes: Record<string, string>,
  content?: DomContent
): HTMLElement => {
  const element = document.createElement(tagName)
  Object.entries(attributes).forEach(([k, v]) => {
    element.setAttribute(k, v)
  })
  if (content) {
    setContent(element, content)
  }
  return element
}

const appendTo = (element: HTMLElement, content: DomContent) => {
  if (Array.isArray(content)) {
    content.forEach(n => {
      appendTo(element, n)
    })
  } else if (typeof content === 'string') {
    element.innerHTML += content
  } else {
    element.appendChild(content)
  }
}

export const setContent = (element: HTMLElement, content: DomContent, append?: boolean) => {
  if (!append) {
    element.replaceChildren('')
  }
  appendTo(element, content)
}

export const btn = (
  label: string,
  icon: string,
  onClick: (event?: any) => void,
  attributes?: Record<string, string>
) => {
  const button = elt('button', attributes || {}, icon + label)
  button.addEventListener('click', onClick)
  return button
}
