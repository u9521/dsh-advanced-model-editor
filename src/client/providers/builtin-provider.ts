import * as React from 'react'
import { SETTINGS_NS } from '../constants.ts'
import { Field } from '../controls/index.ts'
import type { ConfigForm } from '../settings.ts'
import { conflictMessage, writeOps } from '../settings.ts'
import type { ProviderRow } from '../types.ts'
import { tr } from '../i18n.ts'
import { responseMessage } from '../utils.ts'

export interface AddBuiltInProviderProps {
  rows: ProviderRow[]
  form: ConfigForm
  writable: boolean
  reload: () => unknown
  close: () => void
}

const e = React.createElement

export function AddBuiltInProvider({
  rows,
  form,
  writable,
  reload,
  close,
}: AddBuiltInProviderProps) {
  const available = rows.filter(
    (row) => row.declared !== true && !row.userAdded,
  )
  const [provider, setProvider] = React.useState(available[0]?.provider || '')
  const [failure, setFailure] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const selected = available.find((row) => row.provider === provider)
  const submit = async () => {
    if (!selected) {
      setFailure(tr('validation.noBuiltIn'))
      return
    }
    setBusy(true)
    setFailure('')
    try {
      // The shared write queue owns the revision fence; `false` means the
      // Host refused and the mirror was reloaded behind us.
      const accepted = await writeOps(form, [
        {
          op: 'set',
          path: [...selected.settingsPath],
          value: {},
        },
      ])
      if (!accepted) {
        setFailure(conflictMessage())
        return
      }
      await reload()
      close()
    } catch (error) {
      setFailure(responseMessage(error))
    } finally {
      setBusy(false)
    }
  }
  return e(
    'section',
    { className: 'dsh-ma-create', 'data-settings-ns': SETTINGS_NS },
    e('h3', { className: 'dsh-ma-group-title' }, tr('builtin.title')),
    e(
      Field,
      { labelKey: 'field.builtInProvider' },
      e(
        'select',
        {
          className: 'dsh-ma-select',
          value: provider,
          disabled: !writable || busy || !available.length,
          onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
            setProvider(event.target.value),
        },
        available.map((row) =>
          e(
            'option',
            { key: row.provider, value: row.provider },
            row.displayName,
          ),
        ),
      ),
    ),

    failure
      ? e(
          'p',
          { className: 'dsh-ma-status dsh-ma-error', role: 'alert' },
          failure,
        )
      : null,
    e(
      'div',
      { className: 'dsh-ma-actions' },
      e(
        'button',
        {
          type: 'button',
          className: 'dsh-ma-button',
          disabled: busy,
          onClick: close,
        },
        tr('action.cancel'),
      ),
      e(
        'button',
        {
          type: 'button',
          className: 'dsh-ma-button dsh-ma-primary',
          disabled: !writable || busy || !selected,
          onClick: submit,
        },
        tr(busy ? 'action.adding' : 'action.addProvider'),
      ),
    ),
  )
}
