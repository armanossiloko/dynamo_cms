export interface Locale {
  id: number;
  code: string;
  name: string;
  nativeName?: string;
  isDefault: boolean;
  isActive: boolean;
  isRtl: boolean;
  flagEmoji?: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLocale {
  code: string;
  name: string;
  nativeName?: string;
  isDefault: boolean;
  isRtl: boolean;
  flagEmoji?: string;
  sortOrder: number;
}

export interface UpdateLocale {
  name?: string;
  nativeName?: string;
  isDefault?: boolean;
  isActive?: boolean;
  isRtl?: boolean;
  flagEmoji?: string;
  sortOrder?: number;
}

export interface Translation {
  id: number;
  collectionName: string;
  entryId: number;
  localeCode: string;
  translatedFields: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
  isComplete: boolean;
  completionPercentage: number;
}

export interface CreateTranslation {
  collectionName: string;
  entryId: number;
  localeCode: string;
  translatedFields: Record<string, any>;
  isComplete: boolean;
  completionPercentage: number;
}

export interface UpdateTranslation {
  translatedFields?: Record<string, any>;
  isComplete?: boolean;
  completionPercentage?: number;
}

export interface TranslationStatus {
  collectionName: string;
  entryId: number;
  defaultLocale: string;
  localeStatuses: LocaleTranslationStatus[];
}

export interface LocaleTranslationStatus {
  localeCode: string;
  exists: boolean;
  isComplete: boolean;
  completionPercentage: number;
  lastUpdated?: Date;
}
