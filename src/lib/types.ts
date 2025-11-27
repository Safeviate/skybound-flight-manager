

import type { GenerateCorrectiveActionPlanOutput } from '@/ai/flows/generate-corrective-action-plan-flow';
export type { GenerateCorrectiveActionPlanOutput } from '@/ai/flows/generate-corrective-action-plan-flow';
import type { FiveWhysAnalysisOutput } from '@/ai/flows/five-whys-analysis-flow';
export type { FiveWhysAnalysisOutput } from '@/ai/flows/five-whys-analysis-flow';
import type { SuggestInvestigationStepsOutput } from '@/ai/flows/suggest-investigation-steps-flow';
export type { SuggestInvestigationStepsOutput } from '@/ai/flows/suggest-investigation-steps-flow';
import { PreFlightChecklistFormValues } from '@/app/checklists/pre-flight-checklist-form';
import { PostFlightChecklistFormValues } from '../checklists/post-flight-checklist-form';


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
  card?: string;
  foreground?: string;
  cardForeground?: string;
  headerForeground?: string;
  accent?: string;
  sidebarBackground?: string;
  sidebarForeground?: string;
  sidebarAccent?: string;
  secondary?: string;
  secondaryForeground?: string;
  muted?: string;
  mutedForeground?: string;
  destructive?: string;
  destructiveForeground?: string;
  border?: string;
  input?: string;
  ring?: string;
};

export type Feature = 
    | 'Safety' 
    | 'Quality' 
    | 'Aircraft' 
    | 'Students' 
    | 'Personnel'
    | 'Bookings'
    | 'AdvancedAnalytics';

export type Facility = {
  id: string;
  name: string;
};

export type FindingOption = {
    id: string;
    name: string;
};

export type CompanyAuditArea = {
    id: string;
    name: string;
};

export type BookingPurpose = {
  id: string;
  name: string;
};

export type Company = {
  id: string;
  name: string;
  trademark?: string;
  theme?: Partial<ThemeColors>;
  enabledFeatures?: Feature[];
  logoUrl?: string;
  riskMatrixColors?: Record<string, string>;
  findingLevelColors?: Record<string, string>;
  facilities?: Facility[];
  findingOptions?: FindingOption[];
  bookingPurposes?: BookingPurpose[];
  instructorIds?: string[];
  auditAreas?: CompanyAuditArea[];
};

export type AircraftDocument = {
    expiryDate: string | null;
    url?: string | null;
};

export type Aircraft = {
  id: string;
  companyId: string;
  tailNumber: string;
  make: string;
  model: string;
  aircraftType?: 'SE' | 'ME' | 'FSTD';
  status: 'Available' | 'In Maintenance' | 'Booked' | 'Archived';
  hours: number;
  airworthinessDoc: AircraftDocument;
  insuranceDoc: AircraftDocument;
  releaseToServiceDoc: AircraftDocument;
  registrationDoc: AircraftDocument;
  massAndBalanceDoc: AircraftDocument;
  radioLicenseDoc: AircraftDocument;
  location: string; // Airport ID
  checklistStatus?: 'needs-pre-flight' | 'needs-post-flight' | 'ready';
  activeBookingId?: string | null;
  currentTachoReading?: number;
  next50HourInspection?: number;
  next100HourInspection?: number;
  totalTimeInService?: number;
  maintenanceStartDate?: string | null;
  maintenanceEndDate?: string | null;
};

export type Endorsement = {
    id: string;
    name: string;
    dateAwarded: string;
    awardedBy: string;
};

export type ExerciseLog = {
    exercise: string;
    rating: number;
    comment?: string;
}

export type TrainingLogEntry = {
  id:string;
  date: string;
  aircraft: string;
  make?: string;
  aircraftType?: 'SE' | 'ME' | 'FSTD';
  departure?: string;
  arrival?: string;
  departureTime?: string;
  arrivalTime?: string;
  startHobbs: number;
  endHobbs: number;
  flightDuration: number;
  singleEngineTime?: number;
  multiEngineTime?: number;
  fstdTime?: number;
  dualTime?: number;
  singleTime?: number;
  nightTime?: number;
  dayTime?: number;
  instructorName: string;
  instructorSignature?: string;
  studentSignature?: string;
  studentSignatureRequired?: boolean;
  trainingExercises: ExerciseLog[];
  weatherConditions?: string;
  remarks?: string;
};

export const ALL_DOCUMENTS = [
  "Passport",
  "Visa",
  "Identification",
  "Drivers License",
  "Pilot License",
  "Medical Certificate",
  "Logbook",
  "Airport Permit",
] as const;

