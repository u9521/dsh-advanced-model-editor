import * as React from 'react'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import type { ModelProfile, RpcEnvelope } from '../types.ts'
import { formatCapacity, responseMessage, tr, valueOf } from '../utils.ts'

export interface DiscoveryProbe {
  clientApi: {
    llm: {
      discoverModels(input: unknown): Promise<RpcEnvelope>
    }
  }
  settingsNs?: string
  provider?: string
  baseURL?: string
  api?: string
  apiKey?: string
}

export interface DiscoveredModel {
  id?: string
  name?: string
  description?: string
  contextWindow?: number
  maxTokens?: number
}

export interface ModelDiscoveryDialogProps {
  probe: DiscoveryProbe
  existing: Set<string>
  onApply: (models: ModelProfile[]) => void
  onClose: () => void
}

const e = React.createElement

export function ModelDiscoveryDialog({
  probe,
  existing,
  onApply,
  onClose,
}: ModelDiscoveryDialogProps): React.ReactNode {
  const [status, setStatus] = React.useState('loading')
  const [candidates, setCandidates] = React.useState<DiscoveredModel[]>([])
  const [picked, setPicked] = React.useState<Set<string>>(() => new Set())
  const [query, setQuery] = React.useState('')
  const [failure, setFailure] = React.useState('')
  React.useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const request: {
          settingsNs: string
          provider?: string
          baseURL?: string
          api?: string
          apiKey?: string
        } = { settingsNs: probe.settingsNs || 'llm-pi-ai' }
        if (probe.provider) request.provider = probe.provider
        if (probe.baseURL) request.baseURL = probe.baseURL
        if (probe.api) request.api = probe.api
        if (probe.apiKey) request.apiKey = probe.apiKey
        const response = valueOf<{ models?: DiscoveredModel[] }>(
          await probe.clientApi.llm.discoverModels(request),
        )
        if (active) {
          setCandidates(Array.isArray(response.models) ? response.models : [])
          setStatus('ready')
        }
      } catch (error) {
        if (active) {
          setFailure(responseMessage(error))
          setStatus('error')
        }
      }
    }
    load()
    return () => {
      active = false
    }
  }, [])
  const needle = query.trim().toLowerCase()
  const filtered = candidates.filter(
    (candidate) =>
      !needle ||
      String(candidate.id).toLowerCase().includes(needle) ||
      String(candidate.name || '')
        .toLowerCase()
        .includes(needle),
  )
  // Only models that are not already configured can be added.
  const selectable = filtered.filter(
    (candidate) => !existing.has(candidate.id ?? ''),
  )
  const allSelected =
    selectable.length > 0 &&
    selectable.every((candidate) => picked.has(candidate.id ?? ''))
  const toggleAll = () =>
    setPicked((current) => {
      const next = new Set(current)
      if (allSelected)
        selectable.forEach((candidate) => next.delete(candidate.id ?? ''))
      else selectable.forEach((candidate) => next.add(candidate.id ?? ''))
      return next
    })
  const selected = selectable.filter((candidate) =>
    picked.has(candidate.id ?? ''),
  )
  const footer = e(
    'div',
    { className: 'dsh-ma-actions' },
    e(
      'button',
      { type: 'button', className: 'dsh-ma-button', onClick: onClose },
      tr('models.discovery.cancel'),
    ),
    e(
      'button',
      {
        type: 'button',
        className: 'dsh-ma-button dsh-ma-primary',
        disabled: selected.length === 0,
        onClick: () => onApply(selected),
      },
      tr(
        selected.length > 0
          ? 'models.discovery.confirm'
          : 'models.discovery.pickRequired',
        { count: selected.length },
      ),
    ),
  )
  return e(
    primitives.Modal,
    {
      open: true,
      onClose,
      title: tr('models.discovery.title'),
      closeLabel: tr('models.discovery.close'),
      description: tr('models.discovery.description'),
      footer,
    },
    status === 'loading'
      ? e('p', { className: 'dsh-ma-status' }, tr('models.discovery.loading'))
      : null,
    status === 'error'
      ? e(
          'p',
          { className: 'dsh-ma-status dsh-ma-error', role: 'alert' },
          failure,
        )
      : null,
    status === 'ready'
      ? e(
          'div',
          { className: 'dsh-ma-group' },
          e('input', {
            className: 'dsh-ma-input',
            type: 'search',
            value: query,
            placeholder: tr('models.discovery.searchPlaceholder'),
            'aria-label': tr('models.discovery.searchLabel'),
            onChange: (event) => setQuery(event.target.value),
          }),
          e(
            'label',
            { className: 'dsh-ma-check' },
            e('input', {
              type: 'checkbox',
              checked: allSelected,
              disabled: selectable.length === 0,
              onChange: toggleAll,
            }),
            tr('models.discovery.selectFiltered'),
          ),
          e(
            'div',
            { className: 'dsh-ma-models' },
            filtered.map((candidate) => {
              const exists = existing.has(candidate.id ?? '')
              return e(
                'label',
                {
                  key: candidate.id,
                  className: 'dsh-ma-check',
                  style: exists ? { opacity: 0.45 } : undefined,
                },
                e('input', {
                  type: 'checkbox',
                  checked: picked.has(candidate.id ?? ''),
                  disabled: exists,
                  onChange: () =>
                    setPicked((current) => {
                      const next = new Set(current)
                      if (!next.delete(candidate.id ?? ''))
                        next.add(candidate.id ?? '')
                      return next
                    }),
                }),
                e(
                  'span',
                  null,
                  candidate.name
                    ? `${candidate.name} (${candidate.id})`
                    : candidate.id,
                ),
                typeof candidate.contextWindow === 'number' ||
                  typeof candidate.maxTokens === 'number'
                  ? e(
                      'span',
                      { className: 'dsh-ma-route' },
                      [
                        typeof candidate.contextWindow === 'number'
                          ? tr('models.discovery.contextWindow', {
                              value: formatCapacity(candidate.contextWindow),
                            })
                          : null,
                        typeof candidate.maxTokens === 'number'
                          ? tr('models.discovery.maxTokens', {
                              value: formatCapacity(candidate.maxTokens),
                            })
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · '),
                    )
                  : null,
                exists
                  ? e(
                      'span',
                      { className: 'dsh-ma-route' },
                      tr('models.discovery.existing'),
                    )
                  : null,
              )
            }),
          ),
        )
      : null,
  )
}
