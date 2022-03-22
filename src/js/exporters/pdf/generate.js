const path = require('path')
const PDFDocument = require('pdfkit')
const v = require('@thi.ng/vectors')
const { Rect } = require('@thi.ng/geom')
const moment = require('moment')
const fs = require('fs')

const pkg = require('../../../../package.json')

const groupByPage = require('./group-by-page')
const stringContainsForeign = require('./string-contains-foreign')
const formatMsecs = require('./format-msecs')

const {
  boardDuration,
  boardFilenameForPosterFrame,
  boardFileImageSize
} = require('../../models/board')

const {
  sceneDuration
} = require('../../models/scene')

const fontPath = path.join('.', 'src', 'fonts')
const THIN = path.join(fontPath, 'thicccboi', 'THICCCBOI-Thin.woff2')
const BOLD = path.join(fontPath, 'thicccboi', 'THICCCBOI-Bold.woff2')
const REGULAR = path.join(fontPath, 'thicccboi', 'THICCCBOI-Regular.woff2')
const FALLBACK = path.join(fontPath, 'unicore.ttf')
const FALLBACK_BOLD = path.join(fontPath, 'unicore.ttf') // TODO bold version of unicore?

const ELLIPSES = '[…]'

const ROW_BOARD_MARGIN = 15 // HACKY-y lol

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
const patchPDFDocument = doc => {
  let fn = doc.text

  doc.text = function () {
    let [text, ...rest] = arguments
    if (stringContainsForeign(text)) {
      if (doc._font.name.match(/bold/i)) {
        this.font(FALLBACK_BOLD)
      } else {
        this.font(FALLBACK)
      }
    }
    fn.apply(this, [text, ...rest])
    return this
  }
  doc.textWithoutFallback = fn
}

