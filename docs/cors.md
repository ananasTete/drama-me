
### CORS

CORS（跨域资源共享）是浏览器的安全机制。当浏览器发现 JavaScript 代码要请求一个不同源的地址时（就是后端服务地址和前端服务地址不同），会检查接口响应头中 Access-Control-Allow-Origin 是否包含当前前端服务访问，如果不允许，浏览器会拦截响应。

关键点：CORS 只对浏览器生效，服务端之间通信不受 CORS 限制；不代表浏览器在跨域下直接不发起请求。

### vite proxy

它是 dev server 的功能，它在服务端把请求转发到后端。从浏览器角度看，请求发往的是同源（localhost:5173），所以根本不会触发 CORS。

### 配置 CORS

后端配置响应头： Access-Control-Allow-Origin 来控制允许跨域的前端服务

### 凭证

浏览器在跨域请求下默认不会携带凭证（ cookie、 http 认证信息，不常见后续都用 cookie 来表达凭证），即使通过配置允许跨域。

前端必须在发请求时显式配置 credentials: 'include'(fetch)或 withCredentials: true(axios),否则浏览器默认不会携带 cookie；同时服务端的响应也要携带 Access-Control-Allow-Credentials：true 否则浏览器会拦截这个响应。

### 最佳实践

开发环境：

方案一（更方便）：使用 vite proxy，后端不需要配置 cors，因为不跨域

方案二:后端配置 cors 允许前端本地服务跨域
- 如果不需要 cookie: origin 可以配精确域名,也可以用 *
- 如果需要 cookie: origin 必须配精确域名(如 http://localhost:5173),不能用 *,同时前后端都要开启 credentials 相关配置

生产环境：

通常使用反向代理让前端和后端同源 -> 不会触发跨域，也就不需要任何配置；
跨域部署不同源 -> 后端精确指定 origin + 前后端都要开启 credentials 相关配置

### 预检请求

不会发送预检请求的条件：
- 方法只能是 GET、HEAD、POST 三者之一
- 不能有任何自定义 header
- Content-Type 的值只能是以下三种之一:
 - application/x-www-form-urlencoded
 - multipart/form-data
 - text/plain

不满足简单请求的条件,浏览器一定会先发一个 OPTIONS 预检请求去问服务器是否允许,等服务器明确同意之后,才会真正发出你写的那个业务请求。

如果是预检请求,浏览器会先自动发一个 OPTIONS 请求去"试探"——这个 OPTIONS 请求里会带上 Origin、Access-Control-Request-Method、Access-Control-Request-Headers 等信息,问服务器"我接下来想用这个源、这个方法、这些 header 发请求,你许不许?"
服务器对这个 OPTIONS 请求的响应里返回 Access-Control-Allow-Origin、Access-Control-Allow-Methods、Access-Control-Allow-Headers 等浏览器拿到这些响应头后自己判断是否合法