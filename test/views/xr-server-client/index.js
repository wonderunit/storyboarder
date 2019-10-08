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

const List = ({ onBoardClick }) => {
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
  }, [])

  return (
    <div>
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
                    {board.uid}
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
    </div>
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

const TestUI = () => {
  const onBoardClick = async uid => {
    let board = await api.selectBoardByUid(uid)
    console.log(board)
  }
  return (
    <List onBoardClick={onBoardClick} />
  )
}

ReactDOM.render(
  <div>
    <TestUI />
  </div>,
  document.getElementById('main')
)
