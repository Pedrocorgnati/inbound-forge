export interface BaseEntity {
  id: string
  createdAt: Date
  updatedAt: Date
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string        // formato ERR-XXX
    message: string
    details?: unknown
  }
  message?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    total: number
    page: number
    pageSize: number
    hasNext: boolean
    hasPrev: boolean
  }
}
