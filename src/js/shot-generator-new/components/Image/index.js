import React, {useEffect, useState, useRef} from 'react'
import CancelablePromise from "../../../utils/CancelablePromise"
import makeCancelable from "../../../utils/makeCancelable"

const loadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = resolve
    img.onerror = reject
    img.src = src
  })
}

const ImageComponent = React.memo(({src, fallback = null, className}) => {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const cancelable = makeCancelable(loadImage(src))

    cancelable.promise
    .then((data) => {
      setLoaded(true)
    })
    .catch(() => {})

    return () => {
      cancelable.cancel()
    }
  }, [src])

  if (loaded) {
    return <img src={src} alt="" className={className} decoding="async"/>
  } else {
    return fallback
  }
})

export default ImageComponent
