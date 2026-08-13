// 接口地址配置：
// - 构建时 process.env.TARO_APP_API 会被内联覆盖（见 config/index.ts defineConstants）
// - 生产默认指向 Cloudflare HTTPS 隧道（临时域名，上线需替换为已备案 HTTPS 域名）
// - 开发默认走 nginx 80 端口（/interview/api，安全组已放行 80；8900 未放行不可直连）
const DEV_API = 'http://110.42.215.22/interview/api'
const PROD_API = 'https://dishes-delete-palmer-quantity.trycloudflare.com/interview/api'

const envApi = (process.env.TARO_APP_API as string) || ''

export const API_BASE: string =
  envApi || (process.env.NODE_ENV === 'production' ? PROD_API : DEV_API)

export const REQUEST_TIMEOUT = 60000