export type UserDocument = {
    id: string;
    type: typeof ALL_DOCUMENTS[number];
    expiryDate: string | null;
    url?: string;
};

export type Permission =
  | 'Aircraft:View'
  | 'Aircraft:Edit'
  | 'Aircraft:UpdateHobbs'
  | 'Aircraft:Maintenance'
  | 'TechnicalLog:View'
  | 'Students:View'
  | 'Students:Edit'
  | 'Personnel:View'
  | 'Personnel:Edit'
  | 'Personnel:CreateTempPassword'
  | 'HireAndFly:View'
  | 'HireAndFly:Edit'
  | 'Safety:View'
  | 'Safety:Edit'
  | 'Quality:View'
  | 'Quality:Edit'
  | 'Quality:Sign'
  | 'Quality:Delete'
  | 'Checklists:View'
  | 'Checklists:Edit'
  | 'Checklists:Complete'
  | 'Alerts:View'
  | 'Alerts:Edit'
  | 'Reports:View'
  | 'Reports:Edit'
  | 'Settings:Edit'
  | 'Bookings:View'
  | 'Bookings:Edit'
  | 'MOC:Edit'
  | 'Exams:View'
  | 'Exams:Edit'
  | 'Roles & Departments:View'
  | 'Roles & Departments:Edit'
  | 'Super User';

export const ALL_PERMISSIONS: Permission[] = [
    'Aircraft:View',
    'Aircraft:Edit',
    'Aircraft:UpdateHobbs',
    'Aircraft:Maintenance',
    'TechnicalLog:View',
    'Students:View',
    'Students:Edit',
    'Personnel:View',
    'Personnel:Edit',
    'Personnel:CreateTempPassword',
    'HireAndFly:View',
    'HireAndFly:Edit',
    'Safety:View',
    'Safety:Edit',
    'Quality:View',
    'Quality:Edit',
    'Quality:Sign',
    'Quality:Delete',
    'Checklists:View',
    'Checklists:Edit',
    'Checklists:Complete',
    'Alerts:View',
    'Alerts:Edit',
    'Reports:View',
    'Reports:Edit',
    'Settings:Edit',
    'Bookings:View',
    'Bookings:Edit',
    'MOC:Edit',
    'Exams:View',
    'Exams:Edit',
    'Roles & Departments:View',
    'Roles & Departments:Edit',
    'Super User',
];

export type Role = string;
export type Department = string;

export type NavMenuItem = 'My Dashboard' | 'Company Dashboard' | 'Fleet Track' | 'Aircraft Management' | 'Quick Reports' | 'Alerts' | 'Students' | 'Personnel' | 'Hire and Fly' | 'Training Schedule' | 'Flight Logs' | 'Flight Statistics' | 'Safety' | 'Quality' | 'External Contacts' | 'Appearance' | 'Company Settings' | 'Manage Companies' | 'System Health' | 'Seed Data' | 'Functions' | 'Gantt Chart' | 'Roles & Departments' | 'Meetings' | 'Exams';

export type User = {
    id: string;
    companyId: string;
    name: string;
    role: Role;
    email?: string;
    phone: string;
    emergencyContactNumber?: string;
    password?: string;
    permissions: Permission[];
    visibleMenuItems?: NavMenuItem[];
    consentDisplayContact?: 'Consented' | 'Not Consented';
    mustChangePassword?: boolean;
    homeAddress?: string;
    nextOfKinName?: string;
    nextOfKinPhone?: string;
    nextOfKinEmail?: string;
    nextOfKinRelation?: string;
    // Student-specific
    studentCode?: string;
    instructor?: string;
    flightHours?: number;
    progress?: number;
    status?: 'Active' | 'Archived';
    endorsements?: Endorsement[];
    trainingLogs?: TrainingLogEntry[];
    licenseType?: 'SPL' | 'PPL';
    milestoneNotificationsSent?: number[];
    // Personnel-specific
    department?: Department;
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
  aircraft: string; // Tail number, or facility name
  resourceType: 'aircraft' | 'facility';
  facilityId?: string;
  title?: string; // For facility bookings
  responsiblePerson?: string; // For facility bookings
  notes?: string; // For facility bookings
  meetingMinutes?: string; // For facility bookings
  student?: string | null;
  studentId?: string | null;
  pilotId?: string | null;
  pilotName?: string | null;
  instructor?: string | null;
  purpose: 'Training' | 'Hire and Fly' | 'Post-Maintenance Flight' | 'Facility Booking' | 'Maintenance' | string;
  status: 'Approved' | 'Completed' | 'Cancelled';
  flightDuration?: number;
  maintenanceType?: string | null;
  trainingExercise?: string;
  cancellationReason?: string;
  startHobbs?: number;
  endHobbs?: number;
  fuelUplift?: number;
  oilUplift?: number;
  departure?: string;
  arrival?: string;
  pendingLogEntryId?: string | null;
  preFlightData?: Partial<PreFlightChecklistFormValues>;
  postFlightData?: Partial<PostFlightChecklistFormValues>;
  preFlightChecklist?: Partial<PreFlightChecklistFormValues>;
  postFlightChecklist?: Partial<PostFlightChecklistFormValues>;
  studentAttendees?: string[];
  personnelAttendees?: string[];
  externalAttendees?: string[];
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
    completionDate: string;
    status: 'Open' | 'Closed' | 'In Progress';
    isPreventative: boolean;
};

