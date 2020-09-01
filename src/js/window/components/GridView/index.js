const ReactDOM = require('react-dom')
const h = require('../../../utils/h')
const Grid = require('./Grid')
const GridViewElement = require('./GridViewElement')
let enableEditModeDelay = 750 // msecs
class GridView {
    constructor(boardData, boardPath, saveImageFile, getSelections, 
                getCurrentBoard, setCurrentBoard, getContextMenu, renderThumbnailDrawerSelections, 
                gotoBoard,  gridDrag, setSketchPaneVisibility, getEtag, boardModel, setEditorModeTimer) {
        this.isEditMode = false;
        this.boardData = boardData;
        this.saveImageFile = saveImageFile;
        this.getSelections = getSelections;
        this.getCurrentBoard = getCurrentBoard;
        this.setCurrentBoard = setCurrentBoard;
        this.gridDrag = gridDrag;
        this.getContextMenu = getContextMenu;
        this.setSketchPaneVisibility = setSketchPaneVisibility;
        this.renderThumbnailDrawerSelections = renderThumbnailDrawerSelections;
        this.gotoBoard = gotoBoard;
        this.getEtag = getEtag;
        this.boardModel = boardModel;
        this.boardPath = boardPath;
        this.setEditorModeTimer = setEditorModeTimer;
        this.gridViewCursor = {
            visible: false,
            x: 0,
            el: null
        }
    }

    get IsEditMode() {
        return this.isEditMode;
    }

    enableEditMode () {
        this.isEditMode = true;
        this.gridViewCursor.visible = true
        this.renderGridViewCursor()
        this.renderThumbnailDrawerSelections()
        this.getContextMenu().remove()
    }

    gridViewFromPoint(x, y, offset) {
        if (!offset) { offset = 0 }

        let el = document.elementFromPoint(x-offset, y)
        if (!el || !el.classList.contains('thumbnail')) return null
        let selections = this.getSelections()
        // if part of a multi-selection, base from right-most element
        if (selections.has(Number(el.dataset.thumbnail))) {
          // base from the right-most thumbnail in the selection
          let rightMost = Math.max(...selections)
          let rightMostEl = document.querySelector('.grid-view div[data-thumbnail="' + rightMost + '"]')
          el = rightMostEl
        }
      
        return el
    }

    renderGridViewCursor() {
        let el = document.querySelector('#grid-cursor-container')
        if (el) { // shouldRenderThumbnailDrawer
          let gridViewCursor = this.gridViewCursor
          if (gridViewCursor.visible) {
            el.style.display = ''
            el.style.left = gridViewCursor.x + 'px'
            el.style.top = gridViewCursor.y + 'px'
          } else {
            el.style.display = 'none'
            el.style.left = '0px'
          }
        }
    }

    cleanUpGridView(){
        let gridView = document.querySelector(".grid-view")
        if(!gridView) return
        gridView.removeEventListener('pointerdown', this.gridDrag)
        ReactDOM.unmountComponentAtNode(gridView)
    }

    updateGridViewCursor(x, y) {
            
        let el = this.gridViewFromPoint(x, y)
        let offset = 0
        if (el) {
            offset = el.getBoundingClientRect().width
            el = this.gridViewFromPoint(x, y, offset/2)
        }
        if (!el) return
        
        this.gridViewCursor.el = el 
        
        let elementOffsetX = el.getBoundingClientRect().right
        
        let elementOffsetY = el.getBoundingClientRect().top
        let scrollTop = el.scrollTop
        
        let arrowOffsetX = 8
        let arrowOffsetY = -8
        this.gridViewCursor.x = elementOffsetX + arrowOffsetX
        
        this.gridViewCursor.y = elementOffsetY + arrowOffsetY - scrollTop
    }

    pointerEnter (e) {
      let selections = this.getSelections()
      let currentBoard = this.getCurrentBoard()
      if (!this.isEditMode && selections.size <= 1 && e.target.dataset.thumbnail === currentBoard) {
          this.getContextMenu().attachTo(e.target)
        }
    }

    pointerLeave (e) { 
        if (e.relatedTarget instanceof Element && !this.getContextMenu().hasChild(e.relatedTarget)) {
            this.getContextMenu().remove()
        }
    }

    pointerMove (e) {
        let selections = this.getSelections()
        let currentBoard = this.getCurrentBoard()
        if (!this.isEditMode && selections.size <= 1 && e.target.dataset.thumbnail === currentBoard) {
            this.getContextMenu().attachTo(e.target)
        }
    }

    pointerDown (e) { 
        let selections = this.getSelections()
        let currentBoard = this.getCurrentBoard()
        if (!this.isEditMode && selections.size <= 1) this.getContextMenu().attachTo(e.target)
        // always track cursor position
        this.updateGridViewCursor(e.clientX, e.clientY)
    
        if (e.button === 0) {
            this.setEditorModeTimer(setTimeout(() => this.enableEditMode(), enableEditModeDelay))
        } else {

          this.enableEditMode()
        }
      
        let index = Number(e.target.dataset.thumbnail)
        if (selections.has(index)) {
          // ignore
        } else if (currentBoard !== index) {
          // go to board by index
          // reset selections
          selections.clear()
          this.saveImageFile().then(() => {
            this.setCurrentBoard(index)
            this.renderThumbnailDrawerSelections()
            this.gotoBoard(index)
          })
        }
    }

    doubleClick (e) {
      this.setSketchPaneVisibility(true)
    }

    renderGridView () {
        this.cleanUpGridView()
        let boardData = this.boardData;
        let gridView = document.querySelector('.grid-view')
        gridView.addEventListener('pointerdown', this.gridDrag)
        ReactDOM.render(h([Grid, {
          itemData:{
            boardData,
            boardPath: this.boardPath,
            boardModel: this.boardModel,
            getEtag: this.getEtag,
            pointerDown: (e) => this.pointerDown(e),
            pointerMove: (e) => this.pointerMove(e),
            pointerLeave: (e) => this.pointerLeave(e),
            pointerEnter: (e) => this.pointerEnter(e),
            dblclick: (e) => this.doubleClick(e)
          },
          Component:GridViewElement,
          elements:boardData.boards,
          numCols:3,
          itemHeight: 200
          }
        ]), gridView, () => this.renderThumbnailDrawerSelections())
    }
}

module.exports = GridView
