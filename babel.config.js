// babel-preset-taro 更多选项和默认值：
// https://docs.taro.zone/docs/next/babel-config
// 微信真机 JS 引擎不支持 ES2020 可选链/空值合并（报 Unexpected token .），显式转译
module.exports = {
  presets: [
    ['taro', {
      framework: 'react',
      ts: true,
      compiler: 'webpack5',
    }]
  ],
  plugins: [
    '@babel/plugin-transform-optional-chaining',
    '@babel/plugin-transform-nullish-coalescing-operator',
  ],
}
