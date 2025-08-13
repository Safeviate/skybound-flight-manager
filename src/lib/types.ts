
import type { GenerateCorrectiveActionPlanOutput } from '@/ai/flows/generate-corrective-action-plan-flow';
export type { GenerateCorrectiveActionPlanOutput } from '@/ai/flows/generate-corrective-action-plan-flow';
import type { FiveWhysAnalysisOutput } from '@/ai/flows/five-whys-analysis-flow';
export type { FiveWhysAnalysisOutput } from '@/ai/flows/five-whys-analysis-flow';
import type { SuggestInvestigationStepsOutput } from '@/ai/flows/suggest-investigation-steps-flow';
export type { SuggestInvestigationStepsOutput } from '@/ai/flows/suggest-investigation-steps-flow';


export type Airport = {
  id: string;
  name: string;
  coords: {
    lat: number;
    lon: number;
  };
};

export type ThemeColors = {
  primary?: string;
  background?: string;
  accent?: string;
};

export type Feature = 
    | 'Safety' 
    | 'Quality' 
    | 'Aircraft' 
    | 'Students' 
    | 'Personnel'
    | 'Bookings'
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
  make: string;
  model: string;
  status: 'Available' | 'In Maintenance' | 'Booked' | 'Archived';
  hours: number;
  airworthinessExpiry: string;
  insuranceExpiry: string;
  location: string; // Airport ID
  checklistStatus?: 'needs-pre-flight' | 'needs-post-flight' | 'ready';
  activeBookingId?: string | null;
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

export const ALL_DOCUMENTS = [
  "Passport",
  "Visa",
  "Identification",
  "Drivers License",
  "Pilot License",
  "Medical Certificate",
  "Logbook",
  "Airport Access",
] as const;

export type UserDocument = {
    id: string;
    type: typeof ALL_DOCUMENTS[number];
    expiryDate: string | null;
};

export type Permission =
  | 'Aircraft:View'
  | 'Aircraft:Edit'
  | 'Aircraft:UpdateHobbs'
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
  | 'Bookings:View'
  | 'Bookings:Edit'
  | 'Super User';

export const ALL_PERMISSIONS: Permission[] = [
    'Aircraft:View',
    'Aircraft:Edit',
    'Aircraft:UpdateHobbs',
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
    'Bookings:View',
    'Bookings:Edit',
    'Super User',
];

export type Department = 'Management' | 'Flight Operations' | 'Ground Operation' | 'Maintenance' | 'External' | 'Administrative' | 'Cargo';

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
  | 'Auditee'
  | 'System Admin'
  | 'Super User';

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
  bookingNumber?: string;
  companyId: string;
  date: string;
  endDate?: string;
  startTime: string;
  endTime: string;
  aircraft: string;
  student?: string | null;
  instructor?: string | null;
  purpose: 'Training' | 'Maintenance' | 'Private';
  status: 'Approved' | 'Completed' | 'Cancelled';
  flightDuration?: number;
  maintenanceType?: string | null;
  trainingExercise?: string;
  cancellationReason?: string;
  startHobbs?: number;
  endHobbs?: number;
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

export type TaskComment = {
  id: string;
  author: string;
  date: string;
  message: string;
  readBy: string[];
};

export type InvestigationTask = {
  id: string;
  description: string;
  assignedTo: string;
  dueDate: string;
  status: 'Open' | 'Completed';
  comments?: TaskComment[];
  extensionRequestReason?: string;
  requestedDeadline?: string;
  extensionStatus?: 'Pending' | 'Approved' | 'Rejected' | null;
}

