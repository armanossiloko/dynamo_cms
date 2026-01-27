export interface DataCollection {
  name: string;
  displayName: string;
  columns: DataCollectionColumn[];
}

export interface DataCollectionColumn {
  name: string;
  displayName?: string;
  baseType: string;
  nullable: boolean;
  visible: boolean;
  unique?: boolean;
  autoIncrement?: boolean;
}

export interface DataCollectionCreation {
  name: string;
  displayName: string;
  columns: ColumnCreation[];
}

export interface ColumnCreation {
  name: string;
  displayName?: string;
  baseTypeName: string;
  nullable: boolean;
  visible: boolean;
  unique: boolean;
  autoIncrement: boolean;
  reference?: Reference;
}

export interface Reference {
  dataCollection: string;
  property: string;
  value?: any;
}

export interface DataCollectionUpdate {
  displayName?: string;
  columns: ColumnAlteration[];
}

export interface ColumnAlteration {
  oldName?: string;
  name: string;
  displayName?: string;
  baseTypeName?: string;
  action: ColumnAlterationType;
  nullable?: boolean;
  visible?: boolean;
  unique?: boolean;
  autoIncrement?: boolean;
}

export enum ColumnAlterationType {
  Add = 'Add',
  Rename = 'Rename',
  ChangeType = 'ChangeType',
  Drop = 'Drop'
}
