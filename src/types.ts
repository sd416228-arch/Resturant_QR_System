export type OrderStatus = 'New' | 'Preparing' | 'Ready' | 'Completed' | 'Cancelled'

export interface MenuItem {
  id: number
  name: string
  description: string
  // Stored as integer paisa to avoid floating-point currency errors.
  pricePaisa: number
  category: string
  image: string
  available: boolean
  prep: number
  tags: string[]
}

export interface OrderLine {
  itemId: number
  name: string
  pricePaisa: number
  quantity: number
}

export interface Order {
  id: string
  table: string
  tableNumber: string
  items: OrderLine[]
  totalPaisa: number
  status: OrderStatus
  time: string
  isoTime?: string
  note?: string
}

export interface CartLine {
  item: MenuItem
  quantity: number
}
