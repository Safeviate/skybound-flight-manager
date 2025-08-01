

import type { GenerateCorrectiveActionPlanOutput } from '@/ai/flows/generate-corrective-action-plan-flow';
export type { GenerateCorrectiveActionPlanOutput } from '@/ai/flows/generate-corrective-action-plan-flow';

export type Airport = {
  id: string;
  name: string;
  coords: {
    lat: number;
    lon: number;
  };
};

export type ThemeColors = {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
};

export type Feature = 
    | 'Safety' 
    | 'Quality' 
    | 'Bookings' 
    | 'Aircraft' 
    | 'Students' 
    | 'Personnel'
    | 'AdvancedAnalytics';

export type Company = {
  id: string;
  name: string;
  trademark?: string;
  theme?: Partial<ThemeColors>;
  enabledFeatures?: Feature[];
  logoUrl?: string;
};

export type Aircraft = {
  id: string;
  companyId: string;
  tailNumber: string;
  model: string;
  status: 'Available' | 'In Maintenance' | 'Booked';
  hours: number;
  nextServiceType: string;
  hoursUntilService: number;
  airworthinessExpiry: string;
  insuranceExpiry: string;
  certificateOfReleaseToServiceExpiry: string;
  certificateOfRegistrationExpiry: string;
  massAndBalanceExpiry: string;
  radioStationLicenseExpiry: string;
  location: string; // Airport ID
  isPostFlightPending?: boolean;
};

export type Endorsement = {
    id: string;
    name: string;
    dateAwarded: string;
    awardedBy: string;
};

export type TrainingLogEntry = {
  id:string;
  date: string;
  aircraft: string;
  startHobbs: number;
  endHobbs: number;
  flightDuration: number;
  instructorNotes: string;
  instructorName: string;
  instructorSignature?: string;
};

export type UserDocument = {
    id: string;
    type: string;
    expiryDate: string | null;
};

export type Permission =
  | 'Aircraft:View'
  | 'Aircraft:Edit'
  | 'Aircraft:UpdateHobbs'
  | 'Bookings:View'
  | 'Bookings:Edit'
  | 'Bookings:Approve'
  | 'Students:View'
  | 'Students:Edit'
  | 'Personnel:View'
  | 'Personnel:Edit'
  | 'Safety:View'
  | 'Safety:Edit'
  | 'Quality:View'
  | 'Quality:Edit'
  | 'Quality:Sign'
  | 'Quality:Delete'
  | 'Checklists:View'
  | 'Checklists:Edit'
  | 'Alerts:View'
  | 'Alerts:Edit'
  | 'Reports:View'
  | 'Reports:Edit'
  | 'Settings:Edit'
  | 'Super User';

export const ALL_PERMISSIONS: Permission[] = [
    'Aircraft:View',
    'Aircraft:Edit',
    'Aircraft:UpdateHobbs',
    'Bookings:View',
    'Bookings:Edit',
    'Bookings:Approve',
    'Students:View',
    'Students:Edit',
    'Personnel:View',
    'Personnel:Edit',
    'Safety:View',
    'Safety:Edit',
    'Quality:View',
    'Quality:Edit',
    'Quality:Sign',
    'Quality:Delete',
    'Checklists:View',
    'Checklists:Edit',
    'Alerts:View',
    'Alerts:Edit',
    'Reports:View',
    'Reports:Edit',
    'Settings:Edit',
    'Super User',
];

export type Department = 'Management' | 'Flight Operations' | 'Ground Operation' | 'Maintenance' | 'External';

export type Role =
  | 'Accountable Manager'
  | 'Admin'
  | 'Aircraft Manager'
  | 'Chief Flight Instructor'
  | 'Driver'
  | 'Front Office'
  | 'Head Of Training'
  | 'HR Manager'
  | 'Instructor'
  | 'Maintenance'
  | 'Operations Manager'
  | 'Quality Manager'
  | 'Safety Manager'
  | 'Student'
  | 'Auditee';

