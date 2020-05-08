/*
module.exports = function (URI='') {
  return {
    getSg: async () =>
      await (await fetch(`${URI}/sg.json`)).json(),

    getBoards: async () =>
      await (await fetch(`${URI}/boards.json`)).json(),

    selectBoardByUid: async (uid) => {
      let body = JSON.stringify({
        uid
      })
      let board = await (
        await fetch(
          `${URI}/sg.json`,
          {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            body
          }
        )
      ).json()
      return board
    },

    uriForThumbnail: filename =>
      `${URI}/boards/images/${filename}`,

    getState: async (stateJsonUri = '/state.json') => await(await fetch(`${URI}${stateJsonUri}`)).json(),

    sendState: async (uid, data, stateJsonUri = '/state.json') => {
      let url = `${URI}${stateJsonUri}?uid=${uid}`
      let body = JSON.stringify(data)
      let response = await fetch(
        url,
        {
          method: 'POST',
          body,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
        }
      )
      if (response.ok) {
        return await response.json()
      } else {
        throw new Error(await response.text())
      }
    },

    saveShot: async (uid, data) => {
      let body = JSON.stringify(data)
      let response =
        await fetch(
          `${URI}/boards/${uid}.json`,
          {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            body
          }
        )
      if (response.ok) {
        return await response.json()
      } else {
        throw new Error(await response.text())
      }
    },

    insertShot: async data => {
      let body = JSON.stringify(data)
      return await (
        await fetch(
          `${URI}/boards.json`,
          {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            body
          }
        )
      ).json()
    }
  }
}
*/
