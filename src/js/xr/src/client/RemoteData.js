// via https://twitter.com/sharifsbeat/status/959834174185246720

const { prop } = require('ramda')

const create = (type, data) => {
  return {
    type,
    ...data,
    cata: definitions => {
      const fn = prop(type, definitions)
      return fn ? fn(data) : undefined
    },
  }
}

const RemoteData = {
  NOT_ASKED: 'NOT_ASKED',
  LOADING: 'LOADING',
  FAILURE: 'FAILURE',
  SUCCESS: 'SUCCESS',
  init: () => create(RemoteData.NOT_ASKED),
  loading: () => create(RemoteData.LOADING),
  failure: error => create(RemoteData.FAILURE, error),
  success: data => create(RemoteData.SUCCESS, data),
}

module.exports = RemoteData