export type InvestigationTeamMember = {
  userId: string;
  name: string;
  role: 'Lead Investigator' | 'Investigator' | 'Technical Expert' | 'Observer';
};

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
  status: 'Open' | 'Under Review' | 'Closed' | 'Archived';
  type: SafetyReportType;
  department: Department;
  classification?: 'Hazard' | 'Occurrence' | 'Incident' | 'Accident';
  occurrenceCategory?: string;
  subCategory?: string;
  aircraftInvolved?: string;
  location?: string;
  investigationTeam?: InvestigationTeamMember[];
  tasks?: InvestigationTask[];
  investigationNotes?: string;
  discussion?: DiscussionEntry[];
  associatedRisks?: AssociatedRisk[];
  correctiveActionPlan?: GenerateCorrectiveActionPlanOutput;
  fiveWhysAnalysis?: FiveWhysAnalysisOutput;
  aiSuggestedSteps?: SuggestInvestigationStepsOutput;
  // Dynamic fields based on category
  phaseOfFlight?: string;
  crewInvolved?: string;
  pilotInCommand?: string | null;
  pilotFlying?: 'PIC' | 'First Officer' | null;
  raCallout?: string;
  raFollowed?: 'Yes' | 'No' | null;
  weatherConditions?: string;
  visibility?: number;
  windSpeed?: number;
  windDirection?: number;
  birdStrikeDamage?: boolean;
  numberOfBirds?: string;
  sizeOfBirds?: string;
  partOfAircraftStruck?: string;
  eventSubcategoryDetails?: string;

  // Aircraft Defect Report
  systemOrComponent?: string;
  aircraftGrounded?: boolean;

  // Ground Operations Report
  areaOfOperation?: string;
  groundEventType?: string;

  // Occupational Report
  injuryType?: string;
  medicalAttentionRequired?: boolean;
};

export type CorrectiveAction = {
    id: string;
    action: string;
    responsiblePerson: string;
    deadline: string;
    status: 'Not Started' | 'In Progress' | 'Completed';
    comments?: TaskComment[];
    extensionRequestReason?: string;
    requestedDeadline?: string;
    extensionStatus?: 'Pending' | 'Approved' | 'Rejected' | null;
}

export type RiskLikelihood = 'Frequent' | 'Occasional' | 'Remote' | 'Improbable' | 'Extremely Improbable';
export type RiskSeverity = 'Catastrophic' | 'Hazardous' | 'Major' | 'Minor' | 'Negligible';
export type RiskStatus = 'Open' | 'Mitigated' | 'Closed';

export type Risk = {
  id: string;
  companyId: string;
  description: string;
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
};

export type GroupedRisk = {
  area: string;
  risks: Risk[];
};

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
    photo?: string;
    suggestedImprovement?: string;
}

export type AuditArea = 'Personnel' | 'Maintenance' | 'Facilities' | 'Records' | 'Management' | 'Ground Ops' | 'Cabin Safety' | 'Security' | 'Occupational Safety' | 'Administration & Management';

export type ChecklistCategory = 'Pre-Flight' | 'Post-Flight' | 'Post-Maintenance';

export type ChecklistItemType = 'Checkbox' | 'Textbox' | 'StandardCamera' | 'AICamera-Registration' | 'AICamera-Hobbs';

export type ChecklistItem = {
    id: string;
    text: string;
    type: ChecklistItemType;
    completed: boolean;
    value?: string | number | boolean;
    regulationReference?: string;
    evidence?: string;
};

export type CompletedChecklistItemResult = {
    itemId: string;
    itemText: string;
    completed: boolean;
    value?: any;
};

export type CompletedChecklist = {
    id: string;
    aircraftId: string;
    aircraftTailNumber: string;
    userId: string;
    userName: string;
    dateCompleted: string;
    type: 'Pre-Flight' | 'Post-Flight';
    results: any; // Can be PreFlightChecklistFormValues or PostFlightChecklistFormValues
    bookingNumber?: string;
};


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
  auditNumber?: string;
  title: string;
  date: string;
  type: 'Internal' | 'External' | 'Self Audit';
  auditor: string;
  auditeeName?: string | null;
  auditeePosition?: string | null;
  area: AuditArea;
  department?: Department;
  status: 'Open' | 'Closed' | 'Archived';
  complianceScore: number;
  checklistItems: AuditChecklistItem[];
  nonConformanceIssues: NonConformanceIssue[];
  summary: string;
  discussion?: DiscussionEntry[];
  auditTeam?: string[];
  auditeeTeam?: string[];
  auditorSignature?: string;
  auditorSignatureDate?: string;
  auditeeSignature?: string;
  auditeeSignatureDate?: string;
  scope?: string;
  evidenceReference?: string;
};

