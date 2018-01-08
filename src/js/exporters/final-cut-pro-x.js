// https://developer.apple.com/library/content/documentation/FinalCutProX/Reference/FinalCutProXXMLFormat
const Fraction = require('fraction.js')
const path = require('path')
const Tone = require('tone')

const { msecsToFrames } = require('./common')
const { boardFileImageSize, boardFilenameForExport } = require('../models/board')
const util = require('../utils')

const assetOffset = 4

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
    : minBase(Fraction(base).inverse().mul(value).toFraction())

// convert e.g.: 1/24 to 100/2400
const minBase = str => {
  let parts = str.split('/')
  return parts.length === 2 && parts[1].length < 4
      ? parts.map(p => p * 100).join('/')
      : str
}

// <asset id="r3" name="board-1-9MZ1P" src="file:///board-1-9MZ1P.png" start="0s" duration="0s" hasVideo="1" format="r2"></asset>
const asset = (data, index) =>
  data.hasVideo
  ? `<asset id="r${index + assetOffset}" name="${data.filename}" src="${data.src}" start="0s" duration="0s" hasVideo="1" format="${data.format}" />`
  : `<asset id="r${index + assetOffset}" name="${data.filename}" src="${data.src}" start="0s" duration="0s" hasAudio="1" audioSources="1" audioChannels="${data.audioChannels}" audioRate="${data.audioRate}" />`

// <video name="board-1" offset="0/2400s" ref="r3" duration="4800/2400s" start="0s"/>
// <video name="board-2" offset="4800/2400s" ref="r4" duration="4800/2400s" start="0s"/>
const video = (data, index) =>
  `<video name="${data.name}" offset="${data.offset}" ref="r${data.index + assetOffset}" duration="${data.duration}" start="${data.start}">${
      data.assetClips.map(data =>`
                          <asset-clip name="${data.filename}" lane="${data.lane}" offset="${data.audioOffset}" ref="${data.ref}" duration="${data.audioDuration}" audioRole="dialogue" format="r3"/>`
      ).join('\n')
    }</video>`

const generateFinalCutProXXml = data =>
  `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.6">
    <resources>
        <format id="r1" frameDuration="${scaledFraction(data.fps, 1)}s" width="${data.width}" height="${data.height}"/>
        <format id="r2" name="${data.format}" width="${data.width}" height="${data.height}"/>
        <format id="r3" name="FFVideoFormatRateUndefined"/>

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

const generateFinalCutProXData = async (boardData, { projectFileAbsolutePath, outputPath }) => {
  let [width, height] = boardFileImageSize(boardData)

  let dirname = path.dirname(projectFileAbsolutePath)

  let extname = path.extname(projectFileAbsolutePath)
  let basenameWithoutExt = path.basename(projectFileAbsolutePath, extname)

  let assets = []
  let videos = []

  let normalizedFps = boardData.fps === 23.976
    ? 24000 / 1001 // better precision
    : boardData.fps

  let currFrame = 0
  let index = 0
  let timelinePosInMsecs = 0
  let lanes = [{ endInMsecs: 0 }]
  for (let board of boardData.boards) {
    let filename = util.dashed(boardFilenameForExport(board, index, basenameWithoutExt))

    let duration = util.isUndefined(board.duration)
                     ? boardData.defaultBoardTiming
                     : board.duration

    let lastFrameOfBoard = Math.round(msecsToFrames(normalizedFps, duration))
    let endFrame = currFrame + lastFrameOfBoard

    let offsetInFrames = currFrame
    let durationInFrames = Math.round(msecsToFrames(normalizedFps, duration))

    let videoAssetIndex = assets.length
    assets.push({
      filename,
      /*
      The src attribute is expected to be a string that specifies an
      absolute file URL conforming to RFC 2396, or a relative URL
      based on the location of the FCPXML document itself
      (for example, ./Media/MyMovie.mov).
      via https://developer.apple.com/library/content/documentation/FinalCutProX/Reference/FinalCutProXXMLFormat/Resources/Resources.html#//apple_ref/doc/uid/TP40011227-CH16-SW1
      */
      src: `./${encodeURI(filename)}`, // `file://${outputPath}/${filename}`
      format: 'r2',
      hasVideo: true
    })

    let assetClips = []

    if (board.audio &&
        board.audio.filename &&
        board.audio.filename.length) {

      let buffer
      try {
        buffer = await new Tone.Buffer().load(
          path.join(dirname, 'images', board.audio.filename)
        )
      } catch (err) {
        console.error(err)
        throw new Error(`could not load audio file ${board.audio.filename}`)
      }

      let audioChannels = buffer.numberOfChannels
      let audioRate = buffer._buffer.sampleRate

      let bufferOffsetInFrames = currFrame

      // let bufferDurationInFrames = Math.round(msecsToFrames(normalizedFps, buffer.duration * 1000))
      let bufferDurationInFrames = buffer.duration * normalizedFps

      let lane = lanes.length
      for (let i = 0; i < lanes.length; i++) {
        if (timelinePosInMsecs >= lanes[i].endInMsecs) {
          lane = i
          break
        }
      }
      lanes[lane] = lanes[lane] || {}
      lanes[lane].endInMsecs = timelinePosInMsecs + buffer.duration * 1000

      timelinePosInMsecs += duration

      let assetIndex = assets.length

      assets.push({
        index: assetIndex,
        filename: board.audio.filename,
        src: `./${encodeURI(board.audio.filename)}`, // `file://${outputPath}/${filename}`
        format: 'r3',
        hasVideo: false,

        audioChannels,
        audioRate
      })

      assetClips = [
        {
          filename: board.audio.filename,
          audioOffset: scaledFraction(normalizedFps, bufferOffsetInFrames) + 's',
          audioDuration: scaledFraction(normalizedFps, bufferDurationInFrames) + 's',

          ref: `r${assetIndex + assetOffset}`,
          lane: `-${lane + 1}`
        }
      ]
    }

    videos.push(Object.assign({
      index: videoAssetIndex,
      name: `${board.shot}`,

      offset: scaledFraction(normalizedFps, offsetInFrames) + 's',
      duration: scaledFraction(normalizedFps, durationInFrames) + 's',

      start: '0s',

      assetClips
    }))

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

    fps: normalizedFps
  }
}

module.exports = {
  generateFinalCutProXData,
  generateFinalCutProXXml
}
