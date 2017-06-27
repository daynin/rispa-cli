const path = require('path')
const chalk = require('chalk')
const {
  addSubtree,
  cloneRepository: gitCloneRepository,
} = require('../utils/git')
const { improveTask } = require('../utils/tasks')
const { DEV_MODE } = require('../constants')

const checkCloneUrl = cloneUrl => {
  if (!cloneUrl.endsWith('.git')) {
    throw new Error(`Invalid plugin remote url ${chalk.cyan(cloneUrl)}`)
  }
}

const cloneRepository = (pluginsPath, cloneUrl, version) => {
  if (!gitCloneRepository(pluginsPath, cloneUrl, version)) {
    throw new Error('Can\'t clone repository')
  }
}

const createInstallPlugin = (name, cloneUrl, ref) => improveTask({
  title: `Install plugin with name ${chalk.cyan(name)}`,
  skip: ({ configuration: { plugins } }) => plugins.indexOf(name) !== -1 && 'Plugin already installed',
  before: ctx => {
    if (!ctx.installedPlugins) {
      ctx.installedPlugins = []
    }
  },
  task: ctx => {
    const { projectPath } = ctx
    const pluginsPath = ctx.pluginsPath || path.resolve(projectPath, ctx.configuration.pluginsPath)
    const mode = ctx.mode || ctx.configuration.mode

    checkCloneUrl(cloneUrl)

    if (mode === DEV_MODE) {
      cloneRepository(pluginsPath, cloneUrl)
    } else {
      const pluginsRelPath = path.relative(projectPath, pluginsPath)
      const prefix = `${pluginsRelPath}/${name}`
      addSubtree(projectPath, prefix, name, cloneUrl, ref)
    }

    ctx.pluginsPath = pluginsPath
    ctx.installedPlugins.push(name)
    ctx.configuration.plugins.push(name)
    ctx.configuration.remotes[name] = cloneUrl
  },
})

module.exports = createInstallPlugin