const drawHeader = (doc, { rect, titles, pagination, stats }, cfg) => {
  const { pos, size } = rect.copy()

  let separator = ' / '
  let between = 0.25

  doc.save()

  //
  //
  // project and scene titles
  //
  if (titles.project) {
    doc
      .font(THIN)
      .fontSize(20)
      .fillColor('black')
      .text(
        titles.project + ' / ',
        pos[0], pos[1] + 20,
        { continued: true, baseline: 'bottom', width: size[0] }
      )
  }
  doc
    .font(BOLD)
    .fontSize(20)
    .fillColor('black')
    .text(
      titles.scene,
        pos[0], pos[1] + 20,
      { baseline: 'bottom', width: size[0] }
    )
    .moveUp()
    .fontSize(7)
    .font(THIN)
    .moveDown(between)

  //
  //
  // stats
  //
  doc.save()
  
  doc
    .fontSize(6)
    .fillOpacity(0.8)

  let statsEntries = [
    cfg.header.stats.boards && ['Boards', stats.boards],
    cfg.header.stats.shots && ['Shots', stats.shots],
    cfg.header.stats.sceneDuration && ['Duration', formatMsecs(stats.sceneDuration)],
    cfg.header.stats.aspectRatio && ['Aspect Ratio', humanizeAspectRatio(stats.aspectRatio)]
  ].filter(Boolean)
  statsEntries.forEach(([name, value], index, array) => {
    let notLast = index < array.length - 1
    doc.font(THIN)
    doc.text(`${name} `, { continued: true })
    doc.font(REGULAR)
    doc.text(value, { continued: notLast ? true : false })
    doc.font(THIN)
    if (notLast) {
      doc.text(separator, { continued: true })
    }
  })

  if (cfg.header.stats.dateExported) {
    if (statsEntries.length > 0) {
      doc.moveDown(between)
    }

    doc
      .font(THIN)
        .text(`Draft `.toUpperCase(), { continued: true }) // TODO i18n
      .font(REGULAR)
        .text(`${stats.date.toUpperCase()}`)
  }
  doc.restore()

  //
  //
  // pagination
  //
  doc
    .font(THIN)
    .fontSize(7)
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
  let imageBorderSize = 1
  let borderLineWidth = 0.1

  let inner = rect.copy()
  v.sub2(null, inner.size, [10, 0])

  let imageR = inset(inner, [imageBorderSize, imageBorderSize])
  imageR.size = fit(
    boardFileImageSize(scene),
    // HACK constrain max image width to 3/5ths of available row space
    //      allows space for text on either side
    [imageR.size[0] * 0.6, imageR.size[1]]
  )

  let cellA = inner.copy()
  cellA.size[0] = Math.min((cfg.boardTextSize * 4), cellA.size[0] * 0.1) - 1

  imageR.pos[0] += cellA.size[0] + 1

  let imageB = inset(imageR, [-imageBorderSize, -imageBorderSize])

  let cellB = inner.copy()
  cellB.pos[0] = imageR.pos[0] + imageR.size[0] + 1
  cellB.size[0] -= cellA.size[0] + 1 + imageR.size[0] + 1

  let cellAinner = inset(cellA, [5, 5])
  let cellBinner = inset(cellB, [5, 5])
  cellBinner.size[0] += 5

  // image border
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
    marker.size[0] = 2
    marker.pos[0] -= 1 + borderLineWidth // offset
    doc
      .rect(...marker.pos, ...marker.size)
      .fillColor('black')
      .strokeColor('black')
      .lineWidth(borderLineWidth)
      .fillAndStroke()
  }

  //
  //
  // shot number
  //
  if (cfg.enableShotNumber) {
    doc
      .font(board.newShot ? BOLD : THIN)
      .fontSize(cfg.boardTextSize)
      .fillColor('black')
      .text(board.shot, ...cellAinner.pos)
      .font(THIN)
  }

  //
  //
  // board text
  //
  let entries = [
    ...(
      cfg.enableDialogue
        ? [{ text: board.dialogue, font: BOLD, align: 'left' }]
        : []
    ),

    ...(
      cfg.enableAction
        ? [{ text: board.action, font: REGULAR, align: 'left' }]
        : []
    ),

    ...(
      cfg.enableNotes
        ? [{ text: board.notes, font: THIN, align: 'left' }]
        : []
    ),

    ...(
      cfg.boardTimeDisplay == 'duration'
        ? [{ text: formatMsecs(boardDuration(scene, board)), font: THIN, align: 'right', fontSize: cfg.boardTextSize - 1 }]
        : cfg.boardTimeDisplay == 'sceneTime'
        ? [{ text: formatMsecs(board.time), font: THIN, align: 'right', fontSize: cfg.boardTextSize - 1 }]
        : [] // TODO scriptTime
    )
  ]

  let maxNarrowTimeDisplayWidth = cfg.boardTextSize * 4
  let hasNarrowTimeDisplay = entries.find(e => e.align == 'right') && entries.length > 1
  let containerR = cellBinner.copy()
  if (hasNarrowTimeDisplay) containerR.size[0] -= maxNarrowTimeDisplayWidth
  let rects = []
  let xpos = 0
  for (let e = 0; e < entries.length; e++) {
    let r = containerR.copy()

    if (e == entries.length - 1 && hasNarrowTimeDisplay) {
      r.size[0] = maxNarrowTimeDisplayWidth
    } else {
      r.size[0] = containerR.size[0] / (entries.length - (hasNarrowTimeDisplay ? 1 : 0))
    }
    r.pos[0] = containerR.pos[0] + xpos
    xpos += r.size[0]

    // right-side margin
    r.size[0] -= 5

    rects.push(r)
  }

  for (let e = 0; e < entries.length; e++) {
    let textR = rects[e]

    // HACK expand to allow text to hit bottom edge
    textR.size[1] += 5

    let entry = entries[e]
    if (entry.text) {
    doc
      .save()
      .rect(...textR.pos, ...textR.size)
      .clip()
        .font(entry.font)
        .fontSize(entry.fontSize || cfg.boardTextSize)
        .fillColor('black')
        .text(
          entry.text,
          ...textR.pos,
          {
            align: entry.align,
            width: textR.size[0],
            height: textR.size[1],
            ellipsis: ELLIPSES
          }
        )
        .font(THIN) // restore font
        .fontSize(cfg.boardTextSize)
      .restore()
    }

    if (cfg.boardBorderStyle != 'minimal') {
      if (e != entries.length - 1) {
        let borderR = rects[e]
        borderR.pos[1] = cellB.pos[1]
        borderR.size[1] = cellB.size[1]
        borderR.pos[0] += 2.5

        doc
          .save()
          .strokeColor('black')
          .strokeOpacity(0.25)
          .lineWidth(borderLineWidth)
          .moveTo(borderR.pos[0] + borderR.size[0], borderR.pos[1])
          .lineTo(borderR.pos[0] + borderR.size[0], borderR.pos[1] + borderR.size[1])
          .stroke()
          .restore()
      }
    }
  }
}

