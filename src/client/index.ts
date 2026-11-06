import * as React from 'react'
import { createModelApi } from './api.ts'
import { adoptSchemaChoices } from './choices.ts'
import { LOCALE_NS, OFFICIAL_NS, SETTINGS_NS } from './constants.ts'
import { MARK_PATH, MARK_STROKE } from './icon.ts'
import { en, flattenDictionary, zh } from './locales/index.ts'
import * as page from './page.ts'
import type { SettingsServices } from './settings.ts'
import { namespaceView } from './settings.ts'
import { CSS } from './styles.ts'
import { setTranslator, tr } from './i18n.ts'

const e = React.createElement
const NS = LOCALE_NS

export const inject = [
  'slots',
  'locale',
  'remote',
  'remote.credentials',
  'remote.llm',
  'configForms',
  'settingsSchema',
]
export function apply(ctx: any) {
  ctx.effect(
    () =>
      ctx.locale.register(NS, {
        zh: flattenDictionary(zh),
        en: flattenDictionary(en),
      }),
    'model-advanced: locale',
  )
  const bindTranslator = () => setTranslator(ctx.locale.bind(NS))
  bindTranslator()
  ctx.effect(
    () => ctx.locale.subscribe(bindTranslator),
    'model-advanced: locale updates',
  )
  ctx.effect(() => {
    const style = document.createElement('style')
    style.dataset.plugin = '@local/dsh-advanced-model-editor'
    style.textContent = CSS
    document.head.appendChild(style)
    return () => style.remove()
  }, 'model-advanced: styles')
  // The shell renders one nav glyph per section and keeps its own default for
  // ids it has no glyph for; `settings.section.icon` replaces that glyph for the
  // matching section id without this plugin reaching into the shell's DOM.
  ctx.effect(
    () =>
      ctx.slots.inject('settings.section.icon', () =>
        ctx.slots.register(
          {
            name: 'settings.section.icon',
            // The shell addresses the glyph by section id, so this must equal
            // the `settings.section` id below; an unmatched id never renders.
            id: 'model-advanced',
            order: 11,
          },
          function NavMark({ size }: { size: number }) {
            return e(
              'svg',
              {
                viewBox: '0 0 24 24',
                width: size,
                height: size,
                fill: 'none',
                'aria-hidden': 'true',
              },
              e('path', {
                d: MARK_PATH,
                stroke: 'currentColor',
                strokeWidth: MARK_STROKE,
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
              }),
            )
          },
        ),
      ),
    'model-advanced: nav icon',
  )
  const api = createModelApi(ctx)
  const services: SettingsServices = {
    configForms: ctx.configForms,
    settingsSchema: ctx.settingsSchema,
  }
  const describe = ctx.configForms.describe()
  const adopt = () => {
    adoptSchemaChoices(ctx.settingsSchema, {
      llmPiAi: namespaceView(describe, SETTINGS_NS),
      llmDeepSeek: namespaceView(describe, OFFICIAL_NS),
    })
  }
  adopt()
  ctx.effect(() => describe.subscribe(adopt), 'model-advanced: schema choices')
  // The mirror refreshes itself on `settings/document-updated`; the page
  // re-reads the directory and credentials whenever a describe answer lands.
  // These three pushes change facts the mirror does not own, so they ask for a
  // fresh answer instead of re-reading only the settings document.
  ctx.effect(() => {
    const disposers = [
      ctx.remote.$on(
        'credentials/reference-updated',
        () => void describe.ensure(),
      ),
      ctx.remote.$on(
        'credentials/record-updated',
        () => void describe.ensure(),
      ),
      ctx.remote.$on('llm/adapters-updated', () => void describe.ensure()),
      // A provider's advertised models or display metadata changed. The
      // official route reloads its listing in the background, so the page
      // re-reads the same describe answer a selector would.
      ctx.remote.$on('llm/models-updated', () => void describe.ensure()),
      ctx.on('connection/reset', () => void describe.ensure()),
    ]
    return () => {
      for (const dispose of disposers) dispose()
    }
  }, 'model-advanced: invalidations')
  // The section exists only while one of its namespaces is served: a
  // deployment without either LLM adapter plugin shows no empty page, and the
  // registration appears as soon as the adapter is composed.
  ctx.effect(
    () =>
      ctx.configForms.whileServed([SETTINGS_NS, OFFICIAL_NS], () =>
        ctx.slots.inject('settings.section', () =>
          ctx.slots.register(
            {
              name: 'settings.section',
              id: 'model-advanced',
              order: 11,
              label: () => tr('nav'),
            },
            function Page() {
              return e(page.LocalePage, {
                locale: ctx.locale,
                api,
                describe,
                configForms: services.configForms,
                settingsSchema: services.settingsSchema,
              })
            },
          ),
        ),
      ),
    'model-advanced: settings section',
  )
}
