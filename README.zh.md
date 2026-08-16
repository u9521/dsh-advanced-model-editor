# dsh-advanced-model-editor

一个 DeepSeek Harness WebUI 插件,在「设置」页新增**模型高级设置**区块,用于管理
LLM 提供方配置——覆盖自定义提供方命名空间(`llm-pi-ai`)与官方提供方命名空间
(`llm-deepseek`),包括内置/自定义提供方、模型列表、推理与思考参数、请求头、重试策略等,
并沿用官方设置页的校验与冲突规则。

## 环境要求

- **全局安装 DSH**——`npm install -g @deepseek-ai/dsh`。建议使用全局安装而不是
  `npx`:构建脚本通过 PATH 上的 `dsh` 命令定位安装目录,安装命令也需要稳定的全局命令。
- **务必安装 pnpm**——`npx get-pnpm`(参见 <https://pnpm.io/installation>;也可用
  `corepack enable` 或 `npm install -g pnpm`)。这是必需的:
  `dsh plugin --profile web add` 内部会转发给 pnpm 执行,没有 pnpm 会失败。
- **Node.js 20+** 与 npm。

## 1. 克隆

推荐克隆到 `~/.dsh/plugins/cust-model-editor`:

```sh
git clone https://github.com/u9521/dsh-advanced-model-editor.git ~/.dsh/plugins/cust-model-editor
cd ~/.dsh/plugins/cust-model-editor
```

## 2. 构建

构建产物(`lib/`)不随仓库提交,需要自行构建:

```sh
npm install
npm run build
```

构建需要 PATH 上有全局 `dsh` 命令(推荐),或通过 `DSH_CHECKOUT=/path/to/dsh-checkout`
指定 DSH 源码检出。构建生成 `lib/index.js`、`lib/client.js` 和 `lib/types/`。

可用以下命令验证构建:

```sh
npm test
```

## 3. 安装

```sh
dsh plugin --profile web add ~/.dsh/plugins/cust-model-editor
```

然后**重启 web**(`dsh web`)并**硬刷新浏览器**(Cmd+Shift+R)。插件以**模型高级设置**
出现在设置页。

## 升级 / 卸载

```sh
# 拉取新代码,重新构建,再重新 add
git -C ~/.dsh/plugins/cust-model-editor pull
cd ~/.dsh/plugins/cust-model-editor && npm run build
dsh plugin --profile web add ~/.dsh/plugins/cust-model-editor

# 卸载
dsh plugin --profile web remove @local/dsh-advanced-model-editor
```

之后重启 web 并硬刷新浏览器。

## 许可证

[MIT](LICENSE)

