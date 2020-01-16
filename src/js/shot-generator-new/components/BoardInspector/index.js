import React from 'react'
import { connect } from 'react-redux'

const BoardInspector = connect(
  state => ({
    board: state.board
  })
)(
({ board }) => {
  const present = value => value && value.length > 1

  return <div className="column.board-inspector">
      {present(board.shot)
        ? <div className="board-inspector__shot">{ 'Shot ' + board.shot }</div>
        : <div className="board-inspector__shot">Loading …</div>}

      { present(board.dialogue) && <p className="board-inspector__dialogue">{ 'DIALOGUE: ' + board.dialogue }</p> }
      { present(board.action) && <p className="board-inspector__action">{ 'ACTION: ' + board.action }</p> }
      { present(board.notes) && <p className="board-inspector__notes">{ 'NOTES: ' + board.notes }</p> }
    </div> 
})

export default BoardInspector
