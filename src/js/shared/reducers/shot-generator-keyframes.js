/**
 * Keyframe Animation System for Camera and Object Animation
 * 
 * This module provides keyframe-based animation capabilities for:
 * - Camera position, rotation, and FOV animation
 * - Object transform animation
 * - Animation timeline management
 * - Interpolation between keyframes
 */

const THREE = require('three')

// Interpolation types
const InterpolationType = {
  LINEAR: 'linear',
  EASE_IN: 'easeIn',
  EASE_OUT: 'easeOut',
  EASE_IN_OUT: 'easeInOut',
  BEZIER: 'bezier'
}

// Default easing functions
const EasingFunctions = {
  linear: t => t,
  easeIn: t => t * t,
  easeOut: t => t * (2 - t),
  easeInOut: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

/**
 * Create a keyframe object
 * @param {number} time - Time in milliseconds
 * @param {object} values - Property values at this keyframe
 * @param {string} interpolation - Interpolation type
 * @returns {object} Keyframe object
 */
const createKeyframe = (time, values, interpolation = InterpolationType.LINEAR) => ({
  time,
  values: { ...values },
  interpolation,
  id: THREE.Math.generateUUID()
})

/**
 * Create an animation track for a specific property
 * @param {string} targetId - ID of the object/camera to animate
 * @param {string} propertyPath - Path to the property (e.g., 'position.x', 'rotation')
 * @param {array} keyframes - Array of keyframe objects
 * @returns {object} Animation track
 */
const createAnimationTrack = (targetId, propertyPath, keyframes = []) => ({
  targetId,
  propertyPath,
  keyframes: keyframes.sort((a, b) => a.time - b.time),
  id: THREE.Math.generateUUID()
})

/**
 * Interpolate value between two keyframes
 * @param {number} startTime - Start keyframe time
 * @param {number} endTime - End keyframe time
 * @param {number} currentTime - Current time
 * @param {number} startValue - Start value
 * @param {number} endValue - End value
 * @param {string} interpolation - Interpolation type
 * @returns {number} Interpolated value
 */
const interpolate = (startTime, endTime, currentTime, startValue, endValue, interpolation = InterpolationType.LINEAR) => {
  if (currentTime <= startTime) return startValue
  if (currentTime >= endTime) return endValue
  
  const duration = endTime - startTime
  const elapsed = currentTime - startTime
  let t = elapsed / duration
  
  // Apply easing
  const easeFn = EasingFunctions[interpolation] || EasingFunctions.linear
  t = easeFn(t)
  
  return startValue + (endValue - startValue) * t
}

/**
 * Get interpolated value for a property at a given time
 * @param {array} keyframes - Sorted array of keyframes
 * @param {number} time - Current time
 * @returns {object|null} Interpolated values or null
 */
const getValueAtTime = (keyframes, time) => {
  if (!keyframes || keyframes.length === 0) return null
  
  // Before first keyframe
  if (time <= keyframes[0].time) {
    return { ...keyframes[0].values }
  }
  
  // After last keyframe
  if (time >= keyframes[keyframes.length - 1].time) {
    return { ...keyframes[keyframes.length - 1].values }
  }
  
  // Find surrounding keyframes
  for (let i = 0; i < keyframes.length - 1; i++) {
    const kf1 = keyframes[i]
    const kf2 = keyframes[i + 1]
    
    if (time >= kf1.time && time <= kf2.time) {
      const result = {}
      
      // Interpolate each property
      for (const prop in kf1.values) {
        if (kf2.values.hasOwnProperty(prop)) {
          result[prop] = interpolate(
            kf1.time,
            kf2.time,
            time,
            kf1.values[prop],
            kf2.values[prop],
            kf1.interpolation
          )
        }
      }
      
      return result
    }
  }
  
  return null
}

/**
 * Initial state for keyframe animations
 */
const initialState = {
  tracks: {}, // Map of trackId -> animation track
  timelines: {}, // Map of timelineId -> { tracks: [], currentTime: 0, isPlaying: false, duration: 0 }
  activeTimeline: null
}

/**
 * Keyframe reducer for managing animation state
 */
const keyframeReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'CREATE_KEYFRAME': {
      const { trackId, time, values, interpolation } = action.payload
      if (!state.tracks[trackId]) return state
      
      const newKeyframe = createKeyframe(time, values, interpolation)
      const updatedTrack = {
        ...state.tracks[trackId],
        keyframes: [...state.tracks[trackId].keyframes, newKeyframe].sort((a, b) => a.time - b.time)
      }
      
      return {
        ...state,
        tracks: {
          ...state.tracks,
          [trackId]: updatedTrack
        }
      }
    }
    
    case 'DELETE_KEYFRAME': {
      const { trackId, keyframeId } = action.payload
      if (!state.tracks[trackId]) return state
      
      const updatedTrack = {
        ...state.tracks[trackId],
        keyframes: state.tracks[trackId].keyframes.filter(kf => kf.id !== keyframeId)
      }
      
      return {
        ...state,
        tracks: {
          ...state.tracks,
          [trackId]: updatedTrack
        }
      }
    }
    
    case 'UPDATE_KEYFRAME': {
      const { trackId, keyframeId, time, values, interpolation } = action.payload
      if (!state.tracks[trackId]) return state
      
      const updatedTrack = {
        ...state.tracks[trackId],
        keyframes: state.tracks[trackId].keyframes.map(kf => {
          if (kf.id === keyframeId) {
            return {
              ...kf,
              time: time !== undefined ? time : kf.time,
              values: values !== undefined ? { ...values } : kf.values,
              interpolation: interpolation || kf.interpolation
            }
          }
          return kf
        }).sort((a, b) => a.time - b.time)
      }
      
      return {
        ...state,
        tracks: {
          ...state.tracks,
          [trackId]: updatedTrack
        }
      }
    }
    
    case 'CREATE_ANIMATION_TRACK': {
      const { targetId, propertyPath, trackId } = action.payload
      const newTrack = createAnimationTrack(targetId, propertyPath, action.payload.keyframes || [])
      
      return {
        ...state,
        tracks: {
          ...state.tracks,
          [trackId || newTrack.id]: newTrack
        }
      }
    }
    
    case 'DELETE_ANIMATION_TRACK': {
      const { trackId } = action.payload
      const { [trackId]: removed, ...remainingTracks } = state.tracks
      return {
        ...state,
        tracks: remainingTracks
      }
    }
    
    case 'SET_TIMELINE_TIME': {
      const { timelineId, time } = action.payload
      if (!state.timelines[timelineId]) return state
      
      return {
        ...state,
        timelines: {
          ...state.timelines,
          [timelineId]: {
            ...state.timelines[timelineId],
            currentTime: Math.max(0, time)
          }
        }
      }
    }
    
    case 'PLAY_TIMELINE': {
      const { timelineId } = action.payload
      if (!state.timelines[timelineId]) return state
      
      return {
        ...state,
        timelines: {
          ...state.timelines,
          [timelineId]: {
            ...state.timelines[timelineId],
            isPlaying: true
          }
        }
      }
    }
    
    case 'PAUSE_TIMELINE': {
      const { timelineId } = action.payload
      if (!state.timelines[timelineId]) return state
      
      return {
        ...state,
        timelines: {
          ...state.timelines,
          [timelineId]: {
            ...state.timelines[timelineId],
            isPlaying: false
          }
        }
      }
    }
    
    case 'CREATE_TIMELINE': {
      const { timelineId, name = 'Timeline' } = action.payload
      return {
        ...state,
        timelines: {
          ...state.timelines,
          [timelineId]: {
            id: timelineId,
            name,
            tracks: [],
            currentTime: 0,
            isPlaying: false,
            duration: 0
          }
        }
      }
    }
    
    case 'ADD_TRACK_TO_TIMELINE': {
      const { timelineId, trackId } = action.payload
      if (!state.timelines[timelineId] || !state.tracks[trackId]) return state
      
      const timeline = state.timelines[timelineId]
      if (!timeline.tracks.includes(trackId)) {
        return {
          ...state,
          timelines: {
            ...state.timelines,
            [timelineId]: {
              ...timeline,
              tracks: [...timeline.tracks, trackId]
            }
          }
        }
      }
      return state
    }
    
    case 'REMOVE_TRACK_FROM_TIMELINE': {
      const { timelineId, trackId } = action.payload
      if (!state.timelines[timelineId]) return state
      
      const timeline = state.timelines[timelineId]
      return {
        ...state,
        timelines: {
          ...state.timelines,
          [timelineId]: {
            ...timeline,
            tracks: timeline.tracks.filter(id => id !== trackId)
          }
        }
      }
    }
    
    case 'SET_ACTIVE_TIMELINE': {
      const { timelineId } = action.payload
      return {
        ...state,
        activeTimeline: timelineId
      }
    }
    
    default:
      return state
  }
}