export type CorrectiveActionPlan = {
  id: string;
  rootCause: string;
  actions: CorrectiveAction[];
};


export type NonConformanceIssue = {
  id: string;
  itemText: string;
  regulationReference?: string;
  finding: FindingStatus;
  level: FindingLevel;
  comment?: string;
  reference?: string;
  correctiveActionPlans?: CorrectiveActionPlan[];
  photo?: string;
};

export type Signature = {
    signature: string;
    date: string;
}

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
  area: string;
  department?: Department;
  aircraftInvolved?: string;
  status: 'Open' | 'Closed' | 'Archived';
  complianceScore: number;
  checklistItems: AuditChecklistItem[];
  nonConformanceIssues: NonConformanceIssue[];
  summary: string;
  discussion?: DiscussionEntry[];
  auditTeam?: string[];
  auditeeTeam?: string[];
  auditorSignature?: Signature;
  auditeeSignature?: Signature;
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

export type AlertAcknowledgement = {
    userId: string;
    date: string;
};

export type Alert = {
  id: string;
  companyId?: string;
  number?: number;
  type: 'Red Tag' | 'Yellow Tag' | 'General Notice' | 'Task' | 'Signature Request' | 'System Health';
  title: string;
  description?: string; // This is now optional as it's replaced by more specific fields
  author: string;
  date: string;
  department?: Department;
  readBy: AlertAcknowledgement[];
  targetUserId?: string;
  relatedLink?: string;
  // New fields
  background?: string;
  purpose?: string;
  instruction?: string;
  reviewDate?: string;
  reviewerId?: string;
};

export type ComplianceItem = {
    id: string;
    companyId: string;
    regulation: string;
    regulationStatement: string;
    companyReference?: string;
    responsibleManager: string;
    lastAuditDate?: string;
    nextAuditDate?: string;
    findings?: string;
};

export type MocMitigation = {
  id: string;
  description: string;
  responsiblePerson?: string;
  completionDate?: string;
  status: 'Open' | 'In Progress' | 'Closed';
  residualLikelihood?: RiskLikelihood;
  residualSeverity?: RiskSeverity;
  residualRiskScore?: number;
};


export type MocRisk = {
  id: string;
  description: string;
  likelihood: RiskLikelihood;
  severity: RiskSeverity;
  riskScore: number;
  mitigations?: MocMitigation[];
};

export type MocHazard = {
  id: string;
  description: string;
  risks?: MocRisk[];
};

export type MocStep = {
    id: string;
    description: string;
    hazards?: MocHazard[];
};

export type MocPhase = {
  id: string;
  description: string;
  steps: MocStep[];
};

export type ManagementOfChange = {
  id: string;
  companyId: string;
  mocNumber: string;
  title: string;
  description: string;
  reason: string;
  scope: string;
  proposedBy: string;
  proposalDate: string;
  status: 'Proposed' | 'Under Review' | 'Approved' | 'Rejected' | 'Implemented' | 'Closed';
  phases?: MocPhase[];
  proposerSignature?: Signature;
  approverName?: string;
  approverSignature?: Signature;
};

export type TechnicalReport = {
  id: string;
  companyId: string;
  reportNumber: string;
  aircraftRegistration: string;
  component: string; // This is now 'System'
  subcomponent?: string; // This is now 'Component'
  otherComponent?: string;
  otherInstrument?: string;
  componentDetails?: string;
  description: string;
  reportedBy: string;
  dateReported: string;
  status?: 'Open' | 'Rectified';
  rectificationDetails?: string;
  componentsReplaced?: string;
  physicalLogEntry?: string;
  rectifiedBy?: string;
  rectificationDate?: string;
  photo?: string;
};

export type ExamQuestion = {
  id: string;
  text: string;
  options: { id: string; text: string }[];
  correctAnswer: string; // This will be the id of the correct option
  explanation?: string;
};

export type ExamAssignment = {
  userId: string;
  name: string;
  status: 'Not Started' | 'In Progress' | 'Completed' | 'Passed' | 'Failed';
  score?: number;
  attemptId?: string; // Link to the detailed ExamAttempt
};

