// npx parcel serve test/views/xr-server-client/index.html -d test/views/xr-server-client/dist -p 9966

const THREE = require('three')
window.THREE = window.THREE || THREE

const { useEffect, useState } = React = require('react')
const ReactDOM = require('react-dom')

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
api.saveShot = async data => {
  let body = JSON.stringify(data)
  return await(
    await fetch(
      `${URI}/board.json`,
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
  const [board, setBoard] = useState()
  const onBoardClick = async uid => {
    setBoard(await api.selectBoardByUid(uid))
  }
  const onSaveShot = async data => {
    await api.saveShot(data)
  }
  const onInsertShot = async data => {
    let board = await api.insertShot(data)
    setForceUpdate(i => !i)
  }
  const updateNames = data => {
    for (let key of Object.keys(data.sceneObjects)) {
      let sceneObject = data.sceneObjects[key]
      sceneObject.name = `Saved ${Date.now()}`
    }
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
              {board.uid}
              {
                board.sg &&
                <div>
                  <div>
                  Objects:
                    {
                      Object.values(board.sg.data.sceneObjects)
                        .map(o => o.type)
                        .join(', ')
                    }
                  </div>
                  <div>
                    <p>
                      <a onClick={preventDefault(() => updateNames(board.sg.data))} href="#">
                        > Change all SceneObject names (for testing)
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
