import React from 'react'
import { connect } from 'react-redux'
import { useTranslation } from 'react-i18next'
const BoardInspector = connect(
  state => ({
    board: state.board
  })
)(
({ board }) => {
  const present = value => value && value.length > 1
  const { t } = useTranslation()
  return <div className="column.board-inspector">
      {present(board.shot)
        ? <div className="board-inspector__shot">{ 'Shot ' + board.shot }</div>
        : <div className="board-inspector__shot">Loading …</div>}

      { present(board.dialogue) && <p className="board-inspector__dialogue">{ t('shot-generator.board-inspector.dialogue') + ': ' + board.dialogue }</p> }
      { present(board.action) && <p className="board-inspector__action">{ t('shot-generator.board-inspector.action') + ': ' + board.action }</p> }
      { present(board.notes) && <p className="board-inspector__notes">{ t('shot-generator.board-inspector.notes') + ': ' + board.notes }</p> }
    </div> 
})

export default BoardInspector
