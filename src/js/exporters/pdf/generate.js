const path = require('path')
const PDFDocument = require('pdfkit')
const v = require('@thi.ng/vectors')
const { Rect } = require('@thi.ng/geom')
const moment = require('moment')
const fs = require('fs')

const groupByPage = require('./group-by-page')
const stringContainsForeign = require('./string-contains-foreign')

const {
  boardDuration,
  boardFilenameForPosterFrame,
  boardFileImageSize
} = require('../../models/board')

const {
  sceneDuration
} = require('../../models/scene')

let fontPath = path.join('.', 'src', 'fonts')
const REGULAR = path.join(fontPath, 'thicccboi', 'THICCCBOI-Regular.woff2')
const BOLD = path.join(fontPath, 'thicccboi', 'THICCCBOI-Bold.woff2')
const FALLBACK = path.join(fontPath, 'unicore.ttf')

// via https://stackoverflow.com/questions/6565703
const fit = ([wi, hi], [ws, hs]) =>
  ws / hs > wi / hi
    ? [wi * hs / hi, hs]
    : [ws, hi * ws / wi]

const inset = (rect, depth) =>
  new Rect(
    v.add2([], rect.pos, depth),
    v.sub2([], rect.size, v.mulN([], depth, 2)),
    rect.attribs
  )

// via shot-core
const durationMsecsToString = msecs => {
  let t = msecs / 1000
  let h = Math.floor(t / (60 * 60)) % 24
  let m = Math.floor(t / 60) % 60
  let s = Math.floor(t % 60)
  let parts = (h > 0) ? [h, m, s] : [m, s]
  return parts.map(v => v.toString().padStart(2, '0')).join(':')
}

const HUMANIZED_ASPECT_RATIOS = {
  '2.390': '2.39:1',
  '2.000': '2.00:1',
  '1.850': '1.85:1',
  '1.778': '16:9',
  '0.563': '9:16',
  '1.000': '1:1',
  '1.334': '4:3'
}

const humanizeAspectRatio = aspectRatio => {
  let index = Number(aspectRatio).toFixed(3)
  return HUMANIZED_ASPECT_RATIOS[index] || index.toString()
}

//
//
// patch PDFDocument .text to force FALLBACK font if "foreign" text is detected
//
// TODO allow for a bold weight fallback
const patchPDFDocument = doc => {
  let fn = doc.text

  doc.text = function () {
    let [text, ...rest] = arguments
    if (stringContainsForeign(text)) {
      this.font(FALLBACK)
    }
    fn.apply(this, [text, ...rest])
    return this
  }
  doc.textWithoutFallback = fn
}

const drawHeader = (doc, { rect, projectTitle, pageData, pagination, stats }, cfg) => {
  const { pos, size } = rect.copy()

  const rems = n => Math.round(n * 16)

  let separator = ' / '
  let between = 0.25

  doc.save()

  //
  //
  // project and scene titles
  //
  if (projectTitle) {
    doc
      .font(REGULAR)
      .fontSize(rems(1.25))
      .fillColor('black')
      .text(
        projectTitle + ' / ',
        pos[0], pos[1] + rems(1.25),
        { continued: true, baseline: 'bottom', width: size[0] }
      )
  }
  doc
    .font(BOLD)
    .fontSize(rems(1.25))
    .fillColor('black')
    .text(
      pageData.scene.title,
        pos[0], pos[1] + rems(1.25),
      { baseline: 'bottom', width: size[0] }
    )
    .moveUp()
    .fontSize(rems(1))
    .font(REGULAR)
    .moveDown(between)

  //
  //
  // stats
  //
  doc
    .fontSize(rems(0.75))

  let statsEntries = [
    cfg.header.stats.boards && ['Boards', stats.boards],
    cfg.header.stats.shots && ['Shots', stats.shots],
    cfg.header.stats.sceneDuration && ['Duration', durationMsecsToString(stats.sceneDuration)],
    cfg.header.stats.aspectRatio && ['Aspect Ratio', humanizeAspectRatio(stats.aspectRatio)]
  ].filter(Boolean)
  statsEntries.forEach(([name, value], index, array) => {
    let notLast = index < array.length - 1
    doc.font(REGULAR)
    doc.text(`${name} `, { continued: true })
    doc.font(BOLD)
    doc.text(value, { continued: notLast ? true : false })
    doc.font(REGULAR)
    if (notLast) {
      doc.text(separator, { continued: true })
    }
  })

  if (cfg.header.stats.dateExported) {
    if (statsEntries.length > 0) {
      doc.moveDown(between)
    }

    doc
      .font(REGULAR)
        .text(`Exported `, { continued: true })
      .font(BOLD)
        .text(`${stats.date}`)
  }

  //
  //
  // pagination
  //
  doc
    .font(REGULAR)
    .fontSize(rems(6/8))
    .text(`${pagination.curr + 1} / ${pagination.total}`, ...pos, {
      width: size[0],
      align: 'right'
    })

  doc.restore()
}

