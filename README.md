# dsh-advanced-model-editor

A DeepSeek Harness WebUI plugin that adds an **Advanced Model Settings** section to the
Settings page. It manages LLM provider profiles across the settings namespaces — the
custom provider namespace (`llm-pi-ai`) and the official provider namespace
(`llm-deepseek`) — including built-in and custom providers, model lists,
reasoning/thinking options, headers, retry policy and more, with the same validation
and conflict rules as the official settings UI.

## Prerequisites

- **DSH installed globally** — `npm install -g @deepseek-ai/dsh`. Use the global
  installation rather than `npx`: the build resolves the `dsh` launcher from PATH, and
  the install command must be a stable global command.
- **pnpm installed** — `npx get-pnpm` (see https://pnpm.io/installation; alternatives:
  `corepack enable` or `npm install -g pnpm`). This is required:
  `dsh plugin --profile web add` forwards to pnpm internally and fails without it.
- **Node.js 20+** and npm.

## 1. Clone

Clone the repository into the recommended location:

```sh
git clone https://github.com/u9521/dsh-advanced-model-editor.git ~/.dsh/plugins/cust-model-editor
cd ~/.dsh/plugins/cust-model-editor
```

## 2. Build

The build output (`lib/`) is not committed — build it yourself:

```sh
npm install
npm run build
```

The build needs the global `dsh` command on PATH (recommended) or a DSH source checkout
via `DSH_CHECKOUT=/path/to/dsh-checkout`. It produces `lib/index.js`, `lib/client.js`
and `lib/types/`.

Verify the build with:

```sh
npm test
```

## 3. Install

```sh
dsh plugin --profile web add ~/.dsh/plugins/cust-model-editor
```

Then **restart web** (`dsh web`) and **hard-refresh** the browser (Cmd+Shift+R).
The plugin appears as **Advanced Model Settings** (模型高级设置) in Settings.

## Upgrade / Uninstall

```sh
# pull new sources, rebuild, then re-add
git -C ~/.dsh/plugins/cust-model-editor pull
cd ~/.dsh/plugins/cust-model-editor && npm run build
dsh plugin --profile web add ~/.dsh/plugins/cust-model-editor

# uninstall
dsh plugin --profile web remove @local/dsh-advanced-model-editor
```

Restart web and hard-refresh the browser afterwards.

## License

[MIT](LICENSE)

