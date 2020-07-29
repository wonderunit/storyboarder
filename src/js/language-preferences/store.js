
const { produce } = require('immer')
const initialState = { 
    hello:"hello"
}

const mainReducer = (state = initialState, action) => {
    return produce(state, draft => {
        switch(action.type) {
            case 'UPDATE_HELLO':
                draft.hello = action.payload
                return
        }
    })
}


module.exports = {
    initialState,
    reducer: mainReducer,
    updateHello: (payload) => ({ type: 'UPDATE_HELLO', payload: payload }) 
}

