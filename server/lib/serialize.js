export function serializeCategory(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    usageCount: row.usage_count ?? 0,
    createdAt: row.created_at,
  }
}

export function serializeBill(row, config) {
  return {
    id: row.id,
    description: row.description,
    categoryId: row.category_id ?? null,
    categoryName: row.category_name ?? null,
    amountCents: row.amount_cents,
    dueDate: row.due_date,
    notes: row.notes ?? null,
    status: row.status,
    settledDate: row[config.settledDateColumn] ?? null,
    settledAmountCents: row[config.settledAmountColumn] ?? null,
    recurrenceGroup: row.recurrence_group ?? null,
    createdAt: row.created_at,
  }
}