const drawBoard = (doc, { direction, ...options }, cfg) =>
  direction == 'column'
  ? drawBoardColumn(doc, options, cfg)
  : direction == 'row'
  ? drawBoardRow(doc, options, cfg)
  : null

const drawImageOrPlaceholder = (doc, { filepath, rect }, cfg) => {
  if (fs.existsSync(filepath)) {
    doc.image(
      filepath,
      ...rect.pos,
      { fit: rect.size }
    )
  } else {
    // TODO i18n
    let warningText = 'Error: Missing Posterframe'
    doc
      .save()
      /* background */
      .fillColor('#f00')
      .rect(...rect.pos, ...rect.size)
      .fill()
      /* text */
      .fillColor('black')
      .fontSize(cfg.boardTextSize)
      .text(
        warningText,
        ...v.add2([], rect.pos, [0, (rect.size[1] - doc.heightOfString(warningText)) / 2]),
        {
          align: 'center',
          width: rect.size[0]
        }
      )
      /* restore */
      .restore()
  }
}

// Place Text Right
const drawBoardRow = (doc, { rect, scene, board, imagesPath }, cfg) => {
  /*
  boardBorderStrokeColor: '#999' | '#333',
  boardBorderLineWidth: 0.5 | 1.0
  */
  let localCfg = cfg.boardBorderStyle == 'minimal'
    ? { boardBorderStrokeColor: '#999', boardBorderLineWidth: 0.5, boardBorderStrokeOpacity: 0 }
    : { boardBorderStrokeColor: '#333', boardBorderLineWidth: 1.0, boardBorderStrokeOpacity: 1 }

  let inner = rect.copy()
  v.sub2(null, inner.size, [10, 0])

  let imageR = inset(inner, [5, 5])
  imageR.size = fit(
    boardFileImageSize(scene),
    // HACK constrain max image width to 3/5ths of available row space
    //      allows space for text on either side
    [imageR.size[0] * 0.6, imageR.size[1]]
  )

  let cellA = inner.copy()
  cellA.size[0] = (cellA.size[0] * 0.1) - 1

  imageR.pos[0] += cellA.size[0] + 1

  let imageB = inset(imageR, [-5, -5])

  let cellB = inner.copy()
  cellB.pos[0] = imageR.pos[0] + imageR.size[0] + 1 + 5
  cellB.size[0] -= cellA.size[0] + 1 + imageR.size[0] + 1 + 10

  let cellAinner = inset(cellA, [5, 5])
  let cellBinner = inset(cellB, [5, 5])

  doc
    .rect(...imageB.pos, ...imageB.size)
    .fillColor('black')
    .fill()

  //
  //
  // image
  //
  drawImageOrPlaceholder(doc, {
    filepath: path.join(imagesPath, boardFilenameForPosterFrame(board)),
    rect: imageR
  }, cfg)

  //
  //
  // new shot marker
  //
  if (board.newShot) {
    let marker = inner.copy()
    // width
    marker.size[0] = 3
    marker.pos[0] -= 3 // offset
    doc
      .rect(...marker.pos, ...marker.size)
      .fillColor('black')
      .strokeColor('black')
      .lineWidth(1)
      .fillAndStroke()
  }

  //
  //
  // borders
  //
  doc
    .strokeColor(localCfg.boardBorderStrokeColor)
    .strokeOpacity(localCfg.boardBorderStrokeOpacity)
    .lineWidth(localCfg.boardBorderLineWidth)
    .rect(...inner.pos, ...inner.size)
    .stroke()

  //
  //
  // shot number
  //
  if (cfg.enableShotNumber) {
    doc
      .fontSize(cfg.boardTextSize)
      .fillColor('black')
      .text(board.shot, ...cellAinner.pos)
  }

  //
  //
  // board text
  //
  let entries = [
    ...(
      cfg.enableDialogue
        ? [{ text: board.dialogue }]
        : []
    ),

    ...(
      cfg.enableAction
        ? [{ text: board.action }]
        : []
    ),

    ...(
      cfg.enableNotes
        ? [{ text: board.notes }]
        : []
    ),

    ...(
      cfg.boardTimeDisplay == 'duration'
        ? [{ text: durationMsecsToString(boardDuration(scene, board)) }]
        : cfg.boardTimeDisplay == 'sceneTime'
        ? [{ text: durationMsecsToString(board.time) }]
        : [] // TODO scriptTime
    )
  ]
  for (let e = 0; e < entries.length; e++) {
    let textR = cellBinner.copy()
    textR.size[0] *= 1 / entries.length
    textR.pos[0] += textR.size[0] * e
    // 5px right margin, except last child
    if (e < entries.length - 1) {
      textR.size[0] -= 5
    }

    // HACK expand to allow text to hit bottom edge
    textR.size[1] += 5

    let entry = entries[e]
    if (entry.text) {
    doc
      .save()
      .rect(...textR.pos, ...textR.size)
      .clip()
        .fontSize(cfg.boardTextSize)
        .fillColor('black')
        .text(
          entry.text,
          ...textR.pos,
          {
            align: e == 0
              // first entry
              ? 'left'
              // last entry, if more than than two entries present
              : (e == entries.length - 1) && entries.length > 2
              ? 'right'
              // all other cases
              : 'left',
            width: textR.size[0],
            height: textR.size[1]
          }
        )
      .restore()
    }
  }
}

