let scriptData

// TODO: get most used words in dialogue



function paginate(tokens) {
  let currentPage = 0
  let currentLine = 0
  let currentCurs = 0

  let reqLine = 0
  let inDialogue = false

  for (var token of tokens) {
    if (!inDialogue){reqLine = 0}

    switch (token.type) {
      case 'scene_heading': reqLine += 3; break;
      case 'action': reqLine += linesForText(token.text, 63)+1; break;
      case 'dialogue_begin': inDialogue = true; break;
      case 'dual_dialogue_begin': inDialogue = true; break;
      case 'character': reqLine += 1; break;
      case 'parenthetical': reqLine += 1; break;
      case 'dialogue': reqLine += linesForText(token.text, 35); break;
      case 'dialogue_end': reqLine += 1; inDialogue = false; break;
      case 'dual_dialogue_end': reqLine += 1; inDialogue = false; break;
      case 'centered': reqLine += 2; break;
      case 'transition': reqLine += 2; break;
    }

    if (!inDialogue){
      if ((currentLine + reqLine) < 55) {
        currentLine += reqLine
      } else {
        currentPage += 1
        currentLine = reqLine
        switch (token.type) {
          case 'scene_heading':
          case 'action':
          case 'centered':
          case 'transition': 
          case 'dialogue_end':
          case 'dual_dialogue_end':
            currentLine -= 1
            break
        }
      }
    }
    token.page = currentPage+1;
  }
  
  let pageCount = currentPage+1;

  //console.log("page count: " + pageCount);
}

function linesForText(text, charWidth) {
  if (!text) return 0
  let splitText = text.split(' ')
  let line = 0
  let currentCurs = 0
  for (var word of splitText) {
    if (word.indexOf("/>") != -1) {
      line++
      currentCurs = word.length - 1
    } else if (word.indexOf("<br") != -1) {
      currentCurs = 0
    } else {
      if ((currentCurs + word.length) < charWidth){
        currentCurs += (word.length + 1)
      } else {
        line++
        currentCurs = word.length + 1
      }
    }
  }
  return line+1
}

function wordCount(text) {
  if (!text) return 0
  return text.trim().replace(/ +(?= )/g,'').split(' ').length
}

function durationOfWords(text, durationPerWord) {
  if (!text) return 0
  return wordCount(text)*durationPerWord
}

function parseScenes(tokens) {
  for (var token of tokens) {
    if (token.type == "scene_heading") {
      //console.log(token.text);
    }
  }
}

function getCharacters(tokens) {
  let characters = {}
  let character
  for (var token of tokens) {
    if (token.type == 'character') {
      character = token.text.split('(')[0].split(' AND ')[0].trim()
      if (characters[character] == undefined) {
        characters[character] = 1
      } else {
        characters[character]++
      }
    }
  }
  return sortedValues(characters)
}

function getLocations(tokens) {
  let locations = {}
  let location
  for (var token of tokens) {
    if (token.type == 'scene_heading') {
      location = token.text.split(' - ')
      if (location.length > 1) {
        location.pop()
      }
      location = location.join(' - ')

      if (locations[location] == undefined) {
        locations[location] = 1
      } else {
        locations[location]++
      }
    }
  }
  return values(locations)
}

function sortedValues(obj) {
  let tuples = []
  for (var key in obj) tuples.push([key, obj[key]])
  tuples.sort((a, b)=>{ return a[1] < b[1] ? 1 : a[1] > b[1] ? -1 : 0 })
  return tuples
}

function values(obj) {
  let tuples = []
  for (var key in obj) tuples.push([key, obj[key]])
  return tuples
}


