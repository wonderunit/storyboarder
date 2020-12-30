import React, {createContext} from 'react'
import { createStore } from "redux"
import {produce} from "immer"

/**
 * 
 * Based on 
 * https://codesandbox.io/s/92pm9n2kl4
 * https://react-redux.js.org/api/connect#context-object
 * 
 */

const initState = {
  users: {},
  id: null
}

const getEmptyUser = (id = null) => ({
  matrix: new Array(16).fill(0),
  controllers: [],
  hasControllers: false,
  active: false,
  id
})

const createIfNotDef = (draft, id) => {
  if (!draft.users[id]) {
    
    draft.users[id] = getEmptyUser(id)
  }
  
  return draft.users[id]
}

const mainReducer =  (state = initState, action) => {
  return produce(state, draft => {
    switch (action.type) {
      case 'ADD_USER':
        createIfNotDef(draft, action.payload)
        return

      case 'REMOVE_USER':
        Reflect.deleteProperty(draft.users, action.payload)
        return

      case 'UPDATE_USER': 
        const user = createIfNotDef(draft, action.payload.id)
        
        for (let key of Object.keys(action.payload)) {
          user[key] = action.payload[key]
        }
         
        return
      
      case 'SET_ID':
        draft.id = action.payload
        return

      case 'SET_USERS':
        draft.users = action.payload
        return
      
      default: 
        return state
    }
  })
};

export const addUser = id => ({ type: 'ADD_USER', payload: id })
export const removeUser = id => ({ type: 'REMOVE_USER', payload: id })
export const updateUser = (id, values) => ({ type: 'UPDATE_USER', payload: {id, ...values} })
export const setId = (id) => ({ type: 'SET_ID', payload: id })
export const setUsers = (users) => ({ type: 'SET_USERS', payload: users })


export const getRemoteDevices = state => state.users
export const getRemoteDevice = id => state => state.users[id]

export const RestrictedActions = [
  'SELECT_OBJECT',
  'SELECT_OBJECT_TOGGLE',
  'SELECT_BONE',
  'SELECT_ATTACHABLE',
  'DESELECT_ATTACHABLE'
]

export const SelectActions = [
  'SELECT_OBJECT',
  'SELECT_OBJECT_TOGGLE',
  'SELECT_ATTACHABLE'
]


export const RemoteContext = createContext(null)
export const remoteStore = createStore(mainReducer)
