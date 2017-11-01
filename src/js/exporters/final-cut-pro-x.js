// https://developer.apple.com/library/content/documentation/FinalCutProX/Reference/FinalCutProXXMLFormat
const path = require('path')
const Fraction = require('fraction.js')

const { msecsToFrames } = require('./common')
const { boardFileImageSize, boardFilenameForExport } = require('../models/board')
const util = require('../utils')

// via https://developer.apple.com/library/content/documentation/FinalCutProX/Reference/FinalCutProXXMLFormat/StoryElements/StoryElements.html
// Time values are expressed as a rational number of seconds
// with a 64-bit numerator and a 32-bit denominator. 
// Frame rates for NTSC-compatible media, for example, 
// use a frame duration of 1001/30000s (29.97 fps) or 1001/60000s (59.94 fps). 
// If a time value is equal to a whole number of seconds, 
// the fraction may be reduced into whole seconds (for example, 5s).
const scaledFraction = (base, value = 1) =>
  base === 0 || value === 0
    ? '0'
    : Fraction(base).inverse().mul(value).toFraction()

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
        <format id="r1" frameDuration="${scaledFraction(data.fps, 1)}s" width="${data.width}" height="${data.height}"/>
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

const generateFinalCutProXData = (boardData, { projectFileAbsolutePath, outputPath }) => {
  let [width, height] = boardFileImageSize(boardData)

  let dirname = path.dirname(projectFileAbsolutePath)

  let extname = path.extname(projectFileAbsolutePath)
  let basenameWithoutExt = path.basename(projectFileAbsolutePath, extname)

  let assets = [],
      videos = []

  let currFrame = 0
  let index = 0
  for (let board of boardData.boards) {
    let filename = util.dashed(boardFilenameForExport(board, index, basenameWithoutExt))

    let duration = util.isUndefined(board.duration)
                     ? boardData.defaultBoardTiming
                     : board.duration

    let lastFrameOfBoard = Math.round(msecsToFrames(boardData.fps, duration)),
        endFrame = currFrame + lastFrameOfBoard

    let offsetInFrames = currFrame
    let durationInFrames = Math.round(msecsToFrames(boardData.fps, duration))

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
      src: `./${encodeURI(filename)}` // `file://${outputPath}/${filename}`,
    })

    videos.push({
      index,
      name: `${board.shot}`,

      offset: scaledFraction(boardData.fps, offsetInFrames) + 's',
      duration: scaledFraction(boardData.fps, durationInFrames) + 's',

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
    videos,
    
    fps: boardData.fps
  }
}

module.exports = {
  generateFinalCutProXData,
  generateFinalCutProXXml
}