// Place Text Below
const drawBoardColumn = (doc, { rect, scene, board, imagesPath }, cfg) => {
  /*
  insetUpperText: true | false,
  boardBorder: true | false
  upperBaseline: 'bottom' | 'middle'
  newShotMarkerHeight: 'image' | 'full
  */
  let localCfg = cfg.boardBorderStyle == 'minimal'
    ? {
      insetUpperText: false,
      boardBorder: false,
      upperBaseline: 'bottom',
      newShotMarkerHeight: 'image'
    }
    : {
      insetUpperText: true,
      boardBorder: true,
      upperBaseline: 'middle',
      newShotMarkerHeight: 'full'
    }

  let inner = rect.copy()
  v.sub2(null, inner.size, [10, 10])

  // reserve max 60% height for image
  let imageR = inner.copy()
  imageR.size = fit(
    boardFileImageSize(scene),
    v.mul2([], inner.size, [1, 0.6])
  )

  inner.size[0] = imageR.size[0]

  let remainingH = inner.size[1] - imageR.size[1]

  // upper: 30%, not larger than text size value x 3
  let upperR = inner.copy()
  // test with:
  //   Place Text: Below
  //   Grid: 3x1 or 3x3 or 1x1
  //   Text Size: 9…16
  //   Border: Image & Text or Image Only
  upperR.size[1] = Math.min(
    cfg.boardTextSize * 3,
    remainingH * 0.3
  )

  if (localCfg.insetUpperText) {
    upperR = inset(upperR.copy(), [5, 0])
  }
  // lower: 70%
  let lowerR = inner.copy()
  lowerR.size[1] = remainingH - upperR.size[1]

  upperR.pos[1] = inner.pos[1]
  imageR.pos[1] = upperR.pos[1] + upperR.size[1]
  lowerR.pos[1] = imageR.pos[1] + imageR.size[1]

  lowerR = inset(lowerR.copy(), [3, 3])

  //
  //
  // image
  //
  drawImageOrPlaceholder(doc, {
    filepath: path.join(imagesPath, boardFilenameForPosterFrame(board)),
    rect: imageR
  }, cfg)

  //
  //
  // new shot marker
  //
  if (board.newShot) {
    let marker = localCfg.newShotMarkerHeight == 'full'
      ? inner.copy()
      : imageR.copy()

    // width
    marker.size[0] = 2
    marker.pos[0] -= (2 + 0.5) // border
    doc
      .rect(...marker.pos, ...marker.size)
      .fillColor('black')
      .strokeColor('black')
      .lineWidth(1)
      .fillAndStroke()
  }

  //
  //
  // upper
  //
  let middle = [upperR.pos[0], upperR.pos[1] + upperR.size[1] * 0.5]
  let bottom = [upperR.pos[0], upperR.pos[1] + (upperR.size[1] * 0.875)]
  let upperTextCfg = localCfg.upperBaseline == 'bottom'
    ? { pos: bottom, baseline: 'bottom' }
    : { pos: middle, baseline: 'middle' }
  if (cfg.enableShotNumber) {
    doc
      .fontSize(cfg.boardTextSize)
      .fillColor('black')
      .text(board.shot, ...upperTextCfg.pos, {
        baseline: upperTextCfg.baseline
      })
  }
  if (['sceneTime', 'duration'].includes(cfg.boardTimeDisplay)) {
    let boardTimeDisplayString =
      cfg.boardTimeDisplay == 'sceneTime'
        ? durationMsecsToString(board.time)
        : durationMsecsToString(boardDuration(scene, board))
    doc
      .fontSize(cfg.boardTextSize)
      .fillColor('black')
      .text(boardTimeDisplayString, ...upperTextCfg.pos, {
        width: upperR.size[0],
        align: 'right',
        baseline: upperTextCfg.baseline
      })
  }

  //
  //
  // lower
  //
  doc
    .save()
    .rect(...lowerR.pos, ...lowerR.size)
    .clip()
  let entries = [
    cfg.enableDialogue && board.dialogue && { text: board.dialogue },
    cfg.enableAction && board.action && { text: board.action },
    cfg.enableNotes && board.notes && { text: board.notes }
  ].filter(Boolean)
  for (let e = 0; e < entries.length; e++) {
    let entry = entries[e]

    let textR = lowerR.copy()
    textR.size[1] *= 1 / entries.length
    textR.pos[1] += textR.size[1] * e

    doc
      .fontSize(cfg.boardTextSize)
      .fillColor('black')
      .text(
        entry.text,
        ...textR.pos,
        {
          width: textR.size[0],
          height: textR.size[1]
        }
      )
  }
  doc.restore()

  //
  //
  // borders
  //
  if (localCfg.boardBorder) {
    doc
      .strokeColor('#333')
      .strokeOpacity(1)
      .lineWidth(1)
      .rect(...inner.pos, ...inner.size)
      .stroke()
  }
  doc
    .strokeColor('#333')
    .strokeOpacity(1)
    .lineWidth(1)
    .rect(...imageR.pos, ...imageR.size)
    .stroke()
}

