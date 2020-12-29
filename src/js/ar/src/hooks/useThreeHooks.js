import React, {useEffect, useState} from 'react'
import {useThree, useFrame} from "react-three-fiber"

import observable from "../../../utils/observable"

const useFrameCallbacks = []

export const useThreeFrame = (fn, options = []) => {
  options.__callback = fn
  useEffect(() => {
    useFrameCallbacks.push(options.__callback)
    
    return () => {
      useFrameCallbacks.splice(useFrameCallbacks.indexOf(options.__callback), 1)
    }
  }, options)
}

export const useThreeFrameProvider = () => {
  useFrame((...args) => {
    for (let callback of useFrameCallbacks) {
      callback(...args)
    }
  })
}


const state = observable(null)

export const useThreeState = () => {
  const [__, update] = useState(0)

  useEffect(() => {
    state.subscribe(update)

    return () => {
      state.unsubscribe(update)
    }
  }, [update])

  return state.get()
}

export const useThreeStateProvider = () => {
  const threeState = useThree()

  useEffect(() => {
    state.set(threeState)
  }, [threeState])
}