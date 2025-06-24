import { ApiError } from "../../../../types";

export interface SessionListViewModel {
  sessions: SessionItemViewModel[];
  pagination: PaginationViewModel;
  loading: boolean;
  error: ApiError | null;
  canAddSession: boolean; // sprawdza limit dzienny
}

export interface SessionItemViewModel {
  id: number;
  sessionDatetime: Date;
  description: string | null;
  location: string | null;
  totalWeight: number;
  totalReps: number;
  exerciseCount: number;
  formattedDate: string; // dla wyświetlenia
  formattedTime: string; // dla wyświetlenia
  isExpandedByDefault: boolean; // dla pierwszego elementu
}

export interface SessionFormViewModel {
  sessionDatetime: Date;
  description: string | null;
  location: string | null;
  isSubmitting: boolean;
  validationErrors: ValidationError[];
}

export interface PaginationViewModel {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface SessionStats {
  totalWeight: number;
  totalReps: number;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}
