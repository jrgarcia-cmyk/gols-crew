import type {
  User,
  Contractor,
  ContractorRate,
  Event,
  EventAssignment,
  Timesheet,
  Reimbursement,
  ContractorRating,
  PayrollExport,
  PayrollExportItem,
  ContractorImport,
  ContractorImportRow,
  UserRole,
  ContractorStatus,
  PayType,
  EventStatus,
  AssignmentStatus,
  TimesheetStatus,
  ReimbursementStatus,
  PayrollExportStatus,
  ImportStatus,
  ImportRowStatus,
  WouldBookAgain,
  IntakeStatus,
} from "@/app/generated/prisma";

export type {
  User,
  Contractor,
  ContractorRate,
  Event,
  EventAssignment,
  Timesheet,
  Reimbursement,
  ContractorRating,
  PayrollExport,
  PayrollExportItem,
  ContractorImport,
  ContractorImportRow,
  UserRole,
  ContractorStatus,
  PayType,
  EventStatus,
  AssignmentStatus,
  TimesheetStatus,
  ReimbursementStatus,
  PayrollExportStatus,
  ImportStatus,
  ImportRowStatus,
  WouldBookAgain,
  IntakeStatus,
};

export type UserWithContractor = User & {
  contractor: Contractor | null;
};

export type ContractorWithRates = Contractor & {
  rates: ContractorRate[];
};

export type EventWithAssignments = Event & {
  assignments: (EventAssignment & {
    contractor: Contractor;
  })[];
};

export type AssignmentWithDetails = EventAssignment & {
  event: Event;
  contractor: Contractor;
  selectedRate: ContractorRate | null;
  timesheets: Timesheet[];
};

export type TimesheetWithDetails = Timesheet & {
  event: Event;
  contractor: Contractor;
  assignment: EventAssignment;
};

export type ReimbursementWithDetails = Reimbursement & {
  event: Event;
  contractor: Contractor;
};

export type PayrollExportRow = {
  contractor_name: string;
  contractor_email: string;
  everee_worker_id: string;
  event_name: string;
  event_date: string;
  role: string;
  pay_type: string;
  rate: string;
  hours: string;
  gross_pay: string;
  reimbursement_total: string;
  bonus_total: string;
  notes: string;
  payroll_period: string;
  payroll_pay_date: string;
};

export type ContractorImportRowData = {
  legal_name?: string;
  preferred_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  shirt_size?: string;
  notes?: string;
  default_role?: string;
  status?: string;
  everee_worker_id?: string;
};
