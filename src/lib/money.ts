// Money is stored as integer paisa (100 paisa = Rs. 1) to avoid rounding errors.

const LOCALE = 'en-IN'

export function formatPaisa(paisa: number): string {
  return formatRupees(Number.isFinite(paisa) ? paisa / 100 : 0)
}

export function formatRupees(rupees: number): string {
  const amount = Number.isFinite(rupees) ? rupees : 0
  try {
    return `Rs. ${new Intl.NumberFormat(LOCALE, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)}`
  } catch {
    return `Rs. ${amount.toFixed(2)}`
  }
}