// Place Text Below
const drawBoardColumn = (doc, { rect, container, scene, board, imagesPath }, cfg) => {
  /*
  insetUpperText: true | false,
  boardBorder: true | false
  upperBaseline: 'bottom' | 'middle'
  newShotMarkerHeight: 'image' | 'full
  singleMultiLineTextField: true | false
  */
  let localCfg = cfg.boardBorderStyle == 'minimal'
    ? {
      insetUpperText: false,
      boardBorder: false,
      upperBaseline: 'bottom',
      newShotMarkerHeight: 'image',
      singleMultiLineTextField: true
    }
    : {
      insetUpperText: true,
      boardBorder: true,
      upperBaseline: 'middle',
      newShotMarkerHeight: 'full',
      singleMultiLineTextField: false
    }
  localCfg.borderLineWidth = 0.1

  let inner = rect.copy()
  v.sub2(null, inner.size, [ROW_BOARD_MARGIN, 10])

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
    marker.pos[0] -= 2 // border
    doc
      .rect(...marker.pos, ...marker.size)
      .fillColor('black')
      .lineWidth(localCfg.borderLineWidth)
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
      .font(board.newShot ? BOLD : THIN)
      .fontSize(cfg.boardTextSize)
      .fillColor('black')
      .text(board.shot, ...upperTextCfg.pos, {
        baseline: upperTextCfg.baseline
      })
      .font(THIN)
  }
  if (['sceneTime', 'duration'].includes(cfg.boardTimeDisplay)) {
    let boardTimeDisplayString =
      cfg.boardTimeDisplay == 'sceneTime'
        ? formatMsecs(board.time)
        : formatMsecs(boardDuration(scene, board))
    doc
      .fontSize(cfg.boardTextSize - 1)
      .fillColor('black')
      .text(boardTimeDisplayString, ...upperTextCfg.pos, {
        width: upperR.size[0],
        align: 'right',
        baseline: upperTextCfg.baseline
      })
      .fontSize(cfg.boardTextSize)
  }

  //
  //
  // lower
  //
  doc
    .save()

  let entries = [
    cfg.enableDialogue && board.dialogue && { text: board.dialogue, font: BOLD },
    cfg.enableAction && board.action && { text: board.action, font: REGULAR },
    cfg.enableNotes && board.notes && { text: board.notes, font: THIN }
  ]

  if (localCfg.singleMultiLineTextField) {
    //
    //
    // single multi-line text field
    //

    // HACKY some magic numbers here, related to hacky centering code
    // allow textfield to be as large as outer containing cell
    let textfieldR = new Rect(
        [
          lowerR.pos[0] + (lowerR.size[0] / 2),
          lowerR.pos[1]
        ],
        [
          container.size[0] - 10,
          lowerR.size[1] + 5
        ],
        lowerR.attribs
      )
    textfieldR.pos[0] -= textfieldR.size[0] / 2

    // omit cells with blank text
    entries = entries.filter(Boolean)

    // setup font size, color, and starting position
    doc
      .fontSize(cfg.boardTextSize)
      .fillColor('black')
      .text(null, ...textfieldR.pos)

    
    let tw = doc.widthOfString('M')
    let th = doc.heightOfString('M')
    textfieldR.size[0] = Math.ceil(textfieldR.size[0] / tw) * tw
    textfieldR.size[1] = Math.ceil(textfieldR.size[1] / th) * th

    for (let e = 0; e < entries.length; e++) {
      let entry = entries[e]

      if (entry) {  
        let entryR = new Rect(
          [doc.x, doc.y],
          [textfieldR.size[0], Math.max(0, textfieldR.size[1] - (doc.y - textfieldR.pos[1]))],
          rect.attribs
        )

        doc
          .save()
          .rect(...entryR.pos, ...entryR.size)
          .clip()
          .font(entry.font)
          .text(
            entry.text,
            {
              width: entryR.size[0],
              height: entryR.size[1],
              align: 'center'
            }
          )
          .font(THIN) // restore font
          .restore()
      }
    }
  } else {
    //
    //
    // cells
    //
    doc
      .rect(...lowerR.pos, ...lowerR.size)
      .clip()
    for (let e = 0; e < entries.length; e++) {
      let entry = entries[e]

      let entryCell = lowerR.copy()
      entryCell.size[1] *= 1 / entries.length
      entryCell.pos[1] += entryCell.size[1] * e

      if (entry) {
        doc
          .font(entry.font)
          .fontSize(cfg.boardTextSize)
          .fillColor('black')
          .text(
            entry.text,
            ...entryCell.pos,
            {
              width: entryCell.size[0],
              height: entryCell.size[1],
              ellipsis: ELLIPSES
            }
          )
          .font(THIN) // restore font
      }
    }
  }

  doc.restore()

  //
  //
  // borders
  //
  if (localCfg.boardBorder) {
    doc
      .strokeColor('black')
      .strokeOpacity(1)
      .lineWidth(localCfg.borderLineWidth)
      .rect(...inner.pos, ...inner.size)
      .stroke()
  }
  doc
    .strokeColor('black')
    .strokeOpacity(1)
    .lineWidth(localCfg.borderLineWidth)
    .rect(...imageR.pos, ...imageR.size)
    .stroke()
}

