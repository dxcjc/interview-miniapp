import Taro from '@tarojs/taro'
import { API_BASE, REQUEST_TIMEOUT } from '../config'

export interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  data?: Record<string, unknown>
  timeout?: number
  header?: Record<string, string>
}

export class ApiError extends Error {
  statusCode: number
  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
  }
}

/** 剔除无效查询参数（undefined/null/空串），避免序列化成 "undefined" 破坏后端过滤 */
function cleanData(data: Record<string, unknown> | undefined, method: string): Record<string, unknown> | undefined {
  if (method !== 'GET' || !data) return data
  const out: Record<string, unknown> = {}
  Object.entries(data).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') out[k] = v
  })
  return out
}

/** 统一请求封装：拼 API_BASE、JSON 头、超时、状态码校验、错误 toast */
export async function request<T = any>({
  url,
  method = 'GET',
  data,
  timeout = REQUEST_TIMEOUT,
  header,
}: RequestOptions): Promise<T> {
  let res: Taro.request.SuccessCallbackResult
  try {
    res = await Taro.request({
      url: `${API_BASE}${url}`,
      method: method as any,
      data: cleanData(data, method),
      timeout,
      header: { 'Content-Type': 'application/json', ...header },
    })
  } catch (err) {
    const msg = (err as any)?.errMsg || '网络请求失败'
    Taro.showToast({ title: msg.includes('timeout') ? '请求超时' : '网络异常', icon: 'none' })
    throw new ApiError(0, msg)
  }

  if (res.statusCode >= 200 && res.statusCode < 300) {
    return res.data as T
  }
  Taro.showToast({ title: `请求失败（${res.statusCode}）`, icon: 'none' })
  throw new ApiError(res.statusCode, `HTTP ${res.statusCode}`)
}

export const get = <T = any>(url: string, data?: Record<string, unknown>) =>
  request<T>({ url, method: 'GET', data })
export const post = <T = any>(url: string, data?: Record<string, unknown>) =>
  request<T>({ url, method: 'POST', data })
export const patch = <T = any>(url: string, data?: Record<string, unknown>) =>
  request<T>({ url, method: 'PATCH', data })
