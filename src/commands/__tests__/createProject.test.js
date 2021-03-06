jest.mock('@rispa/generator', () => require.requireActual('../../__mocks__/generator'))
jest.mock('cross-spawn')
jest.mock('inquirer')
jest.mock('fs-extra')
jest.mock('../../utils/git.js')
jest.mock('../../utils/githubApi')
jest.mock('../../utils/preset')
jest.mock('../../tasks/installPreset', () => Object.assign(
  {},
  require.requireActual('../../tasks/installPreset'),
  { task: jest.fn() },
))

const path = require.requireActual('path')
const { LERNA_JSON_PATH, PLUGIN_PREFIX } = require.requireActual('../../constants')

const mockCrossSpawn = require.requireMock('cross-spawn')
const mockInquirer = require.requireMock('inquirer')
const mockFs = require.requireMock('fs-extra')
const mockGit = require.requireMock('../../utils/git.js')
const mockGenerator = require.requireMock('@rispa/generator')
const mockGithubApi = require.requireMock('../../utils/githubApi')
const mockPreset = require.requireMock('../../utils/preset')
const mockInstallPreset = require.requireMock('../../tasks/installPreset')

const CreateProjectCommand = require.requireActual('../createProject')

describe('create project', () => {
  beforeEach(() => {
    mockGit.init.mockClear()
    mockGit.commit.mockClear()
    mockGit.addSubtree.mockClear()
    mockCrossSpawn.sync.mockClear()
  })

  afterAll(() => {
    mockInquirer.setMockAnswers({})
    mockGithubApi.setMockPlugins([])
    mockFs.setMockFiles([])
    mockFs.setMockJson([])
  })

  const cwd = '/cwd'
  const projectName = 'project-name'
  const projectPath = path.resolve(cwd, `./${projectName}`)
  const remoteUrl = 'https://git.com/remote-url.git'
  const pluginName = 'rispa-core'
  const pluginRemoteUrl = 'https://git.com/plugin-remote-url.git'
  const crossSpawnOptions = { cwd: projectPath, stdio: 'inherit' }
  const preset = 'react'

  const runCommand = (args, options) => {
    const command = new CreateProjectCommand(args, { renderer: 'silent' })
    command.init()
    return command.run(Object.assign({
      cwd,
    }, options))
  }

  const expectSuccessGitCommands = () => {
    expect(mockGit.init).toBeCalled()
    expect(mockGit.commit).toBeCalledWith(projectPath, `Create project '${projectName}'`)
    expect(mockGit.addSubtree).toBeCalledWith(projectPath, `packages/${pluginName}`, pluginName, pluginRemoteUrl, undefined)
    expect(mockGit.commit).toBeCalledWith(projectPath, 'Bootstrap deps and install plugins')
  }

  it('should success create project', async () => {
    mockFs.setMockFiles([])

    mockGithubApi.setMockPlugins([{
      name: pluginName,
      cloneUrl: pluginRemoteUrl,
    }])

    mockGithubApi.setMockPluginNamePackageJson({
      [pluginName]: {
        name: pluginName.replace('rispa-', PLUGIN_PREFIX),
      },
    })

    mockInquirer.setMockAnswers({
      selectedPlugins: [
        {
          name: pluginName,
          cloneUrl: pluginRemoteUrl,
        },
      ],
    })

    const runGeneratorActions = jest.fn()
    mockGenerator.setMockGenerators({
      project: {
        runActions: runGeneratorActions,
      },
    })

    await expect(runCommand([projectName])).resolves.toBeDefined()

    expectSuccessGitCommands()
    expect(mockCrossSpawn.sync).toBeCalledWith('npm', ['install'], crossSpawnOptions)
    expect(runGeneratorActions).toBeCalledWith({ projectName })
  })

  it('should success create project via yarn', async () => {
    mockFs.setMockFiles([])

    mockGithubApi.setMockPlugins([{
      name: pluginName,
      cloneUrl: pluginRemoteUrl,
    }])

    mockGithubApi.setMockPluginNamePackageJson({
      [pluginName]: {
        name: pluginName.replace('rispa-', PLUGIN_PREFIX),
      },
    })

    mockInquirer.setMockAnswers({
      selectedPlugins: [{
        name: pluginName,
        cloneUrl: pluginRemoteUrl,
      }],
      projectName,
      remoteUrl,
    })

    const runGeneratorActions = jest.fn()
    mockGenerator.setMockGenerators({
      project: {
        runActions: runGeneratorActions,
      },
    })

    await expect(runCommand([], { yarn: true })).resolves.toBeDefined()

    expectSuccessGitCommands()
    expect(mockCrossSpawn.sync).toBeCalledWith('yarn', ['install'], crossSpawnOptions)
    expect(runGeneratorActions).toBeCalledWith({ projectName })
  })

  it('should success create project with preset', async () => {
    mockFs.setMockFiles([])

    mockGithubApi.setMockPlugins([])

    mockGithubApi.setMockPluginNamePackageJson({})

    mockInquirer.setMockAnswers({
      projectName,
      remoteUrl,
    })

    const runGeneratorActions = jest.fn()
    mockGenerator.setMockGenerators({
      project: {
        runActions: runGeneratorActions,
      },
    })

    mockFs.setMockJson({
      [path.resolve(projectPath, LERNA_JSON_PATH)]: {
        npmClient: 'yarn',
      },
    })

    mockPreset.readPresetConfiguration.mockImplementation(() => ({
      plugins: [pluginName],
      remotes: {
        [pluginName]: pluginRemoteUrl,
      },
    }))

    mockInstallPreset.task.mockImplementationOnce(ctx => {
      ctx.configuration.extends = preset
    })

    await expect(runCommand([], { preset }).catch(console.error)).resolves.toBeDefined()

    expectSuccessGitCommands()
    expect(mockCrossSpawn.sync).toBeCalledWith('yarn', ['install'], crossSpawnOptions)
    expect(runGeneratorActions).toBeCalledWith({ projectName })

    expect(mockInstallPreset.task).toBeCalled()
  })

  it('should failed create project - project exist', async () => {
    mockFs.setMockFiles([projectPath])

    await expect(runCommand([projectName]))
      .rejects.toHaveProperty(
        'message',
        `The directory '${projectName}' already exist.\nTry using a new project name.`,
      )
  })
})
