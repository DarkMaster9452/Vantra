'use client'

import type { ReactNode } from 'react'
import Modal from './Modal'
import s from './vantra.module.css'

export default function ConfirmDialog({ icon, title, message, cancelLabel, confirmLabel, busy, error, onCancel, onConfirm }: {
  icon?: ReactNode
  title: string
  message: ReactNode
  cancelLabel: string
  confirmLabel: string
  busy?: boolean
  error?: string | null
  onCancel: () => void
  onConfirm: () => void
}) {
  return <Modal onClose={onCancel} closable={!busy} labelledBy="confirm-heading" className={s.confirmPanel}>
    {icon}
    <h2 id="confirm-heading">{title}</h2>
    <p>{message}</p>
    {error && <p role="alert" className={s.confirmError}>{error}</p>}
    <div><button data-autofocus className={s.secondary} disabled={busy} onClick={onCancel}>{cancelLabel}</button><button className={s.primary} disabled={busy} onClick={onConfirm}>{confirmLabel}</button></div>
  </Modal>
}
