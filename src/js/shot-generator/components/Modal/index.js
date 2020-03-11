import React, { useRef, useEffect, useCallback } from 'react'
import posed, { PoseGroup } from 'react-pose'

import useOnClickOutside from './../../../hooks/use-on-click-outside'

const emptyCallback = () => {}

const modalBackgroundPoses = {
  enter: {
    opacity: 1,
    transition: {duration: 200}
  },
  exit: {
    opacity: 0,
    transition: {duration: 200},
    delay: 200
  }
}

const modalBodyPoses = {
  enter: {
    opacity: 1,
    marginTop: 0,
    transition: {duration: 200},
    delay: 100
  },
  exit: {
    opacity: 0,
    marginTop: -64,
    transition: {duration: 300}
  }
}

const ModalBackground = posed.div(modalBackgroundPoses)
const ModalBody = posed.div(modalBodyPoses)

const vAlignTable = {
  'top': 'flex-start',
  'center': 'center',
  'bottom': 'flex-end'
}

const hAlignTable = {
  'left': 'flex-start',
  'center': 'center',
  'right': 'flex-end'
}

/**
 * @property visible - is modal visible or not
 * @property hAlign - horizontal aligning [left, center, right]
 * @property vAlign - vertical aligning [top, center, bottom]
 * @property onClose - function that closes modal window
 * @property closeOnBackground - should modal window be closed on dark background or not
 * @property modalClassName - additional class for modal window
 */
const Modal = React.memo(({
  visible = false,
  hAlign = 'center',
  vAlign = 'center',
  closeOnBackground = true,
  modalClassName = null,
  children,
  onClose = emptyCallback
}) => {
  const modalRef = useRef()

  useOnClickOutside(modalRef, closeOnBackground ? onClose : emptyCallback)

  const styles = {
    justifyContent: hAlignTable[hAlign],
    alignItems: vAlignTable[vAlign],
  }
  
  useEffect(() => {
    if (visible) {
      document.activeElement.blur()
    }
  }, [visible])

  const keyDown = useCallback((event) => event.stopPropagation(), [])
  
  return (
    <PoseGroup >
      {
        visible &&
          <ModalBackground
              className="modal__overlay"
              style={styles}
              key="modalBackground"
              onKeyDown={ keyDown }
          >
            <ModalBody
                className={`modal__window ${modalClassName}`}
                ref={modalRef}
            >
              {children}
            </ModalBody>
          </ModalBackground>
      }
    </PoseGroup>
  )
})

export default Modal
