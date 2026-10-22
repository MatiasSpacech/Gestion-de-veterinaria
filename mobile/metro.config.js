const path = require('node:path')
const { getDefaultConfig } = require('expo/metro-config')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '..')

const config = getDefaultConfig(projectRoot)

config.watchFolders = [path.resolve(workspaceRoot, 'src')]
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')]

const defaultResolveRequest = config.resolver.resolveRequest

function resolveSourceAlias(moduleName, alias, targetDirectory) {
  if (moduleName === alias) {
    return path.join(targetDirectory, 'index.ts')
  }

  if (!moduleName.startsWith(`${alias}/`)) {
    return null
  }

  const relativePath = moduleName.slice(alias.length + 1)
  return path.join(targetDirectory, `${relativePath}.ts`)
}

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'node:crypto') {
    return {
      filePath: path.resolve(projectRoot, 'src/shims/node-crypto.ts'),
      type: 'sourceFile'
    }
  }

  const sharedPath = resolveSourceAlias(
    moduleName,
    '@shared',
    path.resolve(workspaceRoot, 'src/shared')
  )

  if (sharedPath) {
    return { filePath: sharedPath, type: 'sourceFile' }
  }

  const desktopPath = resolveSourceAlias(
    moduleName,
    '@desktop',
    path.resolve(workspaceRoot, 'src/main')
  )

  if (desktopPath) {
    return { filePath: desktopPath, type: 'sourceFile' }
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform)
  }

  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
