export interface DataFilter {
  orderBy?: string;
  orderByDesc?: string;
  page?: number;
  count?: number;
  where?: FilterCondition;
}

export interface FilterCondition {
  field?: string;
  operator?: string;
  value?: any;
  filter?: FilterType;
  conditions?: FilterCondition[];
}

export enum FilterType {
  AND = 'AND',
  OR = 'OR'
}

export interface DataResponse {
  data: Record<string, any>[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DataUpdate {
  data: Record<string, any>;
}

export interface DataBulkInsert {
  data: Record<string, any>[];
}
