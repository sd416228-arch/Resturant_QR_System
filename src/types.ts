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

export type ServiceRequestType =
  | 'water'
  | 'bill'
  | 'cutlery'
  | 'order_help'
  | 'general'
  | 'other'

export type ServiceRequestStatus =
  | 'Pending'
  | 'Accepted'
  | 'In Progress'
  | 'Completed'
  | 'Cancelled'

export interface ServiceRequest {
  id: string
  restaurantId: string
  tableNumber: string
  requestType: ServiceRequestType
  message?: string
  status: ServiceRequestStatus
  assignedWaiterId?: string
  assignedWaiterName?: string
  createdAt: string
  acceptedAt?: string
  startedAt?: string
  completedAt?: string
  updatedAt: string
}

export interface WaiterProfile {
  id: string
  name: string
  role: 'waiter'
}
