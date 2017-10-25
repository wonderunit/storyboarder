const fs = require('fs')
const util = require('../utils')
const xml2js = require('xml2js')
const R = require('ramda')

const wordCount = text =>
  text
  ? text.trim().replace(/ +(?= )/g,'').split(' ').length
  : 0

const durationOfWords = (text, durationPerWord) =>
  text
  ? wordCount(text) * durationPerWord
  : 0



const _wrapAsync = fn => async (...rest) =>
  new Promise((resolve, reject) =>
      fn(...rest, (err, ...result) =>
          err
            ? reject(err)
            : resolve(...result)))

const parseXmlStringAsync = _wrapAsync((new xml2js.Parser()).parseString)

const readFdxFile = async filepath => {
  return await parseXmlStringAsync(fs.readFileSync(filepath))
}



// mutates fdxObj
const insertSceneIds = (fdxObj, generateNumber = () => util.uidGen(5)) => {
  fdxObj.FinalDraft.Content[0].Paragraph.forEach((element, i) => {
    switch (element.$.Type) {
      case 'Scene Heading':
        if (typeof element.$.Number === 'undefined') {
          element.$.Number = generateNumber()
        }
        break
    }
  })
}

const importFdxData = fdxObj => {
  let script = []
  let sceneAtom = { type: 'scene', script: [] }

  let currentTime = 0
  let currentCharacter
  let currentScene = 0
  let inDialogue = false

  // stats
  let totalWordCount = 0
  let sceneWordCount = 0
  let startSceneTime = 0

  let token

  fdxObj.FinalDraft.Content[0].Paragraph.forEach((element, i) => {
    switch (element.$.Type) {
      case 'Scene Heading':
        if (sceneAtom['script'].length > 0) {
          sceneAtom['duration'] = (currentTime - startSceneTime)
          sceneAtom['word_count'] = sceneWordCount
          if (!sceneAtom['scene_number']) {
            sceneAtom['scene_number'] = currentScene
          }
          if (!sceneAtom['scene_id']) {
            sceneAtom['scene_id'] = "G" + currentScene
          }
          if (!sceneAtom['slugline']) {
            sceneAtom['slugline'] = "BLACK"
          }
          script.push(sceneAtom)
        }

        startSceneTime = currentTime
        sceneWordCount = 0

        sceneAtom = { type: 'scene', script: [] }
        currentScene++
        let atom = {
          time: currentTime,
          duration: 2000,
          type: 'scene_padding',
          scene: currentScene,
          //page: token.page,
        }
        currentTime += atom['duration']
        sceneAtom['script'].push(atom)
        sceneAtom['scene_number'] = currentScene
        //sceneAtom['scene_id'] = token.scene_number
        if (element.Text[0]._) {
          sceneAtom['slugline'] = element.Text[0]._
        } else {
          sceneAtom['slugline'] = element.Text[0]
        }
        sceneAtom['time'] = currentTime
        //console.log(element.Text[0])
        break

      case 'Action':
      case 'General':
        if ( element.DualDialogue) {
          // TODO HANDLE DUAL DIALOGUE
          // loop through, add the nodes
          //console.log(element.DualDialogue[0].Paragraph)

        } else {
          if (typeof element.Text[0] == 'string') {
            //console.log(typeof element.Text[0])
          token = {}
          token['type'] = 'action'
          token['time'] = currentTime
          if (element.Text.length > 1) {
            token['text'] = element.Text[0] + element.Text[1]._
          } else {
            token['text'] = element.Text[0]
          }
          token['duration'] = durationOfWords(token.text, 200)+500
          token['scene'] = currentScene
          currentTime += token['duration']
          sceneAtom['script'].push(token)
          sceneWordCount += wordCount(token.text)
          }
        }
        break

      case 'Character':
        //console.log(element.Text[0])
        currentCharacter = element.Text[0]
        sceneWordCount += wordCount(element.Text[0])
        break

      case 'Parenthetical':
        //console.log(element.Text[0])
        token = {}
        token['type'] = 'parenthetical'
        token['text'] = element.Text[0]
        token['time'] = currentTime
        token['duration'] = durationOfWords(token.text, 300)+1000
        token['scene'] = currentScene
        token['character'] = currentCharacter
        currentTime += token['duration']
        sceneAtom['script'].push(token)
        sceneWordCount += wordCount(token.text)
        break

      case 'Dialogue':
        if (typeof element.Text == 'array') {
          //console.log(element.Text)

        } else {
          if (typeof element.Text[0] == 'string') {
            token = {}
            token['type'] = 'dialogue'
            token['text'] = element.Text[0]
            token['time'] = currentTime
            token['duration'] = durationOfWords(token.text, 300)+1000
            token['scene'] = currentScene
            token['character'] = currentCharacter
            currentTime += token['duration']
            sceneAtom['script'].push(token)
            sceneWordCount += wordCount(token.text)
          }        
        }
        break
    }
    // console.log(element.$.Type)
  })

  return script
}

const getScriptLocations = scriptData =>
  R.toPairs(scriptData
    .filter(x => x.type === 'scene')
    .reduce((locations, scene) => {
      location = scene.slugline.split(' - ')
      if (location.length > 1) {
        location.pop()
      }
      location = location.join(' - ')

      locations[location] = R.defaultTo(0, locations[location]) + 1
      return locations
    }, []))

module.exports = {
  readFdxFile,
  importFdxData,
  insertSceneIds,

  getScriptLocations
}
