export interface SingleTypeListItem {
  id: number;
  name: string;
  apiId: string;
  description?: string;
  isPublished: boolean;
  updatedAt: Date;
  fieldCount: number;
}

export interface SingleType {
  id: number;
  name: string;
  apiId: string;
  description?: string;
  fields: SingleTypeField[];
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SingleTypeField {
  id: number;
  name: string;
  apiId: string;
  type: string;
  required: boolean;
  unique: boolean;
  maxLength?: number;
  minLength?: number;
  maxValue?: number;
  minValue?: number;
  precision?: number;
  scale?: number;
  placeholder?: string;
  description?: string;
  defaultValue?: string;
  validationRegex?: string;
  relatedCollectionName?: string;
  relationType?: RelationType;
  hidden: boolean;
  displayOrder: number;
  options?: FieldOption[];
}

export interface FieldOption {
  label: string;
  value: string;
  displayOrder: number;
}

export enum RelationType {
  OneToOne = 'OneToOne',
  OneToMany = 'OneToMany',
  ManyToOne = 'ManyToOne',
  ManyToMany = 'ManyToMany'
}

export interface SingleTypeDataResponse {
  singleTypeId: number;
  apiId: string;
  name: string;
  fields: SingleTypeField[];
  data: any;
  status: ContentStatus;
  version: number;
  publishedAt?: Date;
  locale: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export enum ContentStatus {
  Draft = 'Draft',
  Published = 'Published',
  Archived = 'Archived'
}

export interface CreateSingleTypeRequest {
  name: string;
  apiId: string;
  description?: string;
  fields: CreateFieldRequest[];
}

export interface UpdateSingleTypeRequest {
  name?: string;
  description?: string;
  fields?: CreateFieldRequest[];
}

export interface CreateFieldRequest {
  name: string;
  apiId: string;
  type: string;
  required?: boolean;
  unique?: boolean;
  maxLength?: number;
  minLength?: number;
  maxValue?: number;
  minValue?: number;
  precision?: number;
  scale?: number;
  placeholder?: string;
  description?: string;
  defaultValue?: string;
  validationRegex?: string;
  relatedCollectionId?: number;
  relatedCollectionName?: string;
  relationType?: RelationType;
  displayOrder: number;
  options?: FieldOption[];
}

export interface UpdateFieldRequest {
  name?: string;
  apiId?: string;
  type?: string;
  required?: boolean;
  unique?: boolean;
  maxLength?: number;
  minLength?: number;
  placeholder?: string;
  description?: string;
  defaultValue?: string;
}
