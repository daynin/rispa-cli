const path = require('path')
const fs = require('fs-extra')
const spawn = require('cross-spawn')
const { PACKAGE_JSON_PATH, DEFAULT_PLUGIN_BRANCH, PLUGIN_GIT_PREFIX } = require('../constants')

const readPackageJson = pluginPath => {
  const packageJsonPath = path.resolve(pluginPath, PACKAGE_JSON_PATH)
  return fs.readJsonSync(packageJsonPath, { throws: false }) || {}
}

const savePackageJson = (pluginPath, packageInfo) => {
  const packageJsonPath = path.resolve(pluginPath, PACKAGE_JSON_PATH)
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageInfo, null, 2))
}

const readDependencies = pluginPath => {
  const { dependencies, devDependencies } = readPackageJson(pluginPath)
  return Object.assign({}, dependencies, devDependencies)
}

const parseDependencyVersion = dependencyVersion => {
  let ref = DEFAULT_PLUGIN_BRANCH

  const parsedParts = /([~|^]?(\d+.\d+.\d+))|[*]/.exec(dependencyVersion)
  const version = parsedParts && parsedParts[2]
  if (version) {
    ref = `v${version}`
  }

  return ref
}

const extractPluginNameFromUrl = cloneUrl => {
  const parts = cloneUrl.split('/')
  return parts[parts.length - 1].replace(/\.git$/, '')
}

const findInList = (plugin, pluginList) => {
  if (typeof plugin === 'object') {
    return plugin
  } else if (plugin.startsWith(PLUGIN_GIT_PREFIX)) {
    return {
      name: extractPluginNameFromUrl(plugin),
      cloneUrl: plugin.replace(PLUGIN_GIT_PREFIX, ''),
    }
  }

  const currentPlugin = pluginList.find(({ name, packageName, packageAlias }) =>
    name === plugin || packageName === plugin || packageAlias === plugin
  )

  return currentPlugin || { name: plugin }
}

const publishToNpm = pluginPath => {
  const result = spawn.sync(
    'npm',
    ['publish', './', '--access=public'],
    { cwd: pluginPath, stdio: 'inherit' }
  )

  if (result.status !== 0) {
    throw new Error('Failed publish to npm')
  }

  return result
}

const compareVersions = (version1, version2) => {
  const major = parseInt(version1.major, 10) - parseInt(version2.major, 10)
  if (major !== 0) {
    return major
  }

  const minor = parseInt(version1.minor, 10) - parseInt(version2.minor, 10)
  if (minor !== 0) {
    return minor
  }

  const patch = parseInt(version1.patch, 10) - parseInt(version2.patch, 10)
  if (patch !== 0) {
    return patch
  }

  return 0
}

module.exports = {
  readPackageJson,
  readDependencies,
  parseDependencyVersion,
  extractPluginNameFromUrl,
  findInList,
  savePackageJson,
  publishToNpm,
  compareVersions,
}