export type User = {
    id: string;
    companyId: string;
    name: string;
    role: Role;
    email?: string;
    phone: string;
    password?: string;
    permissions: Permission[];
    consentDisplayContact?: 'Consented' | 'Not Consented';
    mustChangePassword?: boolean;
    homeAddress?: string;
    nextOfKinName?: string;
    nextOfKinPhone?: string;
    nextOfKinEmail?: string;
    // Student-specific
    instructor?: string;
    flightHours?: number;
    progress?: number;
    status?: 'Active' | 'Archived';
    endorsements?: Endorsement[];
    trainingLogs?: TrainingLogEntry[];
    // Personnel-specific
    department?: Department;
    medicalExpiry?: string | null;
    licenseExpiry?: string | null;
    documents?: UserDocument[];
    // External Auditee specific
    externalCompanyName?: string;
    externalPosition?: string;
    accessStartDate?: string;
    accessEndDate?: string;
    requiredDocuments?: string[];
};

export type Booking = {
  id: string;
  companyId: string;
  date: string;
  endDate?: string;
  startTime: string;
  endTime: string;
  aircraft: string;
  student: string;
  instructor: string;
  purpose: 'Training' | 'Maintenance' | 'Private';
  status: 'Approved' | 'Completed' | 'Cancelled';
  isChecklistComplete?: boolean;
  isPostFlightChecklistComplete?: boolean;
  flightDuration?: number;
  maintenanceType?: string;
  trainingExercise?: string;
};

export type SafetyReportType = 'Flight Operations Report' | 'Ground Operations Report' | 'Occupational Report' | 'General Report' | 'Aircraft Defect Report';

export type DiscussionEntry = {
  id: string;
  author: string;
  recipient: string;
  message: string;
  datePosted: string;
  replyByDate?: string;
  isCode?: boolean;
};

export type InvestigationDiaryEntry = {
    id: string;
    date: string;
    author: string;
    entryText: string;
};

export type AssociatedRisk = {
    id: string;
    hazard: string;
    risk: string;
    hazardArea: string;
    process: string;
    likelihood: RiskLikelihood;
    severity: RiskSeverity;
    riskScore: number;
    mitigationControls?: string;
    residualLikelihood?: RiskLikelihood;
    residualSeverity?: RiskSeverity;
    residualRiskScore?: number;
    promotedToRegister?: boolean;
}

export type SafetyReport = {
  id: string;
  companyId: string;
  reportNumber: string;
  occurrenceDate: string;
  occurrenceTime?: string;
  filedDate: string;
  closedDate?: string;
  submittedBy: string;
  heading: string;
  details: string;
  status: 'Open' | 'Under Review' | 'Closed';
  type: SafetyReportType;
  department: Department;
  classification?: 'Hazard' | 'Occurrence' | 'Incident' | 'Accident';
  occurrenceCategory?: string;
  subCategory?: string;
  aircraftInvolved?: string;
  location?: string;
  investigationTeam?: string[];
  investigationDiary?: InvestigationDiaryEntry[];
  investigationNotes?: string;
  discussion?: DiscussionEntry[];
  associatedRisks?: AssociatedRisk[];
  correctiveActionPlan?: GenerateCorrectiveActionPlanOutput;
  // Dynamic fields based on category
  raCallout?: string;
  raFollowed?: 'Yes' | 'No';
  weatherConditions?: string;
  visibility?: number;
  windSpeed?: number;
  windDirection?: number;
  birdStrikeDamage?: boolean;
  numberOfBirds?: string;
  sizeOfBirds?: string;
  partOfAircraftStruck?: string;
  eventSubcategoryDetails?: string;
  phaseOfFlight?: string;
};

export const REPORT_TYPE_DEPARTMENT_MAPPING: Record<SafetyReportType, Department> = {
    'Flight Operations Report': 'Flight Operations',
    'Ground Operations Report': 'Ground Operation',
    'Aircraft Defect Report': 'Maintenance',
    'Occupational Report': 'Management',
    'General Report': 'Management',
};

export type SuggestInvestigationStepsOutput = {
  initialAssessment: string;
  keyAreasToInvestigate: string[];
  recommendedActions: string[];
  potentialContributingFactors: string[];
};

export type FiveWhysAnalysisOutput = {
  problemStatement: string;
  analysis: { why: string; because: string }[];
  rootCause: string;
};

