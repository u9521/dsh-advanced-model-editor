const checkout = process.env.DSH_CHECKOUT
if (checkout === undefined) {
  throw new Error('DSH_CHECKOUT is required; run `npm run build`')
}

const { clientBundle } = await import(`${checkout}/packages/client/tsdown.client.ts`)

export default clientBundle('@local/dsh-advanced-model-editor', [
  'lib/types/index.js',
])