const drawFooter = (doc, { rect }, cfg) => {
  let inner = rect.copy()

  let text = "Storyboarder by \\\\ wonder unit"
  doc
    .save()
    .font(REGULAR)
    .fontSize(10)
    .fillColor('black')
    .fillOpacity(0.6)
    .textWithoutFallback(
      text,
      ...v.add2([], inner.pos, [0, inner.size[1] * 0.5 - 1/* optical */]),
      {
        align: 'right',
        baseline: 'middle',
        width: inner.size[0],
        features: ['liga']
      }
    )
    .restore()
}
async function generate (stream, { project }, cfg) {
  const {
    paperSize,
    gridDim,
    direction,
    enableDialogue,
    enableAction,
    enableNotes,
    enableShotNumber,
    boardTimeDisplay,
    boardTextSize
  } = cfg

  let doc = new PDFDocument({
    autoFirstPage: false,
    size: cfg.paperSize
  })
  patchPDFDocument(doc)

  doc.pipe(stream)
  doc.registerFont(REGULAR, REGULAR)
  doc.registerFont(BOLD, BOLD)

  let pages = groupByPage(project.scenes, gridDim[0] * gridDim[1])

  let start = cfg.pages[0]
  let end = cfg.pages[1] + 1

  for (let pageData of pages.slice(start, end)) {
    const imagesPath = path.join(path.dirname(pageData.scene.storyboarderFilePath), 'images')

    doc.addPage({
      margins: { top: 36, right: 36, bottom: 18, left: 36 },
      size: cfg.paperSize
    })

    let pg = new Rect(
      [
        doc.page.margins.left,
        doc.page.margins.top
      ],
      [
        doc.page.width - doc.page.margins.left - doc.page.margins.right,
        doc.page.height - doc.page.margins.top - doc.page.margins.bottom
      ]
    )

    let header = new Rect(v.copy(pg.pos), [pg.size[0], pg.size[1] * 1/8])
    let footer = new Rect(v.copy(pg.pos), [pg.size[0], pg.size[1] * 1/24])
    let grid = new Rect(v.copy(pg.pos), v.copy(pg.size))

    grid.size[1] = pg.size[1] - header.size[1] - footer.size[1]
    grid.pos[1] = header.pos[1] + header.size[1]
    footer.pos[1] = grid.pos[1] + grid.size[1]

    // TODO extract helpers?
    const getBoardsCount = scene => scene.boards.length
    const getShotsCount = scene => scene.boards.filter((board, i) => i == 0 || board.newShot).length

    drawHeader(doc,
      {
        rect: header,
        projectTitle: project.title,
        pageData,
        stats: {
          boards: getBoardsCount(pageData.scene.data),
          shots: getShotsCount(pageData.scene.data),

          sceneDuration: sceneDuration(pageData.scene.data),
          aspectRatio: pageData.scene.data.aspectRatio,
          date: moment(new Date()).format('D MMM YYYY')
        },
        pagination: {
          curr: pageData.index,
          total: pages.length
        }
      },
      cfg
    )

    drawFooter(doc,
      {
        rect: footer
      },
      cfg
    )

    let template = new Rect(
      v.copy(grid.pos),
      v.div2([], grid.size, gridDim)
    )

    // Center the Grid
    if (direction == 'column') {
      // Place Text: Bottom
      //
      // very HACKY
      // based on calculations in drawBoardColumn
      //
      // determine the expected board drawing area
      let boardSize = [...template.size]
        v.sub2(null, boardSize, [10, 10])
        boardSize = fit(
          boardFileImageSize(pageData.scene.data),
          v.mul2([], boardSize, [1, 0.6])
        )
      let drawingWidth = template.size[0] * (gridDim[0] - 1)
          + boardSize[0]
      // offset the template to center
      template.pos[0] += (grid.size[0] - drawingWidth) / 2
    } else {
      // Place Text: Right
      //
      // very HACKY
      // based on calculations in drawBoardRow

      // offset the template to center
      let boardSize = v.sub2([], template.size, [10, 0])
      let drawingWidth = template.size[0] * (gridDim[0] - 1)
          + boardSize[0]
      template.pos[0] += (grid.size[0] - drawingWidth) / 2
    }
    for (let n = 0; n < pageData.boards.length; n++) {
      let board = pageData.boards[n]

      let i, j
      if (direction == 'row') {
        i = Math.floor(n / gridDim[1])
        j = n % gridDim[1]
      } else if (direction == 'column') {
        i = n % gridDim[0]
        j = Math.floor(n / gridDim[0])
      }

      let cell = template.copy()
      v.add2(null, cell.pos, v.mul2([], cell.size, [i, j]))

      drawBoard(
        doc,
        {
          rect: cell,
          board,
          scene: pageData.scene.data,
          imagesPath,
          direction
        },
        cfg
      )
    }
  }

  doc.end()
}

module.exports = generate
