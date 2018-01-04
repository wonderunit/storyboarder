// https://developer.apple.com/library/content/documentation/AppleApplications/Reference/FinalCutPro_XML
const path = require('path')

const Tone = require('tone')

const { msecsToFrames } = require('./common')
const { boardFileImageSize, boardFilenameForExport } = require('../models/board')
const util = require('../utils')

// fcp templating
const clipItem = data =>
`
          <clipitem id="${data.id}">
            <!-- id -->
            <masterclipid>${data.masterClipId}</masterclipid>
            <!-- set name if dialogue or action, otherwise filename -->
            <name>${data.name}</name>
            <description>${data.description}</description>
            <enabled>TRUE</enabled>
            <duration>${data.duration}</duration>
            <rate>
              <timebase>${data.timebase}</timebase>
              <ntsc>${data.ntsc}</ntsc>
            </rate>
            <!-- start time in frames (${data.timebase}fps) -->
            <start>${data.start}</start>
            <!-- end time in frames (${data.timebase}fps) -->
            <end>${data.end}</end>
            <in>107892</in>
            <out>107916</out>
            <!-- file id -->
            <file id="${data.fileId}">
              <!-- filename -->
              <name>${data.fileFilename}</name>
              <pathurl>${data.filePathUrl}</pathurl>
              <media>
                <video>
                  <samplecharacteristics>
                    <!-- width -->
                    <width>${data.fileWidth}</width>
                    <!-- height -->
                    <height>${data.fileHeight}</height>
                  </samplecharacteristics>
                </video>
              </media>
            </file>
            <labels>
              <label2>${data.label2}</label2>
            </labels>
          </clipitem>
`

const audioClipFile = data => 
  data.currentExplodedTrackIndex === 0
  ? `
            <file id="${data.fileId}">
              <name>${data.filename}</name>
              <pathurl>${data.pathurl}</pathurl>
              <rate>
                <timebase>${data.timebase}</timebase>
                <ntsc>${data.ntsc}</ntsc>
              </rate>
              <duration>${data.duration}</duration>
              <timecode>
                <rate>
                  <timebase>${data.timebase}</timebase>
                  <ntsc>${data.ntsc}</ntsc>
                </rate>
                <string>00;00;00;00</string>
                <frame>0</frame>
                <displayformat>DF</displayformat>
                <reel>
                  <name></name>
                </reel>
              </timecode>
              <media>
                <audio>
` +
/*`                  <samplecharacteristics>
                    <depth>${data.bitDepth}</depth>
                    <samplerate>${data.sampleRate}</samplerate>
                  </samplecharacteristics>` + */
`                  <channelcount>${data.numberOfChannels}</channelcount>
` + 
/*`                  <audiochannel>
                    <sourcechannel>1</sourcechannel>
                  </audiochannel>`*/
`                </audio>
              </media>
            </file>
`
: `<file id="${data.fileId}" />`

const audioClip = data => `
        <track TL.SQTrackAudioKeyframeStyle="0" TL.SQTrackShy="0" TL.SQTrackExpandedHeight="25" TL.SQTrackExpanded="0" MZ.TrackTargeted="1" PannerCurrentValue="0.5" PannerIsInverted="true" PannerStartKeyframe="-91445760000000000,0.5,0,0,0,0,0,0" PannerName="Balance" currentExplodedTrackIndex="${data.currentExplodedTrackIndex}" totalExplodedTrackCount="1" premiereTrackType="Stereo">
          <clipitem id="${data.id}" premiereChannelType="stereo">
            <masterclipid>${data.masterClipId}</masterclipid>
            <name>${data.name}</name>
            <enabled>TRUE</enabled>
            <duration>${data.duration}</duration>
            <rate>
              <timebase>${data.timebase}</timebase>
              <ntsc>${data.ntsc}</ntsc>
            </rate>
            <start>${data.start}</start>
            <end>${data.end}</end>
            <in>${data.in}</in>
            <out>${data.out}</out>
            <pproTicksIn>${data.pproTicksIn}</pproTicksIn>
            <pproTicksOut>${data.pproTicksOut}</pproTicksOut>

            ${audioClipFile(data)}

            <sourcetrack>
              <mediatype>audio</mediatype>
              <trackindex>${data.sourceTrackIndex}</trackindex>
            </sourcetrack>

            <link>
              <linkclipref>${data.linkcliprefA}</linkclipref>
              <mediatype>audio</mediatype>
              <trackindex>${data.linkTrackIndexA}</trackindex>
              <clipindex>1</clipindex>
              <groupindex>1</groupindex>
            </link>
            <link>
              <linkclipref>${data.linkcliprefB}</linkclipref>
              <mediatype>audio</mediatype>
              <trackindex>${data.linkTrackIndexB}</trackindex>
              <clipindex>1</clipindex>
              <groupindex>1</groupindex>
            </link>

            <logginginfo>
              <description></description>
              <scene></scene>
              <shottake></shottake>
              <lognote></lognote>
            </logginginfo>
            <labels>
              <label2>Caribbean</label2>
            </labels>
          </clipitem>
          <enabled>TRUE</enabled>
          <locked>FALSE</locked>
          <outputchannelindex>${data.outputChannelIndex}</outputchannelindex>
        </track>`

