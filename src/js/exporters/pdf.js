const fs = require('fs')
const path = require('path')
const util = require('../utils/index')
const pdfDocument = require('pdfkit')
const moment = require('moment')
const app = require('electron').remote.app

/* TODO

  Add scene information and synopsis



  find the longest string of dialogue and text
  how much vertical space I need for it?
  make thumb fit in that space

  
*/

const generatePDF = (paperSize, layout='landscape', rows, cols, spacing, boardData, basenameWithoutExt, filepath) => {

  let headerHeight = 40
  let documentSize
  let docwidthIdx = 1
  let docheightIdx = 0
  if (paperSize == 'LTR') {
    documentSize = [8.5*72,11*72]
  } else {
    documentSize = [595,842]
  }
  if (layout != 'landscape') {
    docwidthIdx = 0
    docheightIdx = 1
  }
  aspectRatio = boardData.aspectRatio
  // if (!sceneNumber) sceneNumber = 0
  let margin = [22, 22, 22, 40]

  let doc = new pdfDocument({size: documentSize, layout: layout, margin: 0})

  doc.registerFont('thin', path.join(__dirname, '..', '..', 'fonts', 'wonder-unit-sans', 'WonderUnitSans-Thin.ttf'))
  doc.registerFont('light', path.join(__dirname, '..', '..', 'fonts', 'wonder-unit-sans', 'WonderUnitSans-Light.ttf'))
  doc.registerFont('regular', path.join(__dirname, '..', '..', 'fonts', 'wonder-unit-sans', 'WonderUnitSans-Regular.ttf'))
  doc.registerFont('bold', path.join(__dirname, '..', '..', 'fonts', 'wonder-unit-sans', 'WonderUnitSans-Bold.ttf'))

  let stream = doc.pipe(fs.createWriteStream(filepath))

  let pages = Math.ceil(boardData.boards.length/(rows*cols))
  let currentBoard = 0


  let boxesDim = [cols,rows]
  // this is the grid box size
  let boxSize = [(documentSize[docwidthIdx]-margin[0]-margin[2]-(spacing * (boxesDim[0]-1)))/boxesDim[0],
                 (documentSize[docheightIdx]-margin[1]-margin[3]-headerHeight-(spacing * (boxesDim[1])))/boxesDim[1] ]
  
  // get the longest string in the boards
  // find how tall it is
  let longest = 0
  let index = -1

  for (var i = 0; i < boardData.boards.length; i++) {
    let val = 0
    if( boardData.boards[i].dialogue ) { val += boardData.boards[i].dialogue.length }
    if( boardData.boards[i].action ) { val += boardData.boards[i].action.length }

    if (val > longest) {
      longest = val
      index = i
    }
  }

  let textHeight = 0

  if (index > -1) {
    doc.fontSize(7)
    if( boardData.boards[index].dialogue ) {
      doc.font('bold')
      textHeight += doc.heightOfString(boardData.boards[index].dialogue, {width: boxSize[0], align: 'center'});
    }
    if( boardData.boards[index].action ) { 
      doc.font('regular')
      textHeight += doc.heightOfString(boardData.boards[index].action, {width: boxSize[0], align: 'left'});
    }
    textHeight += (boardData.boards[currentBoard].action) ? 17 : 10;
  }

  // calculate imgSize
  // TODO ASPECT RATIO PROBLEM
  // where text action and dialogue are too high
  let imgSize
  let shrinkedImg = false

  if((boxSize[0]/(boxSize[1]-textHeight)) <= aspectRatio) {
    imgSize = [boxSize[0], boxSize[0]/aspectRatio]
  } else {
    imgSize = [(boxSize[1]-textHeight)*aspectRatio, (boxSize[1]-textHeight)]
    shrinkedImg = true;
  }

  function find_rational(value) {
    let best_numer = 1;
    let best_denom = 1;
    let best_err = Math.abs(value - best_numer / best_denom);
    for (let denom = 1; best_err > 0 && denom <= 10000; denom++) {
      let numer = Math.round(value * denom);
      let err = Math.abs(value - numer / denom);
      if (err < best_err) {
        best_numer = numer;
        best_denom = denom;
        best_err = err;
      }
    }
    return best_numer + ' : ' + best_denom;
  }

  let displayAspect = find_rational(aspectRatio)

  for (var i = 0; i < pages; i++) {
    if (i != 0) {
      doc.addPage()
    }

    doc.font('bold')
    doc.fontSize(13)
    doc.text(basenameWithoutExt.toUpperCase(), margin[0], margin[1], {align: 'left'})
    doc.font('thin')
    doc.fontSize(5)
    let lastboard = boardData.boards[boardData.boards.length-1]
    doc.text(('Boards: ' + boardData.boards.length + '  |  Shots: ' + parseInt(lastboard.shot) + '  |  Duration: ' + util.msToTime(lastboard.time + (lastboard.duration ? lastboard.duration : 2000)) + '  |  Aspect Ratio: ' + displayAspect), margin[0], margin[1]+13+1+2, {align: 'left'})

    doc.font('thin')
    doc.fontSize(5)
    doc.text('DRAFT: ' + moment().format('LL').toUpperCase(), margin[0], margin[1]+13+5+2+2, {align: 'left'})
  
    doc.fontSize(7)
    doc.text('Page: ' + (i+1) + ' / ' + pages, documentSize[docwidthIdx]-margin[2]-50, margin[1], {width: 50, align: 'right'})

    doc.font('thin')
    doc.fontSize(6)

    let currentBox = 0

    for (var iy = 0; iy < boxesDim[1]; iy++) {
      for (var ix = 0; ix < boxesDim[0]; ix++) {
        if (currentBoard < boardData.boards.length) {

          currentBox++
          let x = margin[0]+(ix*boxSize[0])+(ix*spacing)
          let y = margin[1]+(iy*boxSize[1])+((iy+1)*spacing)+headerHeight
          let offset = (boxSize[0]-imgSize[0])/2

          let imagefilename = path.join(app.getPath('temp'), `board-` + currentBoard + '.jpg')

          doc.image(imagefilename, x+offset,y, {width: imgSize[0]})

          doc.rect(x+offset,y,imgSize[0],imgSize[1])
          doc.lineWidth(.1).stroke()

          if (boardData.boards[currentBoard].newShot) {
            doc.rect(x+offset,y,0,imgSize[1])
            doc.lineWidth(2).stroke()
            doc.fontSize(6)
            doc.font('bold')
          } else {
            doc.fontSize(6)
            doc.font('thin')
          }

          doc.text(boardData.boards[currentBoard].shot, x+offset, y-8, {width: 40, align: 'left'})

          doc.font('thin')
          doc.fontSize(4)
          doc.text(util.msToTime(boardData.boards[currentBoard].time), x+offset+imgSize[0]-40, y-6, {width: 40, align: 'right'})

          let textOffset = ( boardData.boards[currentBoard].action || boardData.boards[currentBoard].dialogue ) ? 5 : 0
          let imgAligned = false

          doc.fontSize(7)

          if (boardData.boards[currentBoard].dialogue) {
            doc.font('bold')

            if (shrinkedImg) {
              let metaHeight = doc.heightOfString(boardData.boards[currentBoard].dialogue, {width: imgSize[0], align: 'center'})
              if( boardData.boards[currentBoard].action ) { 
                doc.font('regular')
                metaHeight += doc.heightOfString(boardData.boards[currentBoard].action, {width: imgSize[0], align: 'left'})
                doc.font('bold')
              }
              metaHeight += (boardData.boards[currentBoard].action) ? 17 : 10;
              imgAligned = textHeight >= metaHeight
            }

            doc.text(boardData.boards[currentBoard].dialogue, x+(imgAligned ? offset : 0),y+imgSize[1]+textOffset, {width: imgAligned ? imgSize[0] : boxSize[0], align: 'center'})
            textOffset += doc.heightOfString(boardData.boards[currentBoard].dialogue, {width: imgAligned ? imgSize[0] : boxSize[0], align: 'center'})

            if( boardData.boards[currentBoard].action) {
              textOffset += 7
            }
          }

          if (boardData.boards[currentBoard].action) {
            doc.font('regular')

            if (shrinkedImg && !boardData.boards[currentBoard].dialogue) {
              imgAligned = (textHeight > (doc.heightOfString(boardData.boards[currentBoard].action, {width: imgSize[0], align: 'left'}) + 5))
            }

            doc.text(boardData.boards[currentBoard].action, x+(imgAligned ? offset : 0),y+imgSize[1]+textOffset, {width: imgAligned ? imgSize[0] : boxSize[0], align: 'left'})
            textOffset += doc.heightOfString(boardData.boards[currentBoard].action, {width: imgAligned ? imgSize[0] : boxSize[0], align: 'left'})
          }
          currentBoard++
        }
      }
    }
  
    doc.save()
    doc.translate(doc.page.width-margin[2]-105, doc.page.height-margin[3])
    doc.scale(0.3)
    doc.path('M19.2,0h18.1c0,0,0.1,0,0.1,0.1l10.9,15.4c0,0.1,0,0.1,0,0.2L37.5,26c-0.1,0.1-0.1,0-0.2,0l-6-8.5L19.1,0.2 C19.1,0.1,19.1,0,19.2,0z').fill()
    doc.path('M0.1,0h15.1c0,0,0.1,0,0.1,0.1l9.1,12.9c0,0.1,0,0.1,0,0.2l-9,8.7c-0.1,0.1-0.1,0-0.2,0l-4.3-6L0,0.2C0,0.1,0,0,0.1,0z').fill()
    doc.path('M67.7,15.5c-0.1,0-0.1,0-0.1-0.1L64.3,4c0-0.1,0-0.1,0.1-0.1h0.4c0.1,0,0.1,0,0.1,0.1l3.1,10.9h0 c0.3-1.1,0.7-2.3,3.4-10.7c0,0,0-0.1,0.1-0.1h0.4c0.1,0,0.1,0,0.1,0.1l3.4,10.7c0.3-1.1,0.6-2.2,3.1-10.9c0,0,0-0.1,0.1-0.1h0.4      c0.1,0,0.1,0,0.1,0.1l-3.3,11.5c0,0,0,0.1-0.1,0.1h-0.4c-0.1,0-0.1,0-0.1-0.1L71.6,4.9h0c-0.3,1.1-0.7,2.2-3.4,10.6      c0,0,0,0.1-0.1,0.1H67.7z').fill()
    doc.path('M87.9,15.7c-2.6,0-4.3-1.6-4.3-3.8V7.7c0-2.3,1.7-3.9,4.3-3.9c2.6,0,4.2,1.6,4.2,3.9v4.2C92.1,14.1,90.4,15.7,87.9,15.7z       M87.9,15.2c2.2,0,3.7-1.4,3.7-3.3V7.7c0-2.1-1.4-3.4-3.7-3.4c-2.3,0-3.7,1.4-3.7,3.4v4.2C84.2,13.8,85.6,15.2,87.9,15.2z').fill()
    doc.path('M98.2,15.5c-0.1,0-0.1,0-0.1-0.1V4c0-0.1,0-0.1,0.1-0.1h0.4c0,0,0.1,0,0.1,0.1l7.1,10.7l0-10.7c0-0.1,0-0.1,0.1-0.1h0.3      c0.1,0,0.1,0,0.1,0.1v11.5c0,0.1,0,0.1-0.1,0.1h-0.4c0,0-0.1,0-0.1-0.1L98.7,4.8l0,10.7c0,0.1,0,0.1-0.1,0.1H98.2z').fill()
    doc.path('M112.9,15.5c-0.1,0-0.1,0-0.1-0.1V4c0-0.1,0-0.1,0.1-0.1h3.9c2.4,0,4,1.5,4,4.1v3.6c0,2.5-1.6,4-4,4H112.9z M113.3,15h3.4      c2.2,0,3.5-1.2,3.5-3.5V7.9c0-2.2-1.3-3.6-3.5-3.6h-3.4V15z').fill()
    doc.path('M127.3,15h6.2c0.1,0,0.1,0,0.1,0.1v0.3c0,0.1,0,0.1-0.1,0.1h-6.6c-0.1,0-0.1,0-0.1-0.1V4c0-0.1,0-0.1,0.1-0.1h6.4      c0.1,0,0.1,0,0.1,0.1v0.3c0,0.1,0,0.1-0.1,0.1h-5.9v5h5.6c0.1,0,0.1,0,0.1,0.1v0.3c0,0.1,0,0.1-0.1,0.1h-5.6V15z').fill()
    doc.path('M146.4,15.5c0,0-0.1,0-0.1-0.1l-3.8-4.9h-2.8v4.9c0,0.1,0,0.1-0.1,0.1h-0.3c-0.1,0-0.1,0-0.1-0.1V4c0-0.1,0-0.1,0.1-0.1      h3.6c2.4,0,3.9,1.2,3.9,3.4c0,2-1.3,3.2-3.6,3.3l3.8,4.8c0,0.1,0,0.1-0.1,0.1H146.4z M139.8,4.4v5.7h3.1c2.1,0,3.3-1,3.3-2.8      c0-1.8-1.2-2.9-3.3-2.9H139.8z').fill()
    doc.path('M163.6,15.7c-2.5,0-4-1.6-4-4.1V4c0-0.1,0-0.1,0.1-0.1h0.3c0.1,0,0.1,0,0.1,0.1v7.6c0,2.2,1.2,3.6,3.4,3.6      s3.5-1.4,3.5-3.6V4c0-0.1,0-0.1,0.1-0.1h0.3c0.1,0,0.1,0,0.1,0.1v7.6C167.6,14,166.1,15.7,163.6,15.7z').fill()
    doc.path('M174,15.5c-0.1,0-0.1,0-0.1-0.1V4c0-0.1,0-0.1,0.1-0.1h0.4c0,0,0.1,0,0.1,0.1l7.1,10.7l0-10.7c0-0.1,0-0.1,0.1-0.1h0.3      c0.1,0,0.1,0,0.1,0.1v11.5c0,0.1,0,0.1-0.1,0.1h-0.4c0,0-0.1,0-0.1-0.1l-7.1-10.7l0,10.7c0,0.1,0,0.1-0.1,0.1H174z').fill()
    doc.path('M189.1,15.4C189.1,15.5,189,15.5,189.1,15.4l-0.4,0.1c-0.1,0-0.1,0-0.1-0.1V4c0-0.1,0-0.1,0.1-0.1h0.3c0,0,0.1,0,0.1,0.1      V15.4z').fill()
    doc.path('M202.3,3.9c0.1,0,0.1,0,0.1,0.1v0.3c0,0.1,0,0.1-0.1,0.1h-3.8v11c0,0.1,0,0.1-0.1,0.1h-0.3c-0.1,0-0.1,0-0.1-0.1v-11h-3.7      c-0.1,0-0.1,0-0.1-0.1V4c0-0.1,0-0.1,0.1-0.1H202.3z').fill()
    doc.restore()

    doc.fontSize(6)
    doc.font('thin')
    doc.text('|   Storyboarder', doc.page.width-margin[2]-50, doc.page.height-margin[3]-1.0, {width: 50, align: 'right'})
  }
  doc.end()
}

module.exports = {
  generatePDF
}
