// https://developer.apple.com/library/content/documentation/FinalCutProX/Reference/FinalCutProXXMLFormat
const path = require('path')
const { boardFileImageSize, msecsToFrames, boardFilenameForExport } = require('./common')

// <asset id="r3" name="board-1-9MZ1P" src="file:///board-1-9MZ1P.png" start="0s" duration="0s" hasVideo="1" format="r2"></asset>
const asset = (data, index) =>
  `<asset id="r${data.index + 3}" name="${data.filename}" src="${data.src}" start="0s" duration="0s" hasVideo="1" format="r2"></asset>`

// <video name="board-1" offset="0/2400s" ref="r3" duration="4800/2400s" start="0s"/>
// <video name="board-2" offset="4800/2400s" ref="r4" duration="4800/2400s" start="0s"/>
const video = (data, index) =>
  `<video name="${data.name}" offset="${data.offset}" ref="r${data.index + 3}" duration="${data.duration}" start="${data.start}"/>`

const generateFinalCutProXXml = data =>
  `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.6">
    <resources>
        <format id="r1" frameDuration="100/2400s" width="${data.width}" height="${data.height}"/>
        <format id="r2" name="${data.format}" width="${data.width}" height="${data.height}"/>
        ${data.assets.map(asset).join('\n        ')}
    </resources>
    <library>
        <event name="${data.eventName}">
            <project name="${data.projectName}">
                <sequence format="r1" renderColorSpace="Rec. 709">
                    <spine>
                        ${data.videos.map(video).join('\n                        ')}
                    </spine>
                </sequence>
            </project>
        </event>
    </library>
</fcpxml>`

const generateFinalCutProXData = (boardData, { boardAbsolutePath, outputPath }) => {
  let [height, width] = boardFileImageSize(boardData)

  let dirname = path.dirname(boardAbsolutePath)

  let extname = path.extname(boardAbsolutePath)
  let basenameWithoutExt = path.basename(boardAbsolutePath, extname)

  let assets = [],
      videos = []

  let currFrame = 0
  let index = 0
  for (let board of boardData.boards) {
    let filename = boardFilenameForExport(board, index, basenameWithoutExt)

    let lastFrame = msecsToFrames(24, board.duration),
        endFrame = Math.round(currFrame + lastFrame)

    assets.push({
      index,
      filename,
      /*
      The src attribute is expected to be a string that specifies an
      absolute file URL conforming to RFC 2396, or a relative URL
      based on the location of the FCPXML document itself
      (for example, ./Media/MyMovie.mov).
      via https://developer.apple.com/library/content/documentation/FinalCutProX/Reference/FinalCutProXXMLFormat/Resources/Resources.html#//apple_ref/doc/uid/TP40011227-CH16-SW1
      */
      src: `file://${outputPath}/${filename}`, // `./${filename}`
    })

    videos.push({
      index,
      name: `${basenameWithoutExt}-board-${index + 1}`,
      offset: `${currFrame * 100}/2400s`,
      duration: `${endFrame * 100}/2400s`,
      start: '0s'
    })

    currFrame = endFrame
    index++
  }

  return {
    width,
    height,
    format: 'FFVideoFormatRateUndefined',
    eventName: 'Storyboarder',
    projectName: basenameWithoutExt, // TODO arg for board name
    assets,
    videos
  }
}

module.exports = {
  generateFinalCutProXData,
  generateFinalCutProXXml
}