const generateFinalCutProXml = data =>
`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="4">
  <sequence id="${data.sequenceId}">
    <uuid>${data.uuid}</uuid>
    <rate>
      <timebase>${data.timebase}</timebase>
      <ntsc>${data.ntsc}</ntsc>
    </rate>
    <media>
      <video>
        <format>
          <samplecharacteristics>
            <rate>
              <timebase>${data.timebase}</timebase>
            </rate>
            <!-- WIDTH -->
            <width>${data.width}</width>
            <!-- HEIGHT -->
            <height>${data.height}</height>
            <anamorphic>FALSE</anamorphic>
            <pixelaspectratio>square</pixelaspectratio>
            <fielddominance>none</fielddominance>
            <colordepth>24</colordepth>
          </samplecharacteristics>
        </format>
        <track>${data.clipItems.map(clipItem).join('\n')}
          <!-- END OF CLIPS -->
          <enabled>TRUE</enabled>
          <locked>FALSE</locked>
        </track>
        <track>
          <enabled>TRUE</enabled>
          <locked>FALSE</locked>
        </track>
        <track>
          <enabled>TRUE</enabled>
          <locked>FALSE</locked>
        </track>
      </video>
      <audio>
        <numOutputChannels>2</numOutputChannels>
        <format>
          <samplecharacteristics>
            <depth>16</depth>
            <samplerate>48000</samplerate>
          </samplecharacteristics>
        </format>
        <outputs>
          <group>
            <index>1</index>
            <numchannels>1</numchannels>
            <downmix>0</downmix>
            <channel>
              <index>1</index>
            </channel>
          </group>
          <group>
            <index>2</index>
            <numchannels>1</numchannels>
            <downmix>0</downmix>
            <channel>
              <index>2</index>
            </channel>
          </group>
        </outputs>
        ${data.audioClips.map(audioClip).join('\n')}

        <track TL.SQTrackAudioKeyframeStyle="0" TL.SQTrackShy="0" TL.SQTrackExpandedHeight="25" TL.SQTrackExpanded="0" MZ.TrackTargeted="1" PannerCurrentValue="0.5" PannerIsInverted="true" PannerStartKeyframe="-91445760000000000,0.5,0,0,0,0,0,0" PannerName="Balance" currentExplodedTrackIndex="0" totalExplodedTrackCount="2" premiereTrackType="Stereo">
          <enabled>TRUE</enabled>
          <locked>FALSE</locked>
          <outputchannelindex>1</outputchannelindex>
        </track>
        <track TL.SQTrackAudioKeyframeStyle="0" TL.SQTrackShy="0" TL.SQTrackExpandedHeight="25" TL.SQTrackExpanded="0" MZ.TrackTargeted="1" PannerCurrentValue="0.5" PannerIsInverted="true" PannerStartKeyframe="-91445760000000000,0.5,0,0,0,0,0,0" PannerName="Balance" currentExplodedTrackIndex="1" totalExplodedTrackCount="2" premiereTrackType="Stereo">
          <enabled>TRUE</enabled>
          <locked>FALSE</locked>
          <outputchannelindex>2</outputchannelindex>
        </track>
      </audio>
    </media>
  </sequence>
</xmeml>
`

