/* eslint-disable @typescript-eslint/ban-types */
import { type SearchParameters, ofetch, type FetchOptions, $Fetch } from 'ofetch'
import type {
  FilterKeys,
  HasRequiredKeys,
  HttpMethod,
  MediaType,
  OperationRequestBodyContent,
  PathsWithMethod,
  ResponseObjectMap,
  SuccessResponse,
} from 'openapi-typescript-helpers'
import { parseTemplate } from 'url-template'

// 默认的请求参数类型.
export interface DefaultParamsOption {
  params?: SearchParameters
}
// 获取请求的 param 类型.
export type ParamsOption<T> = T extends {
  parameters: any
}
  ? T['parameters']
  : DefaultParamsOption

// 设置body类型.
export type RequestBodyOption<T> =
  OperationRequestBodyContent<T> extends never
    ? { body?: never }
    : undefined extends OperationRequestBodyContent<T>
      ? { body?: OperationRequestBodyContent<T> }
      : { body: OperationRequestBodyContent<T> }

/* type b = { a: number; b: string; c: boolean };
type c = { a: string };
type MergeTypes<T, U> = Pick<T, Exclude<keyof T, keyof U>> & U;
type Overwrite<T, U> = Omit<T, keyof U> & U;
type d = MergeTypes<b, c>;
type e = Overwrite<b, c>;
// type d = Partial<{a: number}> & {a:string}
type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;
const fetch = ofetch.create({
  // 请求钩子，用来fix path.
  onRequest(context) {
    const { request } = context;
    // 我们想办法给options 另外加一些东西
    const { options } = context;
    // 重新筛选request.
  },
}) */
type ResponseType = NonNullable<FetchOptions['responseType']>

type BodyType<T = unknown> = {
  json: T
  text: Awaited<ReturnType<Response['text']>>
  blob: Awaited<ReturnType<Response['blob']>>
  arrayBuffer: Awaited<ReturnType<Response['arrayBuffer']>>
  stream: Response['body']
}

export type ApiResponseType<T, Media extends MediaType> = SuccessResponse<ResponseObjectMap<T>, Media>

// FilterKeys<
//   SuccessResponse<ResponseObjectMap<T>, Media>,
//   MediaType
// >
export type MaybeOptionalInit<P, M extends HttpMethod, R extends ResponseType = ResponseType> =
  HasRequiredKeys<MyOfetchOptions<P, M, R>> extends never
    ? MyOfetchOptions<P, M, R> | undefined
    : MyOfetchOptions<P, M, R>

export type MyOfetchOptions<P, M extends HttpMethod, R extends ResponseType = ResponseType> = Omit<
  FetchOptions<R>,
  'query' | 'params' | 'body' | 'method' | 'responseType'
> & {
  method?: M
  responseType?: R
} & ParamsOption<FilterKeys<P, M>> &
  RequestBodyOption<FilterKeys<P, M>>

export type ClientMethod<
  Paths extends Record<string, Record<HttpMethod, {}>>,
  M extends HttpMethod,
  Media extends MediaType,
> = <R extends ResponseType = 'json', P extends PathsWithMethod<Paths, M> = PathsWithMethod<Paths, M>>(
  url: P,
  init?: MaybeOptionalInit<Paths[P], M, R>,
) => ReturnType<typeof ofetch<ApiResponseType<FilterKeys<Paths[P], M>, Media>, R>>

export interface OpenApiOfetchClient<Paths extends {}, Media extends MediaType = MediaType> {
  Request: <M extends HttpMethod, P extends PathsWithMethod<Paths, M>, R extends ResponseType = 'json'>(
    url: P,
    init: MaybeOptionalInit<Paths[P], M, R>,
  ) => ReturnType<typeof ofetch<ApiResponseType<FilterKeys<Paths[P], M>, Media>, R>>
  GET: ClientMethod<Paths, 'get', Media>
  POST: ClientMethod<Paths, 'post', Media>
  PATCH: ClientMethod<Paths, 'patch', Media>
  DELETE: ClientMethod<Paths, 'delete', Media>
}

export default function createClient<Paths extends object>(fetch: $Fetch): OpenApiOfetchClient<Paths> {
  const client = (path: string, options?: any) => {
    // 修复path.
    let finalUrl = path
    if (options?.path) {
      // 将path中的参数替换到url中. by rfc6750
      const template = parseTemplate(path)
      finalUrl = template.expand(options.path)
    }
    return fetch(finalUrl, options as any)
  }
  return {
    Request: <M extends HttpMethod, P extends PathsWithMethod<Paths, M>, R extends ResponseType = 'json'>(
      url: P,
      init: MaybeOptionalInit<Paths[P], M, R>,
    ) => client(url as string, init as any),
    GET: (url, init) => client(url as string, init),
    POST: (url, init) => client(url as string, { ...init, method: 'post' }),
    PATCH: (url, init) => client(url as string, { ...init, method: 'patch' }),
    DELETE: (url, init) => client(url as string, { ...init, method: 'delete' }),
  }
}
