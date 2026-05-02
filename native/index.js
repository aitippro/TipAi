const { existsSync } = require('fs')
const { join } = require('path')

const platforms = [
  ['win32', 'x64', 'tipai-core.win32-x64-msvc.node'],
  ['darwin', 'arm64', 'tipai-core.darwin-arm64.node'],
  ['darwin', 'x64', 'tipai-core.darwin-x64.node'],
  ['linux', 'x64', 'tipai-core.linux-x64-gnu.node'],
]

const platform = process.platform
const arch = process.arch

let nativeBinding = null
let loadError = null

for (const [p, a, bin] of platforms) {
  if (platform === p && arch === a) {
    const path = join(__dirname, bin)
    if (existsSync(path)) {
      try {
        nativeBinding = require(path)
        break
      } catch (e) {
        loadError = e
      }
    }
  }
}

if (!nativeBinding) {
  throw new Error(
    `Failed to load native binding for ${platform}-${arch}: ${loadError?.message || 'binary not found'}`
  )
}

module.exports = nativeBinding
