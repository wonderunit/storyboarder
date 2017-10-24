const fs = require('fs')
const util = require('../utils')

const wordCount = text =>
  text
  ? text.trim().replace(/ +(?= )/g,'').split(' ').length
  : 0

const durationOfWords = (text, durationPerWord) =>
  text
  ? wordCount(text) * durationPerWord
  : 0

const insertSceneIds = (fdxObj, generateNumber = () => util.uidGen(5)) => {
  return {
    ...fdxObj,
    FinalDraft: {
      ...fdxObj.FinalDraft,
      Content: {
        ...fdxObj.FinalDraft.Content,
        [0]: {
          ...fdxObj.FinalDraft.Content[0],
          Paragraph: fdxObj.FinalDraft.Content[0].Paragraph.map((element, i) => {
            switch (element.$.Type) {
              case 'Scene Heading':
                if (typeof element.$.Number === 'undefined') {
                  return {
                    ...element,
                    $: {
                      ...element.$,
                      Number: generateNumber()
                    }
                  }
                }
                break
            }
            return element
          })
        }
      }
    }
  }
}

const importFdxData = async fdxObj => {
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

module.exports = {
  importFdxData,
  insertSceneIds
}
