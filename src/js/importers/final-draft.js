const fs = require('fs')
const util = require('../utils')
const xml2js = require('xml2js')
const R = require('ramda')

const wordCount = text =>
  text &&
  // HACK ensure this is a string and .trim exists, fixes some errors #962
  text.trim
  ? text.trim().replace(/ +(?= )/g,'').split(' ').length
  : 0

const durationOfWords = (text, durationPerWord) =>
  text
  ? wordCount(text) * durationPerWord
  : 0

const elementText = element => {
  if (typeof element.Text[0] === 'string') {
    return element.Text[0]
  } else if (element.Text[0]._) {
    return element.Text[0]._
  }
  return undefined
}


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
const insertSceneIds = (fdxObj, generateNumber = () => util.uuid4()) => {
  let inserted = []
  fdxObj.FinalDraft.Content[0].Paragraph.forEach((element, i) => {
    switch (element.$.Type) {
      case 'Scene Heading':
        if (typeof element.$.Number === 'undefined') {
          let uid = generateNumber()
          inserted.push(uid)
          element.$.Number = uid
        }
        break
    }
  })
  return inserted
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

  let flush = () => {
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
  }

  fdxObj.FinalDraft.Content[0].Paragraph.forEach((element, i) => {
    switch (element.$.Type) {
      case 'Scene Heading':
        flush()

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
          if (typeof element.Text[0] === 'string') {
            sceneAtom['slugline'] = element.Text[0]
          }
        }
        sceneAtom['slugline'] = sceneAtom['slugline'] && sceneAtom['slugline'].toUpperCase()
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
        if (elementText(element)) {
          currentCharacter = elementText(element).toUpperCase()
          sceneWordCount += wordCount(currentCharacter)
        }
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

  flush()

  return script
}

const getScriptCharacters = scriptData =>
  R.pipe(
    R.filter(node => node.type === 'scene'),
    R.reduce((characters, scene) => {
      R.pipe(
        R.filter(n => typeof n.character !== 'undefined'),
        R.forEach(node => {
          character = node.character.split('(')[0].split(' AND ')[0].trim()

          characters[character] = R.defaultTo(0, characters[character]) + 1
        })
      )(scene.script)
      return characters
    }, []),
    R.toPairs
  )(scriptData)


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

  getScriptLocations,
  getScriptCharacters
}