/**
 * Action creators
 */
const actions = {
  createKeyframe: (trackId, time, values, interpolation) => ({
    type: 'CREATE_KEYFRAME',
    payload: { trackId, time, values, interpolation }
  }),
  
  deleteKeyframe: (trackId, keyframeId) => ({
    type: 'DELETE_KEYFRAME',
    payload: { trackId, keyframeId }
  }),
  
  updateKeyframe: (trackId, keyframeId, updates) => ({
    type: 'UPDATE_KEYFRAME',
    payload: { trackId, keyframeId, ...updates }
  }),
  
  createAnimationTrack: (targetId, propertyPath, keyframes = [], trackId = null) => ({
    type: 'CREATE_ANIMATION_TRACK',
    payload: { targetId, propertyPath, keyframes, trackId }
  }),
  
  deleteAnimationTrack: (trackId) => ({
    type: 'DELETE_ANIMATION_TRACK',
    payload: { trackId }
  }),
  
  setTimelineTime: (timelineId, time) => ({
    type: 'SET_TIMELINE_TIME',
    payload: { timelineId, time }
  }),
  
  playTimeline: (timelineId) => ({
    type: 'PLAY_TIMELINE',
    payload: { timelineId }
  }),
  
  pauseTimeline: (timelineId) => ({
    type: 'PAUSE_TIMELINE',
    payload: { timelineId }
  }),
  
  createTimeline: (timelineId, name) => ({
    type: 'CREATE_TIMELINE',
    payload: { timelineId, name }
  }),
  
  addTrackToTimeline: (timelineId, trackId) => ({
    type: 'ADD_TRACK_TO_TIMELINE',
    payload: { timelineId, trackId }
  }),
  
  removeTrackFromTimeline: (timelineId, trackId) => ({
    type: 'REMOVE_TRACK_FROM_TIMELINE',
    payload: { timelineId, trackId }
  }),
  
  setActiveTimeline: (timelineId) => ({
    type: 'SET_ACTIVE_TIMELINE',
    payload: { timelineId }
  })
}

