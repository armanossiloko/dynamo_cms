export interface ComponentDefinition {
  id: number;
  name: string;
  displayName: string;
  description?: string;
  category: string;
  icon?: string;
  schema: Record<string, any>;
  defaultData?: Record<string, any>;
  validationRules?: Record<string, any>;
  isSystem: boolean;
  isActive: boolean;
  allowMultiple: boolean;
  maxInstances?: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export interface CreateComponent {
  name: string;
  displayName: string;
  description?: string;
  category: string;
  icon?: string;
  schema: Record<string, any>;
  defaultData?: Record<string, any>;
  validationRules?: Record<string, any>;
  allowMultiple: boolean;
  maxInstances?: number;
}

export interface UpdateComponent {
  displayName?: string;
  description?: string;
  category?: string;
  icon?: string;
  schema?: Record<string, any>;
  defaultData?: Record<string, any>;
  validationRules?: Record<string, any>;
  isActive?: boolean;
  allowMultiple?: boolean;
  maxInstances?: number;
}

export interface ComponentInstance {
  componentName: string;
  data: Record<string, any>;
  order?: number;
}

export interface ValidateComponent {
  componentName: string;
  data: Record<string, any>;
}

export interface ComponentValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ComponentCategory {
  name: string;
  icon?: string;
  componentCount: number;
}
