const path = require('path')
const log = require('electron-log')
const fs = require('fs-extra')
const util = require('../../../utils/index')
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
        let storyboarderSketchPane = document.querySelector("#storyboarder-sketch-pane")
        let gridView = storyboarderSketchPane.querySelector(".grid-view")
        if(!gridView) return
        gridView.removeEventListener("pointerdown", this.gridDrag)
        
        storyboarderSketchPane.removeChild(gridView)
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

    renderGridView () {
        this.cleanUpGridView()
        this.setSketchPaneVisibility(false)
        let gridContainer = document.createElement("div")
        let boardData = this.boardData;
        let boardPath = this.boardPath;
        let hasShots = boardData.boards.find(board => board.newShot) != null
        let boardModel = this.boardModel;
        let html = []
        let i = 0
        for (let board of boardData.boards) {
          html.push('<div data-thumbnail="' + i + '" draggable="false"  class="thumbnail')
          if (hasShots) {
            if (board.newShot || (i === 0)) {
              html.push(' startShot')
            }
        
            if (i < boardData.boards.length - 1) {
              if (boardData.boards[i + 1].newShot) {
                html.push(' endShot')
              }
            } else {
              html.push(' endShot')
            }
          } else {
            html.push(' startShot')
            html.push(' endShot')
          }
          let defaultHeight = 200
          let thumbnailWidth = Math.floor(defaultHeight * boardData.aspectRatio)
          html.push('" style="width: ' + thumbnailWidth + 'px;">')
          let imageFilename = path.join(boardPath, 'images', board.url.replace('.png', '-thumbnail.png'))
          try {
            if (fs.existsSync(imageFilename)) {
              html.push('<div class="top">')
              let src = imageFilename + '?' + this.getEtag(path.join(boardPath, 'images', boardModel.boardFilenameForThumbnail(board)))
              html.push('<img src="' + src + `" draggable="false"  height="${defaultHeight}" width="` + thumbnailWidth + '">')
              html.push('</div>')
            } else {
              // blank image
              html.push(`<img src="//:0" height="${defaultHeight}" draggable="false" width="` + thumbnailWidth + '">')
            }
          } catch (err) {
            log.error(err)
          }
          html.push('<div class="info">')
          html.push('<div class="number">' + board.shot + '</div>')
          if (board.audio && board.audio.filename.length) {
            html.push(`
              <div class="audio">
                <svg>
                  <use xlink:href="./img/symbol-defs.svg#icon-speaker-on"></use>
                </svg>
              </div>
            `)
          }
          html.push('<div class="caption">')
          if (board.dialogue) {
            html.push(board.dialogue)
          }
          html.push('</div><div class="duration">')
          if (board.duration) {
            html.push(util.msToTime(board.duration))
          } else {
            html.push(util.msToTime(boardData.defaultBoardTiming))
          }
          html.push('</div>')
          html.push('</div>')
          html.push('</div>')
          i++
        }
        gridContainer.innerHTML = html.join('')
        gridContainer.className = "grid-view"
        gridContainer.addEventListener('pointerdown', this.gridDrag)
        let storyboarderSketchPane = document.querySelector("#storyboarder-sketch-pane")
        storyboarderSketchPane.appendChild(gridContainer)
    
        let selections = this.getSelections()
        let currentBoard = this.getCurrentBoard()
        let thumbnails = gridContainer.querySelectorAll('.thumbnail')
        for (let j = 0; j < thumbnails.length; j++) {
          let thumb = thumbnails[j]
          thumb.addEventListener('pointerenter', (e) => {
            selections = this.getSelections()
            currentBoard = this.getCurrentBoard()
            if (!this.isEditMode && selections.size <= 1 && e.target.dataset.thumbnail === currentBoard) {
              this.getContextMenu().attachTo(e.target)
            }
          })
          thumb.addEventListener('pointerleave', (e) => {
            if (!this.getContextMenu().hasChild(e.relatedTarget)) {
                this.getContextMenu().remove()
            }
          })
          thumb.addEventListener('pointermove', (e) => {
            selections = this.getSelections()
            currentBoard = this.getCurrentBoard()
            if (!this.isEditMode && selections.size <= 1 && e.target.dataset.thumbnail === currentBoard) {
                this.getContextMenu().attachTo(e.target)
            }
          })
          thumb.addEventListener('pointerdown', (e) => {
            selections = this.getSelections()
            currentBoard = this.getCurrentBoard()
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
            } /* else if (isCommandPressed('workspace:thumbnails:select-multiple-modifier')) {
              if (selections.size === 0 && !util.isUndefined(currentBoard)) {
                // use currentBoard as starting point
                selections.add(currentBoard)
              }
          
              // add to selections
              let min = Math.min(...selections, index)
              let max = Math.max(...selections, index)
              selections = new Set(util.range(min, max))
          
              this.renderThumbnailDrawerSelections()
            } */ else if (currentBoard !== index) {
              // go to board by index
              // reset selections
              selections.clear()
              this.saveImageFile().then(() => {
                this.setCurrentBoard(index)
                this.renderThumbnailDrawerSelections()
                this.gotoBoard(index)
              })
            }
          }, true, true)
        }
        this.renderThumbnailDrawerSelections()
    }

}

module.exports = GridView