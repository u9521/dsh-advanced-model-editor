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
  // The settings shell renders a nav glyph per section id and falls back to the
  // gear for ids it does not know (model-advanced is not known), so the nav
  // icon is swapped for this plugin's mark after the panel paints.
  const makeMarkSvg = () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('viewBox', '0 0 24 24')
    svg.setAttribute('fill', 'none')
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', MARK_PATH)
    path.setAttribute('stroke', 'currentColor')
    path.setAttribute('stroke-width', String(MARK_STROKE))
    path.setAttribute('stroke-linecap', 'round')
    path.setAttribute('stroke-linejoin', 'round')
    svg.appendChild(path)
    return svg
  }
  const swapNavIcon = () => {
    const label = tr('nav')
    for (const button of document.querySelectorAll('button')) {
      const span = button.querySelector('span')
      if (!span || span.textContent !== label) continue
      const icon = button.querySelector('svg')
      if (!icon || icon.dataset.dshMaIcon === 'mark') continue
      const mark = makeMarkSvg()
      for (const name of ['width', 'height', 'class']) {
        const value = icon.getAttribute(name)
        if (value !== null) mark.setAttribute(name, value)
      }
      mark.dataset.dshMaIcon = 'mark'
      icon.replaceWith(mark)
    }
  }
  ctx.effect(() => {
    swapNavIcon()
    let frame = 0
    const observer = new MutationObserver(() => {
      if (frame !== 0) return
      frame = requestAnimationFrame(() => {
        frame = 0
        if (document.querySelector('[role="dialog"]') !== null) swapNavIcon()
      })
    })
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, 'model-advanced: nav icon')
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
              })
            },
          ),
        ),
      ),
    'model-advanced: settings section',
  )
}