const drawFooter = (doc, { rect }, cfg) => {
  let inner = rect.copy()

  let text = "Storyboarder by \\\\ wonder unit"
  doc
    .save()
    .font(THIN)
    .fontSize(8)
    .fillColor('black')
    .fillOpacity(0.6)
    .textWithoutFallback(
      text,
      rect.pos[0],
      rect.pos[1] + inner.size[1],
      {
        align: 'right',
        baseline: 'alphabetic',
        width: inner.size[0],
        height: inner.size[1],
        features: ['liga']
      }
    )
    .restore()
}
function generate ({ project }, cfg) {
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
    size: cfg.paperSize,
    info: {
      Title: project.title || project.scenes[0].title,
      Creator: `Storyboarder v${pkg.version}`
    }
  })
  patchPDFDocument(doc)

  doc.registerFont(THIN, THIN)
  doc.registerFont(BOLD, BOLD)

  let pages = groupByPage(project.scenes, gridDim[0] * gridDim[1])

  let start = cfg.pages[0]
  let end = cfg.pages[1] + 1

  for (let pageData of pages.slice(start, end)) {
    const imagesPath = path.join(path.dirname(pageData.scene.storyboarderFilePath), 'images')

    doc.addPage({
      margins: { top: 22, right: 22, bottom: 22, left: 22 },
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

    let header = new Rect(v.copy(pg.pos), [pg.size[0], pg.size[1] * 1/12])
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
        titles: {
          project: project.title,
          scene: pageData.scene.title
        },
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
        v.sub2(null, boardSize, [ROW_BOARD_MARGIN, 10])
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

      let cell = new Rect(
        v.add2([], template.pos, v.mul2([], template.size, [i, j])),
        template.size,
        template.attribs
      )
      drawBoard(
        doc,
        {
          rect: cell,
          container: template,
          board,
          scene: pageData.scene.data,
          imagesPath,
          direction
        },
        cfg
      )

      if (direction == 'row') {
        let borderRect = new Rect(
          v.add2([],  cell.pos, [ 1, 0]),
          v.sub2([], cell.size, [10, 0]),
          cell.attribs
        )
        drawBoardBordersRow(
          doc,
          {
            n,
            i,
            j,
            lastBoardIndex: pageData.boards.length - 1,
            rect: borderRect
          },
          cfg
        )
      }
    }
  }

  doc.end()

  return doc
}

//
//
// borders
//
const drawBoardBordersRow = (doc, options, cfg) => {
  if (cfg.boardBorderStyle == 'minimal') return

  let localCfg = { boardBorderStrokeColor: 'black', boardBorderLineWidth: 0.1, boardBorderStrokeOpacity: 0.25 }
  let { n, i, j, lastBoardIndex, rect } = options

  doc.save()

  doc
    .strokeColor(localCfg.boardBorderStrokeColor)
    .strokeOpacity(localCfg.boardBorderStrokeOpacity)
    .lineWidth(localCfg.boardBorderLineWidth)

  // first of column
  let first = j == 0
  // last of column or last board
  let last = j == (cfg.gridDim[1] - 1) || n == lastBoardIndex

  if (first) {
    // top
    doc
      .strokeOpacity(localCfg.boardBorderStrokeOpacity)
      .moveTo(...rect.pos)
      .lineTo(rect.pos[0] + rect.size[0], rect.pos[1])
      .stroke()
  }
  if (last) {
    // top (interior)
      // let innerOpacityScale = 0.4
      // doc
      //   .strokeOpacity(localCfg.boardBorderStrokeOpacity * innerOpacityScale)
      //   .moveTo(...rect.pos)
      //   .lineTo(rect.pos[0] + rect.size[0], rect.pos[1])
      //   .stroke()
    // bottom
    doc
      .strokeOpacity(localCfg.boardBorderStrokeOpacity)
      .moveTo(rect.pos[0], rect.pos[1] + rect.size[1])
      .lineTo(rect.pos[0] + rect.size[0], rect.pos[1] + rect.size[1])
      .stroke()
  }
  if (!(first || last)) {
    // bottom (interior)
      // doc
      //   .strokeOpacity(localCfg.boardBorderStrokeOpacity * innerOpacityScale)
      //   .moveTo(...rect.pos)
      //   .lineTo(rect.pos[0] + rect.size[0], rect.pos[1])
      //   .stroke()
  }

  doc
    .strokeOpacity(localCfg.boardBorderStrokeOpacity)
    // right
    .moveTo(rect.pos[0] + rect.size[0], rect.pos[1])
    .lineTo(rect.pos[0] + rect.size[0], rect.pos[1] + rect.size[1])
    .stroke()
    // left
    .moveTo(rect.pos[0], rect.pos[1])
    .lineTo(rect.pos[0], rect.pos[1] + rect.size[1])
    .stroke()

  doc.restore()
}

module.exports = generate