/**
 * Selectors
 */
const getTrackById = (state, trackId) => state.tracks[trackId]
const getTimelineById = (state, timelineId) => state.timelines[timelineId]
const getActiveTimeline = (state) => state.activeTimeline ? state.timelines[state.activeTimeline] : null
const getAllTracks = (state) => Object.values(state.tracks)
const getAllTimelines = (state) => Object.values(state.timelines)

/**
 * Utility function to get current animated values for a target
 * @param {object} state - Redux state
 * @param {string} targetId - Target object/camera ID
 * @param {number} time - Current time
 * @returns {object} Current animated values
 */
const getCurrentAnimatedValues = (state, targetId, time) => {
  const tracks = getAllTracks(state).filter(track => track.targetId === targetId)
  const result = {}
  
  tracks.forEach(track => {
    const values = getValueAtTime(track.keyframes, time)
    if (values) {
      // Set nested property
      const props = track.propertyPath.split('.')
      let obj = result
      for (let i = 0; i < props.length - 1; i++) {
        if (!obj[props[i]]) obj[props[i]] = {}
        obj = obj[props[i]]
      }
      obj[props[props.length - 1]] = values[Object.keys(values)[0]]
    }
  })
  
  return result
}

module.exports = {
  initialState,
  reducer: keyframeReducer,
  actions,
  selectors: {
    getTrackById,
    getTimelineById,
    getActiveTimeline,
    getAllTracks,
    getAllTimelines,
    getCurrentAnimatedValues
  },
  utils: {
    createKeyframe,
    createAnimationTrack,
    getValueAtTime,
    interpolate,
    InterpolationType,
    EasingFunctions
  }
}
