import { Loader2 } from 'lucide-react'
import Modal from './Modal.jsx'
import { btnDanger, btnSecondary } from '../lib/ui.js'

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  loading = false,
  danger = true,
  onConfirm,
  onClose,
}) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={loading ? () => {} : onClose}
      size="sm"
      footer={
        <>
          <button type="button" onClick={onClose} className={btnSecondary} disabled={loading}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={danger ? btnDanger : 'inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60'}
            disabled={loading}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-slate-600 dark:text-slate-300">{description}</p>
    </Modal>
  )
}
