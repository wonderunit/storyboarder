let count = 0
let timeout
let notifications = []
let messages
let container

const removeNotification = (index) => {
  let notification = notifications.find(n => n.index == index)
  if (notification) {
    let el = notification.el
    el.style.opacity = 0
    clearTimeout(notification.index)
    if (el.parentNode) {
      setTimeout(() => {
        if (el.parentNode) {
          el.parentNode.removeChild(el)
        }
      }, 1000)
    }
  }
}

const addNotification = (data) => {
  let el, content, height, index

  index = count++

  el = document.createElement('div')
  el.classList.add('notification')
  el.dataset.index = index

  content = document.createElement('div')
  content.classList.add('notification-content')
  content.innerHTML = 
  `
    <div>
      <div>
        ${data.message}
      </div>
    ` +
    (data.author ? `<div class="notification-content_author">
                      ${data.author}
                    </div>`
                 : '') +
    `</div>`

  el.appendChild(content)

  container.appendChild(el)
  height = el.offsetHeight
  el.style.height = '0px'
  setTimeout(() => { 
    el.style.height = height + 'px'
  }, 1)


  let timing
  if (data.timing) {
    timing = Number(data.timing) * 1000
  } else {
    timing = 30 * 1000
  }


  let timer = setTimeout(removeNotification, timing, index)

  let result = {
    index,
    el,
    height,
    timer
  }
  notifications.push(result)
  return result
}

const formatMessageData = (data) => {
  data.message = data.message.replace(/\n/g, '<br />')
  return data
}

const onPointerDown = event =>
  removeNotification(event.target.dataset.index)

const init = (el) => {
  container = el
  
  container.addEventListener('pointerdown', onPointerDown)
}

let notify = (data) =>
  addNotification(formatMessageData(data))

module.exports = {
  init,
  notify
}