const sanitizeNameString = function (nameString) {
    return nameString.replace(/&/g, '+')
               .replace(/</g, '-')
               .replace(/>/g, '-')
               .replace(/"/g, '')
               .replace(/'/g, '')
               .replace(/\//g, '');
  };

// via https://forums.adobe.com/message/8161911#8161911
// 1 s = 254016000000 ticks
// "This value is not guaranteed to remain the same from version to version."
const pproTicksForFrames = (fps, frames) => frames / fps * 254016000000

const generateFinalCutProData = async (boardData, { projectFileAbsolutePath, outputPath }) => {
  let [width, height] = boardFileImageSize(boardData)

  let dirname = path.dirname(projectFileAbsolutePath)

  let extname = path.extname(projectFileAbsolutePath)
  let basenameWithoutExt = path.basename(projectFileAbsolutePath, extname)

  // fps is always rounded up
  let timebase = Math.ceil(boardData.fps)
  // ntsc is set true if fps is a decimal, false if fps is an integer
  let ntsc = boardData.fps % 1 > 0
    ? 'TRUE'
    : 'FALSE'

  let clipItems = []
  let audioClips = []
  let currFrame = 0
  let index = 0
  let currAudioIndex = 0
  let timelinePosInMsecs = 0
  let endInMsecsByTrackNumber = []
  for (let board of boardData.boards) {
    let fileFilename = util.dashed(boardFilenameForExport(board, index, basenameWithoutExt)),
        filePathUrl = `./${encodeURI(fileFilename)}` //`file://${outputPath}/${fileFilename}`

    let duration = (util.isUndefined(board.duration) || board.duration == 0)
                     ? boardData.defaultBoardTiming
                     : board.duration

    let lastFrame = Math.round(msecsToFrames(boardData.fps, duration)),
        endFrame = currFrame + lastFrame

    let clipItem = {
      start: currFrame,
      end: endFrame,

      id: `clipitem-${index + 1}`,
      masterClipId: `masterclip-${index + 1}`,

      // set name if dialogue or action, otherwise filename
      name: board.dialogue
              ? sanitizeNameString(board.dialogue)
              : board.action
                ? sanitizeNameString(board.action)
                : fileFilename,

      description: board.notes
                     ? sanitizeNameString(board.notes)
                     : '',

      duration: 1294705, // ???
      timebase,
      ntsc,

      fileId: `file-${index + 1}`,
      fileFilename,
      filePathUrl,

      fileWidth: width,
      fileHeight: height,

      label2: 'Lavender'
    }
    clipItems.push(clipItem)

    if (board.audio && board.audio.filename && board.audio.filename.length) {
      let filepath = path.join(dirname, 'images', board.audio.filename)
      let buffer
      
      try {
        buffer = await new Tone.Buffer().load(filepath)
      } catch (err) {
        console.error(err)
        throw new Error(`could not load audio file ${board.audio.filename}`)
      }

      // buffer.length               // length in samples, e.g. 44788
      // buffer.duration)            // duration in seconds, e.g. 0.933...
      // buffer._buffer.sampleRate)  // sample rate
      // buffer.numberOfChannels)    // number of channels (0 if not loaded)

      // read the values
      let audioDurationInMsecs = Math.round(buffer.duration * 1000)
      let bitDepth = -1
      let sampleRate = buffer._buffer.sampleRate
      let numberOfChannels = buffer.numberOfChannels
      // let outputChannelIndex = (index % 2) + 1 // alternate output channels

      let audioEndFrame = currFrame + Math.round(msecsToFrames(boardData.fps, audioDurationInMsecs))

      let audioClip = {
        // id: `clipitem-${index + 1 + boardData.boards.length}`, // index AFTER the video clips
        name: board.audio.filename,

        duration: msecsToFrames(boardData.fps, audioDurationInMsecs),

        timebase: timebase,
        ntsc: ntsc,

        start: currFrame,
        end: audioEndFrame,
        in: 0,
        out: Math.round(msecsToFrames(boardData.fps, audioDurationInMsecs)),

        pproTicksIn: pproTicksForFrames(boardData.fps, 0),
        pproTicksOut: pproTicksForFrames(boardData.fps, Math.round(msecsToFrames(boardData.fps, audioDurationInMsecs))),

        // fileId: `file-${index + 1 + boardData.boards.length}`, // index AFTER the video clips
        filename: board.audio.filename,
        pathurl: `./${board.audio.filename}`, // `file://localhost${path.join(dirname, board.audio.filename)}`,

        bitDepth: bitDepth,
        sampleRate: sampleRate,

        numberOfChannels: numberOfChannels,
        // outputChannelIndex: outputChannelIndex
      }

      // source’s trackindex
      let sourceTrackIndices = 
        numberOfChannels == 1
          ? [1, 1] // mono
          : [1, 2] // stereo

      let nextAvailableTrackIndex = endInMsecsByTrackNumber.length
      for (let i = 0; i < endInMsecsByTrackNumber.length; i++) {
        let time = endInMsecsByTrackNumber[i]
        if (timelinePosInMsecs >= time) {
          nextAvailableTrackIndex = i
          break
        }
      }

      let links = {
        linkcliprefA: `clipitem-${currAudioIndex + 1 + boardData.boards.length}`,
        linkTrackIndexA: (nextAvailableTrackIndex * 2) + 1,

        linkcliprefB: `clipitem-${currAudioIndex + 2 + boardData.boards.length}`,
        linkTrackIndexB: (nextAvailableTrackIndex * 2) + 2
      }

      let masterClipId = `masterclip-${index + 1 + boardData.boards.length}`

      endInMsecsByTrackNumber[nextAvailableTrackIndex] = timelinePosInMsecs + audioDurationInMsecs

      // left
      audioClips.push(Object.assign({}, audioClip, {
        masterClipId,
        id: links.linkcliprefA,
        fileId: `file-${currAudioIndex + 1 + boardData.boards.length}`,
        currentExplodedTrackIndex: 0,
        sourceTrackIndex: sourceTrackIndices[0],
        outputChannelIndex: 1,
      }, links))

      // right
      audioClips.push(Object.assign({}, audioClip, {
        masterClipId,
        id: links.linkcliprefB,
        fileId: `file-${currAudioIndex + 1 + boardData.boards.length}`, // same file id
        currentExplodedTrackIndex: 1,
        sourceTrackIndex: sourceTrackIndices[1],
        outputChannelIndex: 2
      }, links))

      currAudioIndex = currAudioIndex + 2
    }

    timelinePosInMsecs += duration

    currFrame = endFrame
    index++
  }

  return {
    sequenceId: 'sequence-1',
    uuid: util.uuid4(),
    width: width,
    height: height,
    clipItems: clipItems,
    audioClips: audioClips,
    
    timebase,
    ntsc
  }
}

module.exports = {
  generateFinalCutProData,
  generateFinalCutProXml
}
