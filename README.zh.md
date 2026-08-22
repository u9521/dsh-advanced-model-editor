# dsh-advanced-model-editor

一个 DeepSeek Harness WebUI 插件,在「设置」页新增**模型高级设置**区块,用于管理
LLM 提供方配置——覆盖自定义提供方命名空间(`llm-pi-ai`)与官方提供方命名空间
(`llm-deepseek`),包括内置/自定义提供方、模型列表、推理与思考参数、请求头、重试策略等,
并沿用官方设置页的校验与冲突规则。

![界面截图](docs/pics/screenshot.png)

## 快速安装 (推荐 / 一行命令)

直接通过 GitHub `dist` 分支安装(CI 自动构建产物,无需手动克隆或本地编译):

```sh
dsh plugin --profile web add github:u9521/dsh-advanced-model-editor#dist
```

安装后**重启 web**(`dsh web`)并**硬刷新浏览器**(Cmd+Shift+R)即可。插件以**模型高级设置**出现在设置页。

### 升级与卸载

```sh
# 升级到最新 dist 版本
dsh plugin --profile web add github:u9521/dsh-advanced-model-editor#dist

# 卸载
dsh plugin --profile web remove @local/dsh-advanced-model-editor
```

---

## 本地开发与源码构建

### 环境要求

- **务必安装 pnpm**——`npx get-pnpm`(参见 <https://pnpm.io/installation>;也可用
  `corepack enable` 或 `npm install -g pnpm`)。构建与 `dsh plugin --profile web add`
  都需要 pnpm(后者内部会转发给 pnpm 执行)。
- **Node.js** `^22.19 || >=24`。

### 1. 克隆

推荐克隆到 `~/.dsh/plugins/cust-model-editor`:

```sh
git clone https://github.com/u9521/dsh-advanced-model-editor.git ~/.dsh/plugins/cust-model-editor
cd ~/.dsh/plugins/cust-model-editor
```

### 2. 构建

构建产物(`lib/`)不随源码分支提交,本地开发需要自行构建:

```sh
pnpm install
pnpm run build
```

官方 DSH 客户端打包预设已随仓库内置在 `external/deepseek-harness/packages/client/`,
因此不再需要 DSH 源码检出:`pnpm run build` 会用项目自身的依赖依次执行 `tsc`
(类型检查 + 生成 `lib/types/`)和 `tsdown`(打包 `lib/index.js` + `lib/client.js`)。

可用以下命令验证构建:

```sh
pnpm test
```

### 3. 本地安装

```sh
dsh plugin --profile web add ~/.dsh/plugins/cust-model-editor
```

然后**重启 web**(`dsh web`)并**硬刷新浏览器**(Cmd+Shift+R)。

## 开发与维护命令

| 命令 | 说明 |
| :--- | :--- |
| `pnpm run build` | 完整构建(`tsc` 类型检查 + 生成 `lib/` 产物) |
| `pnpm run check` | 仅类型检查(`tsc --noEmit`),不产出文件 |
| `pnpm test` | 先完整构建,再运行测试套件(`node --test`) |
| `pnpm run fmt` | 用 Prettier 格式化源码与配置文件 |
| `pnpm run fmt:check` | 检查代码格式是否符合规范 |
| `pnpm run sync` | 从上游同步内置的 DSH 客户端打包预设(`--check` 或 `--yes`) |

## 本地源码升级 / 卸载

```sh
# 拉取新代码,重新构建,再重新 add
git -C ~/.dsh/plugins/cust-model-editor pull
cd ~/.dsh/plugins/cust-model-editor && pnpm run build
dsh plugin --profile web add ~/.dsh/plugins/cust-model-editor

# 卸载
dsh plugin --profile web remove @local/dsh-advanced-model-editor
```

之后重启 web 并硬刷新浏览器。

## 许可证

[MIT](LICENSE)
