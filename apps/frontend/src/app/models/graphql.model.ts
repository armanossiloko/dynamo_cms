export interface GraphQLResponse<T = any> {
  data?: T;
  errors?: GraphQLError[];
}

export interface GraphQLError {
  message: string;
  locations?: { line: number; column: number }[];
  path?: string[];
  extensions?: Record<string, any>;
}

export interface GraphQLOperation {
  name: string;
  type: 'query' | 'mutation' | 'subscription';
  description: string;
  query: string;
  variables?: Record<string, any>;
}

export interface GraphQLSchemaField {
  name: string;
  type: string;
  description?: string;
}
