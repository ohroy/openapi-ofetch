# openapi-ofetch

## 安装
```
bun add openapi-ofetch
```
## 使用

先使用 https://github.com/openapi-ts/openapi-typescript 生成schema.d.ts，其余见下面例子

## 例子
```
import { ofetch } from 'ofetch';
import useAuthStore from '@/hooks/useAuthStore';
import createClient from './OpenapiOfetch';
import { paths } from './schema';

const httpClient = ofetch.create({
  baseURL: import.meta.env.VITE_API_HOST.trim(),
  retryStatusCodes: [401],
  async onRequest(context) {
    const { options } = context;
    const info = useAuthStore.getState();
    // todo: try to prevent expired token. and refresh them,
    options.headers = new Headers(options.headers);
    if (info.token) {
      options.headers.set('Authorization', `Bearer ${info.token}`);
    }
  },
  async onResponseError(context) {
    const { request, response, options } = context;
    // Log error
    const info = useAuthStore.getState();
    if (response.status === 401) {
      // 更改用户状态.
      // 我们要刷新用户的token
      const refreshResp = await fetch(`${import.meta.env.VITE_API_HOST}/auth/refresh`, {
        headers: {
          Authorization: `Bearer ${info.refreshToken}`,
        },
        method: 'post',
      });
      const refreshJson = await refreshResp.json();
      //
      info.onLogin(refreshJson);
      /*       // 执行完毕后，我们需要重新发送原本的请求
      const tempResponse = await httpClient(request, options);
      context.response = tempResponse */
    }
  },
});

// ok done.
export const apiClient = createClient<paths>(httpClient);
```