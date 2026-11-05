import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Loader2,
  Pencil,
  Plus,
  Tags,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { api } from '../api.js'
import Modal from '../components/Modal.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import EmptyState from '../components/EmptyState.jsx'
import Badge from '../components/Badge.jsx'
import { useToast } from '../contexts/ToastContext.jsx'
import {
  btnPrimary,
  btnSecondary,
  iconButton,
  inputClass,
  labelClass,
  selectClass,
} from '../lib/ui.js'

function CategoryGroup({ title, description, icon: Icon, tone, categories, onEdit, onDelete, onAdd }) {
  const toneClasses = {
    income: {
      icon: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
      dot: 'bg-emerald-500',
    },
    expense: {
      icon: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
      dot: 'bg-rose-500',
    },
  }[tone]

  return (
    <div className="card flex flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneClasses.icon}`}>
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold">{title}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="neutral">{categories.length}</Badge>
          <button
            type="button"
            onClick={onAdd}
            className={iconButton}
            title={`Nova categoria de ${title.toLowerCase()}`}
            aria-label={`Nova categoria de ${title.toLowerCase()}`}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {categories.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="Nenhuma categoria"
          description={`Cadastre categorias de ${title.toLowerCase()} para organizar seus lançamentos.`}
        />
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {categories.map((category) => (
            <li
              key={category.id}
              className="flex items-center justify-between gap-3 px-5 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className={`h-2 w-2 shrink-0 rounded-full ${toneClasses.dot}`} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                    {category.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {category.usageCount === 0
                      ? 'Não utilizada'
                      : `${category.usageCount} lançamento${category.usageCount === 1 ? '' : 's'}`}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => onEdit(category)}
                  className={iconButton}
                  title="Editar categoria"
                  aria-label="Editar categoria"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(category)}
                  disabled={category.usageCount > 0}
                  className={`${iconButton} hover:text-rose-600 disabled:hover:bg-transparent dark:hover:text-rose-400`}
                  title={
                    category.usageCount > 0
                      ? 'Categoria em uso não pode ser excluída'
                      : 'Excluir categoria'
                  }
                  aria-label="Excluir categoria"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function Categories() {
  const toast = useToast()
  const formId = useId()

  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [name, setName] = useState('')
  const [type, setType] = useState('expense')
  const [formError, setFormError] = useState('')

  const [deleting, setDeleting] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setCategories(await api.categories.list())
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const income = useMemo(() => categories.filter((item) => item.type === 'income'), [categories])
  const expense = useMemo(() => categories.filter((item) => item.type === 'expense'), [categories])

  function openNew(defaultType) {
    setEditing(null)
    setName('')
    setType(defaultType)
    setFormError('')
    setFormOpen(true)
  }

  function openEdit(category) {
    setEditing(category)
    setName(category.name)
    setType(category.type)
    setFormError('')
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditing(null)
    setFormError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')

    if (!name.trim()) {
      setFormError('Informe o nome da categoria.')
      return
    }

    setSaving(true)
    try {
      if (editing) {
        await api.categories.update(editing.id, { name: name.trim(), type })
        toast.success('Categoria atualizada.')
      } else {
        await api.categories.create({ name: name.trim(), type })
        toast.success('Categoria criada.')
      }
      closeForm()
      await load()
    } catch (requestError) {
      setFormError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleting) return
    setSaving(true)
    try {
      await api.categories.remove(deleting.id)
      toast.success('Categoria excluída.')
      setDeleting(null)
      await load()
    } catch (requestError) {
      toast.error(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Categorias</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Organize receitas e despesas com categorias personalizadas.
          </p>
        </div>
        <button type="button" onClick={() => openNew('expense')} className={btnPrimary}>
          <Plus className="h-4 w-4" />
          Nova categoria
        </button>
      </div>

      {error && (
        <div className="card flex flex-col items-center gap-3 p-8 text-center">
          <AlertTriangle className="h-8 w-8 text-rose-500" />
          <p className="text-sm text-slate-500 dark:text-slate-400">{error}</p>
          <button type="button" onClick={load} className={btnSecondary}>
            Tentar novamente
          </button>
        </div>
      )}

      {!error && loading && (
        <div className="grid gap-5 lg:grid-cols-2">
          {[0, 1].map((item) => (
            <div
              key={item}
              className="card h-[320px] animate-pulse bg-slate-200/60 dark:bg-slate-800/60"
            />
          ))}
        </div>
      )}

      {!error && !loading && (
        <div className="grid items-start gap-5 lg:grid-cols-2">
          <CategoryGroup
            title="Receitas"
            description="Entradas e ganhos"
            icon={TrendingUp}
            tone="income"
            categories={income}
            onAdd={() => openNew('income')}
            onEdit={openEdit}
            onDelete={setDeleting}
          />
          <CategoryGroup
            title="Despesas"
            description="Saídas e gastos"
            icon={TrendingDown}
            tone="expense"
            categories={expense}
            onAdd={() => openNew('expense')}
            onEdit={openEdit}
            onDelete={setDeleting}
          />
        </div>
      )}

      <Modal
        open={formOpen}
        title={editing ? 'Editar categoria' : 'Nova categoria'}
        description={
          editing
            ? 'Altere o nome ou o tipo da categoria.'
            : 'Crie uma categoria para organizar seus lançamentos.'
        }
        onClose={saving ? () => {} : closeForm}
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={closeForm}
              className={btnSecondary}
              disabled={saving}
            >
              Cancelar
            </button>
            <button type="submit" form={formId} className={btnPrimary} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? 'Salvar alterações' : 'Criar categoria'}
            </button>
          </>
        }
      >
        <form id={formId} onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
              {formError}
            </div>
          )}

          <div>
            <label htmlFor={`${formId}-name`} className={labelClass}>
              Nome
            </label>
            <input
              id={`${formId}-name`}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={inputClass}
              placeholder="Ex.: Alimentação, Salário..."
              maxLength={60}
              autoFocus
            />
          </div>

          <div>
            <label htmlFor={`${formId}-type`} className={labelClass}>
              Tipo
            </label>
            <select
              id={`${formId}-type`}
              value={type}
              onChange={(event) => setType(event.target.value)}
              className={selectClass}
              disabled={Boolean(editing && editing.usageCount > 0)}
            >
              <option value="expense">Despesa</option>
              <option value="income">Receita</option>
            </select>
            {editing && editing.usageCount > 0 && (
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                O tipo não pode ser alterado porque a categoria já está em uso.
              </p>
            )}
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Excluir categoria?"
        description={`A categoria "${deleting?.name ?? ''}" será removida permanentemente.`}
        confirmLabel="Excluir"
        loading={saving}
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  )
}
