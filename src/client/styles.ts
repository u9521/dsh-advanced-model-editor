export const CSS = `
      .dsh-ma-page{box-sizing:border-box;color:var(--dsw-alias-label-primary);display:flex;flex-direction:column;gap:12px;max-width:880px;padding-bottom:24px;width:100%}
      .dsh-ma-page *{box-sizing:border-box;letter-spacing:0}
      .dsh-ma-header{align-items:center;display:flex;gap:12px;justify-content:space-between}
      .dsh-ma-title{color:var(--dsw-alias-label-primary);font-size:16px;font-weight:600;line-height:24px;margin:0}
      .dsh-ma-toolbar,.dsh-ma-actions{align-items:center;display:flex;gap:8px}
      .dsh-ma-button{align-items:center;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:6px;color:var(--dsw-alias-label-primary);cursor:pointer;display:inline-flex;font:inherit;font-size:13px;gap:5px;height:32px;justify-content:center;line-height:20px;min-width:32px;padding:0 10px}
      .dsh-ma-button:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-brand-primary)}
      .dsh-ma-button:focus-visible,.dsh-ma-input:focus-visible,.dsh-ma-select:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
      .dsh-ma-button:disabled,.dsh-ma-input:disabled,.dsh-ma-select:disabled{cursor:not-allowed;opacity:.55}
      .dsh-ma-primary{background:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary-foreground)}
      .dsh-ma-primary:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover,var(--dsw-alias-brand-primary));border-color:var(--dsw-alias-button-primary-hover,var(--dsw-alias-brand-primary))}
      .dsh-ma-icon{padding:0;width:32px}
      .dsh-ma-status{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;margin:0}
      .dsh-ma-error{color:var(--dsw-alias-state-error-primary)}
      .dsh-ma-success{color:var(--dsw-alias-state-success-primary)}
      .dsh-ma-notice{background:var(--dsw-alias-bg-layer-2);border-left:3px solid var(--dsw-alias-state-warn-primary);color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;padding:8px 10px}
      .dsh-ma-list,.dsh-ma-form{display:flex;flex-direction:column}
      .dsh-ma-section-title{color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:600;line-height:18px;margin:18px 0 4px}
      .dsh-ma-section-title:first-child{margin-top:0}
      .dsh-ma-provider{border-bottom:1px solid var(--dsw-alias-border-l1)}
      .dsh-ma-provider-head{align-items:center;display:flex;gap:10px;min-height:54px;padding:10px 2px}
      .dsh-ma-identity{align-items:center;display:flex;flex:1;gap:8px;min-width:0}
      .dsh-ma-name{font-size:14px;font-weight:600;line-height:20px;overflow-wrap:anywhere}
      .dsh-ma-route{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;overflow-wrap:anywhere}
      .dsh-ma-tag{border:1px solid var(--dsw-alias-border-l2);border-radius:4px;color:var(--dsw-alias-label-secondary);font-size:11px;line-height:16px;padding:1px 6px}
      .dsh-ma-form{padding:4px 0 18px}
      .dsh-ma-group{border-top:1px solid var(--dsw-alias-border-l1);display:flex;flex-direction:column;gap:10px;padding:14px 2px}
      .dsh-ma-group:first-child{border-top:0}
      .dsh-ma-group-title{color:var(--dsw-alias-label-primary);font-size:13px;font-weight:600;line-height:20px;margin:0}
      .dsh-ma-grid{display:grid;gap:10px 12px;grid-template-columns:repeat(2,minmax(0,1fr))}
      .dsh-ma-grid-3{grid-template-columns:repeat(3,minmax(0,1fr))}
      .dsh-ma-wide{grid-column:1/-1}
      .dsh-ma-field{display:flex;flex-direction:column;gap:5px;min-width:0}
      .dsh-ma-field-label{align-items:center;color:var(--dsw-alias-label-secondary);display:flex;font-size:12px;gap:6px;line-height:18px;min-height:20px}
      .dsh-ma-override,.dsh-ma-check input{accent-color:var(--dsw-alias-brand-primary);margin:0}
      .dsh-ma-input,.dsh-ma-select{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:6px;color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;height:34px;line-height:20px;padding:0 9px;width:100%}
      .dsh-ma-input::placeholder{color:var(--dsw-alias-label-secondary)}
      .dsh-ma-input:disabled,.dsh-ma-select:disabled{background:var(--dsw-alias-bg-layer-2)}
      .dsh-ma-checks{align-items:center;display:flex;flex-wrap:wrap;gap:8px 16px;min-height:34px}
      .dsh-ma-check{align-items:center;color:var(--dsw-alias-label-secondary);display:inline-flex;font-size:12px;gap:6px}
      .dsh-ma-kv{display:grid;gap:8px;grid-template-columns:minmax(120px,.8fr) minmax(180px,1.2fr) 32px;margin-top:6px}
      .dsh-ma-actions{border-top:1px solid var(--dsw-alias-border-l1);justify-content:flex-end;padding:14px 2px 0}
      .dsh-ma-create{border-bottom:1px solid var(--dsw-alias-border-l1);display:flex;flex-direction:column;gap:12px;padding:0 2px 16px}
      .dsh-ma-delete-confirm{background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-state-warn-primary);border-radius:6px;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;margin:0 2px 12px;padding:10px}
      .dsh-ma-delete-confirm p{margin:0}
      .dsh-ma-delete-confirm .dsh-ma-actions{border-top:0;padding-top:8px}
      .dsh-ma-models{display:flex;flex-direction:column;gap:6px;max-height:360px;overflow:auto}
      .dsh-ma-model{border-top:1px solid var(--dsw-alias-border-l1);display:flex;flex-direction:column;gap:10px;padding:12px 0}
      .dsh-ma-model:first-child{border-top:0}
      .dsh-ma-model-head{align-items:center;display:flex;gap:10px;justify-content:space-between}
      .dsh-ma-model-title{color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:600;line-height:18px;overflow-wrap:anywhere}
      .dsh-ma-subgrid{display:grid;gap:8px;grid-template-columns:repeat(4,minmax(0,1fr))}
      .dsh-ma-modal-body{display:flex;flex-direction:column;gap:12px;min-width:min(520px,calc(100vw - 48px))}
      .dsh-ma-card{background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);border-radius:6px;display:flex;flex-direction:column;margin-top:2px;overflow:hidden;width:100%}
      .dsh-ma-card-head{align-items:center;background:transparent;border:0;color:var(--dsw-alias-label-primary);cursor:pointer;display:flex;font:inherit;gap:8px;justify-content:space-between;min-height:36px;padding:6px 10px;text-align:left;user-select:none;width:100%}
      .dsh-ma-card-head:hover{background:var(--dsw-alias-bg-layer-1)}
      .dsh-ma-card-title{align-items:center;display:inline-flex;font-size:12px;font-weight:600;gap:8px;line-height:18px}
      .dsh-ma-card-body{border-top:1px solid var(--dsw-alias-border-l1);padding:10px}
      @media(max-width:720px){.dsh-ma-grid,.dsh-ma-grid-3,.dsh-ma-subgrid{grid-template-columns:1fr}.dsh-ma-wide{grid-column:auto}.dsh-ma-kv{grid-template-columns:minmax(0,1fr) minmax(0,1fr) 32px}.dsh-ma-provider-head{align-items:flex-start;flex-wrap:wrap}}
`
