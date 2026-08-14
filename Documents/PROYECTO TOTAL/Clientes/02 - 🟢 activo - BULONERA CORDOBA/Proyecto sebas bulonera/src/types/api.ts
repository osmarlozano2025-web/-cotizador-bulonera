export interface ApiError { code: string; message: string; details?: Readonly<Record<string, string>>; }
export interface ApiResponse<TData> { data: TData; }
export interface PaginatedResponse<TData> { data: readonly TData[]; page: number; pageSize: number; total: number; }