export type AuditStatus = 'Scheduled' | 'Completed' | 'Pending' | 'Not Scheduled';

export type AuditScheduleItem = {
  id: string;
  companyId?: string;
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

export const REPORT_TYPE_DEPARTMENT_MAPPING: Record<SafetyReportType, Department> = {
    'Flight Operations Report': 'Flight Operations',
    'Ground Operations Report': 'Ground Operation',
    'Aircraft Defect Report': 'Maintenance',
    'Occupational Report': 'Management',
    'General Report': 'Management',
};

export type ExternalContact = {
  id: string;
  companyId: string;
  name: string;
  email: string;
  description?: string;
};

export const VIEW_ALL_PAGES: Permission[] = [
  'Aircraft:View',
  'Students:View',
  'Personnel:View',
  'Safety:View',
  'Quality:View',
  'Checklists:View',
  'Alerts:View',
  'Reports:View',
  'Bookings:View',
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  'Super User': ['Super User'],
  'Accountable Manager': ['Super User'],
  'System Admin': ['Super User'],
  'Admin': ['Super User'],
  'Operations Manager': ['Super User'],
  'HR Manager': [...VIEW_ALL_PAGES, 'Personnel:Edit', 'Settings:Edit'],
  'Safety Manager': [...VIEW_ALL_PAGES, 'Safety:Edit', 'Alerts:Edit', 'Reports:View', 'Settings:Edit'],
  'Quality Manager': [...VIEW_ALL_PAGES, 'Quality:Edit', 'Quality:Delete', 'Alerts:Edit', 'Reports:View', 'Settings:Edit'],
  'Aircraft Manager': [...VIEW_ALL_PAGES, 'Aircraft:Edit', 'Aircraft:UpdateHobbs', 'Alerts:Edit'],
  'Maintenance': [...VIEW_ALL_PAGES, 'Aircraft:Edit', 'Aircraft:UpdateHobbs', 'Checklists:Edit'],
  'Chief Flight Instructor': [...VIEW_ALL_PAGES, 'Students:Edit', 'Personnel:View', 'Checklists:Edit', 'Alerts:Edit', 'Settings:Edit'],
  'Head Of Training': [...VIEW_ALL_PAGES, 'Students:Edit', 'Personnel:View', 'Checklists:Edit', 'Alerts:Edit', 'Settings:Edit'],
  'Instructor': [...VIEW_ALL_PAGES, 'Students:View', 'Checklists:View'],
  'Student': ['Aircraft:View', 'Students:View', 'Alerts:View', 'Bookings:View', 'Bookings:Edit'],
  'Auditee': ['Quality:View'],
  'Driver': [],
  'Front Office': ['Bookings:View', 'Bookings:Edit', 'Students:View', 'Personnel:View']
};

export const ICAO_OCCURRENCE_CATEGORIES: string[] = [
    "ADRM", "AMAN", "ARC", "ATM", "BIRD", "CABIN", "CFIT", "CTOL", "EVAC", "EXTL",
    "F-NI", "F-POST", "FUEL", "GCOL", "GTOW", "ICE", "LALT", "LOC-G", "LOC-I",
    "LOLI", "MAC", "MED", "NAV", "OTHR", "RAMP", "RE", "RI", "SCF-NP", "SCF-PP",
    "SEC", "TURB", "UIMC", "UNK", "USOS", "WILD", "WSTRW"
];

export const ICAO_PHASES_OF_FLIGHT: string[] = [
    'Standing',
    'Pushback/Towing',
    'Taxi',
    'Take-off',
    'Initial Climb',
    'En-route',
    'Approach',
    'Landing',
    'Go-around',
    'Post-impact'
];