export type CorrectiveAction = {
    action: string;
    responsiblePerson: string;
    deadline: string;
    status: 'Not Started' | 'In Progress' | 'Completed';
}

export type RiskLikelihood = 'Rare' | 'Unlikely' | 'Possible' | 'Likely' | 'Certain';
export type RiskSeverity = 'Insignificant' | 'Minor' | 'Moderate' | 'Major' | 'Catastrophic';
export type RiskStatus = 'Open' | 'Mitigated' | 'Closed';

export type Risk = {
  id: string;
  companyId: string;
  hazard: string;
  risk: string;
  consequences: string[];
  likelihood: RiskLikelihood;
  severity: RiskSeverity;
  riskScore: number;
  residualLikelihood?: RiskLikelihood;
  residualSeverity?: RiskSeverity;
  residualRiskScore?: number;
  mitigation: string;
  status: RiskStatus;
  existingMitigation?: string;
  proposedMitigation?: string;
  dateIdentified: string;
  hazardArea: string;
  process: string;
  riskOwner?: string;
  reviewDate?: string;
  reportNumber?: string;
}

export type GroupedRisk = {
  area: string;
  risks: Risk[];
};

export type ChecklistItemType = 
    | 'Checkbox'
    | 'Confirm preflight hobbs'
    | 'Confirm postflight hobbs'
    | 'Confirm premaintenance hobbs'
    | 'Confirm post maintenance hobbs';

export type ChecklistItem = {
    id: string;
    text: string;
    type: ChecklistItemType;
    completed: boolean;
    value: string;
};

export type CompletedChecklist = {
    id: string;
    companyId: string;
    checklistId: string;
    checklistName: string;
    checklistType: 'Pre-Flight' | 'Post-Flight' | 'Post-Maintenance';
    aircraftId: string;
    completedBy: string;
    completionDate: string;
}

export type FindingStatus = 'Compliant' | 'Non-compliant' | 'Partial' | 'Not Applicable' | 'Observation';
export type FindingLevel = 'Level 1 Finding' | 'Level 2 Finding' | 'Level 3 Finding' | 'Observation' | null;

export type AuditChecklistItem = {
    id: string;
    text: string;
    finding: FindingStatus | null;
    level: FindingLevel;
    observation?: string;
    findingNotes?: string;
    evidence?: string;
    regulationReference?: string;
    reference?: string;
    comment?: string;
}

export type AuditArea = 'Personnel' | 'Maintenance' | 'Facilities' | 'Records' | 'Management' | 'Flight Operations' | 'Ground Ops';

export type AuditChecklist = {
    id: string;
    companyId: string;
    title: string;
    area: AuditArea;
    items: AuditChecklistItem[];
    department?: string;
    auditeeName?: string;
    auditeePosition?: string;
    auditor?: string;
}

export const VIEW_ALL_PAGES: Permission[] = [
    'Aircraft:View',
    'Bookings:View',
    'Students:View',
    'Personnel:View',
    'Safety:View',
    'Quality:View',
    'Checklists:View',
    'Alerts:View',
    'Reports:View',
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
    'Accountable Manager': ['Super User'],
    'Admin': ['Super User'],
    'Operations Manager': ['Super User'],
    'HR Manager': [...VIEW_ALL_PAGES, 'Personnel:Edit', 'Settings:Edit'],
    'Safety Manager': [...VIEW_ALL_PAGES, 'Safety:Edit', 'Alerts:Edit', 'Reports:View', 'Settings:Edit'],
    'Quality Manager': [...VIEW_ALL_PAGES, 'Quality:Edit', 'Quality:Delete', 'Alerts:Edit', 'Reports:View', 'Settings:Edit'],
    'Aircraft Manager': [...VIEW_ALL_PAGES, 'Aircraft:Edit', 'Aircraft:UpdateHobbs', 'Alerts:Edit'],
    'Maintenance': [...VIEW_ALL_PAGES, 'Aircraft:Edit', 'Aircraft:UpdateHobbs', 'Checklists:Edit'],
    'Chief Flight Instructor': [...VIEW_ALL_PAGES, 'Students:Edit', 'Bookings:Edit', 'Bookings:Approve', 'Personnel:View', 'Checklists:Edit', 'Alerts:Edit', 'Settings:Edit'],
    'Head Of Training': [...VIEW_ALL_PAGES, 'Students:Edit', 'Bookings:Edit', 'Bookings:Approve', 'Personnel:View', 'Checklists:Edit', 'Alerts:Edit', 'Settings:Edit'],
    'Instructor': [...VIEW_ALL_PAGES, 'Bookings:Edit', 'Bookings:Approve', 'Students:View', 'Checklists:View'],
    'Front Office': [...VIEW_ALL_PAGES],
    'Student': ['Bookings:View', 'Aircraft:View', 'Alerts:View'],
    'Driver': ['Alerts:View'],
    'Auditee': ['Quality:View', 'Alerts:View'],
};

