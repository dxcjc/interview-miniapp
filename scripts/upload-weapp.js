#!/usr/bin/env node
/**
 * 小程序自动上传/预览脚本（miniprogram-ci）
 * 用法：
 *   node scripts/upload-weapp.js upload 1.0.0 "本次更新说明"   # 上传开发版
 *   node scripts/upload-weapp.js preview                       # 生成预览二维码
 * 密钥：keys/private.wx2aa8b6f816a6566c.key（不入库）
 */
const ci = require('miniprogram-ci')
const path = require('path')

const APPID = 'wx2aa8b6f816a6566c'
const ROOT = path.resolve(__dirname, '..')
const KEY = path.join(ROOT, 'keys', `private.${APPID}.key`)

const project = new ci.Project({
  appid: APPID,
  type: 'miniProgram',
  projectPath: ROOT,
  privateKeyPath: KEY,
  ignores: ['node_modules/**/*', 'keys/**/*', 'docs/**/*', 'scripts/**/*', 'src/**/*', 'config/**/*', 'package*.json', 'babel.config.js', '.gitignore', '.git/**/*'],
})

const setting = { es6: true, es7: true, minify: true, codeProtect: false }

async function main() {
  const [cmd, version, desc] = process.argv.slice(2)
  if (cmd === 'upload') {
    const res = await ci.upload({
      project,
      version: version || '1.0.0',
      desc: desc || `自动构建 ${new Date().toLocaleString('zh-CN')}`,
      setting,
      onProgressUpdate: (p) => console.log('进度:', p),
    })
    console.log('✅ 上传成功', res)
  } else if (cmd === 'preview') {
    await ci.preview({
      project,
      desc: `预览 ${new Date().toLocaleString('zh-CN')}`,
      setting,
      qrcodeFormat: 'image',
      qrcodeOutputDest: '/tmp/miniapp-preview.png',
    })
    console.log('✅ 预览二维码已生成: /tmp/miniapp-preview.png')
  } else {
    console.log('用法: node scripts/upload-weapp.js <upload|preview> [version] [desc]')
  }
}

main().catch((e) => {
  console.error('❌ 失败:', e.message || e)
  process.exit(1)
})
