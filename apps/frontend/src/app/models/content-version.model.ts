export interface ContentVersion {
  id: number;
  collectionName: string;
  entryId: number;
  versionNumber: number;
  data: Record<string, any>;
  changeSummary?: string;
  createdAt: Date;
  createdBy?: string;
  createdByName?: string;
  isCurrent: boolean;
}

export interface ContentVersionDiff {
  fromVersionId: number;
  toVersionId: number;
  changes: FieldChange[];
}

export interface FieldChange {
  fieldName: string;
  changeType: string;
  oldValue?: any;
  newValue?: any;
}
