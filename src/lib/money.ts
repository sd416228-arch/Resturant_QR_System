// Money is stored as integer paisa (1 NPR = 100 paisa) to avoid floating-point
// currency rounding errors. Formatting is locale-aware (Nepal by default).

const CURRENCY = 'NPR'
const LOCALE = 'ne-NP'

export function formatPaisa(paisa: number): string {
  if (!Number.isFinite(paisa)) {
    try {
      return new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY }).format(0)
    } catch {
      return `Rs. 0`
    }
  }
  try {
    return new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY }).format(paisa / 100)
  } catch {
    // Fallback if the runtime lacks ne-NP data (keeps build from crashing).
    return `Rs. ${(paisa / 100).toFixed(2)}`
  }
}