export type Exam = {
  id: string;
  companyId: string;
  title: string;
  category: string;
  questions: ExamQuestion[];
  assignedTo?: ExamAssignment[];
};

export type UserAnswer = {
  questionId: string;
  selectedOptionId: string;
};

export type ExamAttempt = {
  id: string;
  examId: string;
  userId: string;
  dateTaken: string;
  score: number; // Percentage
  answers: UserAnswer[];
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
  'HireAndFly:View',
  'Safety:View',
  'Quality:View',
  'Checklists:View',
  'Alerts:View',
  'Reports:View',
  'Bookings:View',
];

export type CompanyPermission = {
    id: string;
    name: Permission;
    description?: string;
}

export type CompanyRole = {
    id: string;
    name: string;
    permissions: Permission[];
};

export type CompanyDepartment = {
    id: string;
    name: string;
};

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  'Super User': ['Super User'],
  'System Admin': ['Super User'],
  'Accountable Manager': [
    'Aircraft:View',
    'Students:View',
    'Personnel:View',
    'Safety:View',
    'Quality:View',
    'Checklists:View',
    'Alerts:View',
    'Reports:View',
    'Bookings:View',
    'Settings:Edit',
  ],
  'Admin': [
    'Aircraft:Edit',
    'Students:Edit',
    'Personnel:Edit',
    'Safety:View',
    'Quality:View',
    'Checklists:Edit',
    'Alerts:Edit',
    'Reports:View',
    'Bookings:Edit',
    'Settings:Edit',
  ],
  'Operations Manager': [
    'Aircraft:View',
    'Bookings:Edit',
    'Personnel:View',
  ],
  'HR Manager': ['Personnel:View', 'Personnel:Edit', 'Students:View', 'HireAndFly:View'],
  'Safety Manager': ['Safety:View', 'Safety:Edit', 'Reports:View', 'Aircraft:View'],
  'Quality Manager': ['Quality:View', 'Quality:Edit', 'Reports:View', 'Aircraft:View'],
  'Aircraft Manager': ['Aircraft:View', 'Aircraft:Edit', 'Aircraft:UpdateHobbs'],
  'Maintenance': ['Aircraft:View', 'Aircraft:Edit', 'Checklists:View', 'Checklists:Edit'],
  'Chief Flight Instructor': [
    'Students:View',
    'Students:Edit',
    'Personnel:View',
    'HireAndFly:View',
    'Bookings:View',
    'Bookings:Edit',
    'Checklists:View',
    'Exams:Edit',
  ],
  'Head Of Training': [
    'Students:View',
    'Students:Edit',
    'Personnel:View',
    'HireAndFly:View',
    'Bookings:View',
    'Bookings:Edit',
    'Checklists:View',
    'Exams:Edit',
  ],
  'Instructor': ['Students:View', 'Bookings:View', 'Checklists:View', 'Exams:View'],
  'Student': ['Students:View', 'Bookings:View', 'Exams:View'],
  'Hire and Fly': ['Bookings:View'],
  'Auditee': ['Quality:View'],
  'Driver': [],
  'Front Office': ['Bookings:View', 'Bookings:Edit', 'Students:View', 'Personnel:View', 'HireAndFly:View']
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

export const HIRE_AND_FLY_DOCUMENTS = [
  "Pilot License",
  "Medical Certificate",
  "Identification",
  "Passport",
] as const;

export type RiskLikelihood = 'Frequent' | 'Occasional' | 'Remote' | 'Improbable' | 'Extremely Improbable';
export type RiskSeverity = 'Catastrophic' | 'Hazardous' | 'Major' | 'Minor' | 'Negligible';
export type RiskStatus = 'Open' | 'Mitigated' | 'Closed';
export type AuditArea = string;
export type FindingStatus = 'Compliant' | 'Non Compliant' | 'Partial' | 'Not Applicable' | 'Observation';
export type FindingLevel = 'Level 1 Finding' | 'Level 2 Finding' | 'Level 3 Finding' | 'Observation' | null;
export type ChecklistCategory = 'Pre-Flight' | 'Post-Flight' | 'Post-Maintenance';
export type ChecklistItemType = 'Checkbox' | 'Textbox' | 'StandardCamera' | 'AICamera-Registration' | 'AICamera-Hobbs' | 'Header';
export type AuditChecklistItem = { id: string; text: string; finding: FindingStatus | null; level: FindingLevel; observation?: string; findingNotes?: string; evidence?: string; regulationReference?: string; reference?: string; comment?: string; photo?: string; suggestedImprovement?: string; type?: ChecklistItemType; };