function parseTokens(tokens) {
  let script = []
  let sceneAtom = {type: 'scene'}
  sceneAtom['script'] = []
  let currentTime = 0
  let currentCharacter
  let currentScene = 0
  let inDialogue = false

  // stats
  let totalWordCount = 0
  let sceneWordCount = 0
  let startSceneTime = 0


  // add wordcount per scene, add duration per scene

  for (var token of tokens) {
    switch (token.type) {
      case 'boneyard_begin':
        console.log('boneyard BEGIN')
        break
      case 'boneyard_end':
        console.log('boneyard END')
        break
      case 'title':
        token['time'] = currentTime
        token['duration'] = 2000
        token['scene'] = currentScene
        currentTime += token['duration']
        script.push(token)
        break
      case 'credit':
      case 'author':
      case 'authors':
      case 'format':
      case 'source':
      case 'notes':
      case 'draft_date':
      case 'date':
      case 'contact':
      case 'copyright':
        script[0][token.type] = token.text
        break
      case 'scene_heading':
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

        sceneAtom = {type: 'scene'}
        sceneAtom['script'] = []
        currentScene++
        let atom = {
          time: currentTime,
          duration: 2000,
          type: 'scene_padding',
          scene: currentScene,
          page: token.page,
        }
        currentTime += atom['duration']
        sceneAtom['script'].push(atom)
        sceneAtom['scene_number'] = currentScene
        sceneAtom['scene_id'] = token.scene_number
        sceneAtom['slugline'] = token.text
        sceneAtom['time'] = currentTime
        sceneAtom['page'] = token.page

        token['time'] = currentTime
        token['duration'] = 0
        token['scene'] = currentScene
        currentTime += token['duration']
        sceneAtom['script'].push(token)
        sceneWordCount += wordCount(token.text)
        break
      case 'action':
        token['time'] = currentTime
        token['duration'] = durationOfWords(token.text, 200)+500
        token['scene'] = currentScene
        currentTime += token['duration']
        sceneAtom['script'].push(token)
        sceneWordCount += wordCount(token.text)
        break

      case 'dialogue_begin': inDialogue = true; break;
      case 'dual_dialogue_begin': inDialogue = true; break;
      case 'character':
        currentCharacter = token.text
        sceneWordCount += wordCount(token.text)
        break
      case 'parenthetical':
        token['time'] = currentTime
        token['duration'] = durationOfWords(token.text, 300)+1000
        token['scene'] = currentScene
        token['character'] = currentCharacter
        currentTime += token['duration']
        sceneAtom['script'].push(token)
        sceneWordCount += wordCount(token.text)
        break
      case 'dialogue':
        token['time'] = currentTime
        token['duration'] = durationOfWords(token.text, 300)+1000
        token['scene'] = currentScene
        token['character'] = currentCharacter
        currentTime += token['duration']
        sceneAtom['script'].push(token)
        sceneWordCount += wordCount(token.text)
        break
      case 'dialogue_end':
      case 'dual_dialogue_end':
        inDialogue = false
        break
      case 'centered':
        // token['time'] = currentTime
        // token['duration'] = 2000
        // token['scene'] = currentScene
        // currentTime += token['duration']
        // sceneAtom['script'].push(token)
        break
      case 'transition':
        token['time'] = currentTime
        token['duration'] = 1000
        token['scene'] = currentScene
        currentTime += token['duration']
        sceneAtom['script'].push(token)
        sceneWordCount += wordCount(token.text)
        break
      case 'section':
        if (token.depth == 1) {
          
          if (sceneAtom['script'].length > 0) {
            sceneAtom['duration'] = (currentTime - startSceneTime)
            sceneAtom['word_count'] = sceneWordCount
            script.push(sceneAtom)
            sceneAtom = {type: 'scene'}
            sceneAtom['script'] = []
          }


          token['time'] = currentTime
          token['duration'] = 0
          token['scene'] = currentScene
          currentTime += token['duration']
          script.push(token)
          //console.log(token)
        } else {
          token['time'] = currentTime
          token['duration'] = 0
          token['scene'] = currentScene
          currentTime += token['duration']
          sceneAtom['script'].push(token)
        }
        break
      case 'synopsis':
        sceneAtom['synopsis'] = token.text
        break
      case 'note':
        //console.log(token)
        break

    }

  }
  if (sceneAtom['script'].length > 0) {
    sceneAtom['duration'] = (currentTime - startSceneTime)
    sceneAtom['word_count'] = sceneWordCount
    // console.log(sceneAtom)
    // if (!sceneAtom['scene_number']) {
    //   console.log(sceneAtom)
    // }
    script.push(sceneAtom)
  }

  return script

}

let checkForSceneIds = (tokens) => {
  let hasSceneIds = true

  for (var token of tokens) {
    switch (token.type) {
      case 'scene_heading':
        if (!token.scene_number) {
          hasSceneIds = false
          return hasSceneIds
        }
        break
    }
  }
  return hasSceneIds
}

let fountainDataParser = {
  parse: (scriptTokens)=> {
    scriptData = scriptTokens
    paginate(scriptData)

    //console.log(scriptData)
    //parseScenes(scriptData)
    //getCharacters(scriptData)
    return parseTokens(scriptData)
  },
  checkForSceneIds: checkForSceneIds,
  getLocations: (scriptTokens)=> {
    return getLocations(scriptTokens)
  },
  getCharacters: (scriptTokens)=> {
    return getCharacters(scriptTokens)
  }


}

module.exports = fountainDataParser
