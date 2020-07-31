import fs from 'fs-extra'
import path from 'path'
const builtInPath = path.join(window.__dirname, 'js', 'locales')
const isBuiltInLanguage = (lng) => fs.existsSync(builtInPath +  `/${lng}.json`)
export { isBuiltInLanguage, builtInPath }