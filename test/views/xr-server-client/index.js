// npx parcel serve test/views/xr-server-client/index.html -d test/views/xr-server-client/dist -p 9966

const THREE = require('three')
window.THREE = window.THREE || THREE

const { useEffect, useState } = React = require('react')
const ReactDOM = require('react-dom')

const { reducer } = require('../../../src/js/shared/reducers/shot-generator')

const NotAsked = () => ({ type: 'NotAsked' })
const Loading = () => ({ type: 'Loading' })
const Success = data => ({ type: 'Success', data })
const Failure = error => ({ type: 'Failure', error })

const renderRemoteData = (remoteData, callbacks) => {
  let { type, ...rest } = remoteData
  return callbacks[remoteData.type](rest ? Object.values(rest)[0] : undefined)
}

const preventDefault = (fn, ...args) => e => {
  e.preventDefault()
  fn(e, ...args)
}

const List = ({ forceUpdate, onBoardClick }) => {
  const [remoteData, setRemoteData] = useState(NotAsked())
  useEffect(() => {
    async function fetchData () {
      setRemoteData(Loading())
      try {
        let data = await api.getBoards()
        setRemoteData(Success(data))
      } catch (err) {
        setRemoteData(Failure(err))
      }
    }
    fetchData()
  }, [forceUpdate])

  return (
    <>
      {
        renderRemoteData(remoteData, {
          NotAsked: () => <div>Initializing …</div>,
          Loading: () => <div>Loading …</div>,
          Failure: error => <div>Could not load. {error.toString()}</div>,
          Success: data => <div className="boards">
            <p>
              Click a Board’s thumbnail to select that Board in Shot Generator
            </p>
            {
              data.map(board => (
                <div key={board.uid} className="board" onClick={() => onBoardClick(board.uid)}>
                  <div>
                    <p>uid:{board.uid}</p>
                    {board.hasSg && <p>w/ Shot Generator data</p>}
                  </div>
                  <div>
                    <img src={api.uriForThumbnail(board.thumbnail)} />
                  </div>
                </div>
              ))
            }
          </div>
        })
      }
    </>
  )
}

const URI = 'http://localhost:1234'
const api = {}
api.getBoards = async () =>
  await(await fetch(`${URI}/boards.json`)).json()
api.selectBoardByUid = async (uid) => {
  let body = JSON.stringify({
    uid
  })
  console.log('api.selectBoardByUid', body)
  let board = await(
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
}
api.uriForThumbnail = filename =>
  `${URI}/boards/images/${filename}`
api.saveShot = async (uid, data) => {
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
}
api.insertShot = async data => {
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

const TestUI = () => {
  const [forceUpdate, setForceUpdate] = useState()
  const [remoteBoard, setRemoteBoard] = useState()
  const [board, setBoard] = useState()
  const onBoardClick = async uid => {
    let board = await api.selectBoardByUid(uid)
    setRemoteBoard(JSON.parse(JSON.stringify(board)))
    setBoard(board)
  }
  const onSaveShot = async data => {
    try {
      await api.saveShot(board.uid, data)
      setForceUpdate(i => !i)
      onBoardClick(board.uid)
    } catch (err) {
      alert('Could not save board\n' + err)
    }
  }
  const onInsertShot = async data => {
    let board = await api.insertShot(data)
    setForceUpdate(i => !i)
    onBoardClick(board.uid)
  }
  const changeBoard = () => {
    for (let key of Object.keys(board.sg.data.sceneObjects)) {
      let sceneObject = board.sg.data.sceneObjects[key]
      sceneObject.name = `Updated at ${Date.now()}`
    }
    setBoard(JSON.parse(JSON.stringify(board)))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'row' }}>
      <List forceUpdate={forceUpdate} onBoardClick={onBoardClick} />
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <p>
          Current Board:
        </p>
        {
          board
            ? <div>
              <div>
                <img src={api.uriForThumbnail(board.url.replace('.png', '-thumbnail.png'))} />
              </div>
              <b>uid:</b>{board.uid}
              {
                remoteBoard.sg && board.sg &&
                <div>
                  <div>
                    <b>objects:</b>
                    {
                      Object.values(board.sg.data.sceneObjects)
                        .map(o => o.name || o.displayName)
                        .join(', ')
                    }
                  </div>
                  <div>
                    <p>
                      <b>server sha1:</b>
                      {reducer({}, { type: 'LOAD_SCENE', payload: remoteBoard.sg.data }).meta.lastSavedHash}
                    </p>
                    <p>
                      <b>client sha1:</b>
                      {reducer({}, { type: 'LOAD_SCENE', payload: board.sg.data }).meta.lastSavedHash}
                    </p>
                  </div>
                  <div>
                    <p>
                      <a onClick={preventDefault(() => changeBoard())} href="#">
                        > Change board data (for testing)
                      </a>
                    </p>
                    <p>
                      <a onClick={preventDefault(() => onSaveShot(board.sg.data))} href="#">
                        > Save Shot
                      </a>
                    </p>
                    <p>
                      <a onClick={preventDefault(() => onInsertShot(board.sg.data))} href="#">
                        > Insert Shot
                      </a>
                    </p>
                  </div>
                </div>
              }
            </div>
            : <div>
              None
            </div>
        }
      </div>
    </div>
  )
}

ReactDOM.render(
  <div>
    <TestUI />
  </div>,
  document.getElementById('main')
)
