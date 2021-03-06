const path = require('path')
const fs = require('fs-extra')
const { PLUGINS_CACHE_PATH } = require('../constants')

const createPluginsCache = () => ({
  paths: {},
  plugins: {},
})

const savePluginsCache = (pluginsByPaths, plugins, projectPath) => {
  const pluginsCachePath = path.resolve(projectPath, PLUGINS_CACHE_PATH)
  const pluginsCacheDirPath = path.dirname(pluginsCachePath)

  fs.ensureDirSync(pluginsCacheDirPath)

  fs.writeFileSync(pluginsCachePath, JSON.stringify({
    paths: Object.keys(pluginsByPaths)
      .reduce((result, pluginsPath) => {
        result[pluginsPath] = Object.keys(pluginsByPaths[pluginsPath])
        return result
      }, {}),
    plugins,
  }, null, 2))
}

const readPluginsCache = projectPath => {
  const pluginsCachePath = path.resolve(projectPath, PLUGINS_CACHE_PATH)
  const pluginsCache = fs.readJsonSync(pluginsCachePath, { throws: false })

  return pluginsCache || createPluginsCache()
}

const removePluginsCache = projectPath => {
  const pluginsCachePath = path.resolve(projectPath, PLUGINS_CACHE_PATH)
  fs.removeSync(pluginsCachePath)
}

module.exports = {
  createPluginsCache,
  savePluginsCache,
  readPluginsCache,
  removePluginsCache,
}
