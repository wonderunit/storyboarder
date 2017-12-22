const defaultKeyMap = {
  "drawing:brush-size:inc": "]",
  "drawing:brush-size:dec": "[",
  "drawing:quick-erase-size:inc": "Alt+]",
  "drawing:quick-erase-size:dec": "Alt+[",
  "drawing:clear-current-layer-modifier": "Alt",
  "drawing:scale-mode": "CommandOrControl+Alt",
  "drawing:move-mode": "CommandOrControl",
  "drawing:quick-erase-modifier": "Alt",
  "drawing:exit-current-mode": "Escape",

  "menu:file:open": "CommandOrControl+o",
  "menu:file:save": "CommandOrControl+s",
  "menu:file:save-as": "CommandOrControl+Shift+s",
  "menu:file:export-animated-gif": "CommandOrControl+e",
  "menu:file:print-worksheet": "CommandOrControl+Shift+p",
  "menu:file:import-worksheets": "CommandOrControl+i",
  "menu:file:import-images": "CommandOrControl+Shift+i",
  "menu:file:print": "CommandOrControl+p",

  "menu:edit:undo": "CommandOrControl+z",
  "menu:edit:redo": "Shift+CommandOrControl+z",
  "menu:edit:cut": "CommandOrControl+x",
  "menu:edit:copy": "CommandOrControl+c",
  "menu:edit:paste": "CommandOrControl+v",
  "menu:edit:select-all": "CommandOrControl+a",

  "menu:navigation:play": "Space",
  "menu:navigation:previous-board": "Left",
  "menu:navigation:next-board": "Right",
  "menu:navigation:previous-scene": "CommandOrControl+Left",
  "menu:navigation:next-scene": "CommandOrControl+Right",
  "menu:navigation:stop-all-sounds": "Escape",
  "menu:navigation:toggle-audition": "Alt+,",

  "menu:boards:new-board": "n",
  "menu:boards:new-board-before": "Shift+n",
  "menu:boards:delete-boards": "CommandOrControl+Backspace",
  "menu:boards:delete-boards-go-forward": "CommandOrControl+Delete",
  "menu:boards:duplicate": "d",
  "menu:boards:reorder-left": "Alt+Left",
  "menu:boards:reorder-right": "Alt+Right",
  "menu:boards:toggle-new-shot": "/",
  "menu:boards:add-audio-file": 'a',

  "menu:tools:light-pencil": "1",
  "menu:tools:pencil": "2",
  "menu:tools:pen": "3",
  "menu:tools:brush": "4",
  "menu:tools:note-pen": "5",
  "menu:tools:eraser": "6",
  "menu:tools:clear-all-layers": "Backspace",
  "menu:tools:clear-layer": "Alt+Backspace",
  "menu:tools:palette-color-1": "8",
  "menu:tools:palette-color-2": "9",
  "menu:tools:palette-color-3": "0",
  "menu:tools:flip-horizontal": "CommandOrControl+f",
  "menu:tools:edit-in-photoshop": "CommandOrControl+.",
  
  "menu:view:cycle-view-mode": "Tab",
  "menu:view:cycle-view-mode-reverse": "Shift+Tab",
  "menu:view:onion-skin": "o",
  "menu:view:toggle-captions": "c",
  "menu:view:toggle-full-screen": "F11",
  "menu:view:toggle-developer-tools": "Alt+Command+i",

  "menu:window:minimize": "CommandOrControl+m",
  "menu:window:close": "CommandOrControl+w",
  
  "menu:help:show-key-commands": "CommandOrControl+k",
  "menu:help:show-story-tip": "CommandOrControl+t",

  "workspace:thumbnails:select-multiple-modifier": "Shift",
  
  // macOS
  "menu:about:preferences": "CommandOrControl+,",

  // Windows
  "menu:edit:preferences": "CommandOrControl+,",

  "input:cancel": "Escape",
  "input:commit:single-line": "Enter",
  "input:commit:multi-line": "CommandOrControl+Enter"
}

module.exports = defaultKeyMap