export const ICAO_OCCURRENCE_CATEGORIES = [
    'ADRM', 'AMAN', 'ARC', 'ATM', 'BIRD', 'CABIN', 'CFIT', 'CTOL', 'EVAC', 'EXTL', 'F-NI', 'F-POST', 'FUEL', 'GCOL', 'GTOW', 'ICE', 'LALT', 'LOC-G', 'LOC-I', 'LOLI', 'MAC', 'MED', 'NAV', 'OTHR', 'RAMP', 'RE', 'RI', 'SCF-NP', 'SCF-PP', 'SEC', 'TURB', 'UIMC', 'UNK', 'USOS', 'WILD', 'WSTRW'
].sort();

export const ICAO_PHASES_OF_FLIGHT = [
    'Standing',
    'Pushback/Towing',
    'Taxi',
    'Take-off',
    'Initial Climb',
    'Climb',
    'Cruise',
    'Descent',
    'Approach',
    'Landing',
    'Go-around',
    'Circling',
    'Emergency Descent',
    'Holding',
    'Parked',
    'Maintenance',
    'Other'
].sort();


export type CorrectiveActionPlan = {
  rootCause: string;
  correctiveAction: string;
  preventativeAction: string;
  responsiblePerson: string;
  completionDate: string;
  status: 'Open' | 'Closed' | 'In Progress';
};

export type NonConformanceIssue = {
  id: string;
  itemText: string;
  regulationReference?: string;
  finding: FindingStatus;
  level: FindingLevel;
  comment?: string;
  reference?: string;
  correctiveActionPlan?: CorrectiveActionPlan | null;
};

export type QualityAudit = {
  id: string;
  companyId: string;
  title: string;
  date: string;
  type: 'Internal' | 'External';
  auditor: string;
  auditeeName?: string | null;
  auditeePosition?: string | null;
  area: AuditArea;
  status: 'Open' | 'Closed' | 'Archived';
  complianceScore: number;
  checklistItems: AuditChecklistItem[];
  nonConformanceIssues: NonConformanceIssue[];
  summary: string;
  discussion?: DiscussionEntry[];
  investigationTeam?: string[];
  auditorSignature?: string;
  auditeeSignature?: string;
};

export type AuditStatus = 'Scheduled' | 'Completed' | 'Pending' | 'Not Scheduled';

export type AuditScheduleItem = {
  id: string;
  companyId: string;
  area: string;
  year: number;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  status: AuditStatus;
};

export type Alert = {
  id: string;
  companyId?: string;
  number?: number;
  type: 'Red Tag' | 'Yellow Tag' | 'Task' | 'Signature Request' | 'System Health';
  title: string;
  description: string;
  author: string;
  date: string;
  readBy: string[];
  targetUserId?: string;
  relatedLink?: string;
};

export type ComplianceItem = {
    id: string;
    companyId: string;
    regulation: string;
    process: string;
    responsibleManager: string;
    lastAuditDate?: string;
    nextAuditDate?: string;
    findings?: string;
};

// This type was moved here from `app/checklists/page.tsx`
export type Checklist = {
  id: string;
  companyId: string;
  title: string;
  category: 'Pre-Flight' | 'Post-Flight' | 'Post-Maintenance';
  items: ChecklistItem[];
  templateId?: string; // ID of the master template
  aircraftId?: string; // If null, it's a master template. If populated, it's assigned to an aircraft.
};
