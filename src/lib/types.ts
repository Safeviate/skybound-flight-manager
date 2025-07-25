

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

export type Feature = 'AdvancedAnalytics' | 'AIAuditAnalysis' | 'CustomChecklists';

export type Company = {
  id: string;
  name: string;
  trademark?: string;
  theme?: Partial<ThemeColors>;
  enabledFeatures?: Feature[];
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
  location: string; // Airport ID
  isPostFlightPending?: boolean;
  primaryStudentId?: string;
  primaryInstructorId?: string;
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
    'Checklists:View',
    'Checklists:Edit',
    'Alerts:View',
    'Alerts:Edit',
    'Reports:View',
    'Reports:Edit',
    'Settings:Edit',
    'Super User',
];

export type Department = 'Management' | 'Flight Operations' | 'Ground Operation' | 'Maintenance';

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
  | 'Student';

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
    // Student-specific
    instructor?: string;
    flightHours?: number;
    progress?: number;
    status?: 'Active' | 'Archived';
    endorsements?: Endorsement[];
    trainingLogs?: TrainingLogEntry[];
    // Personnel-specific
    department?: Department;
    medicalExpiry?: string;
    licenseExpiry?: string;
};

export type Booking = {
  id: string;
  companyId: string;
  date: string;
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
  subCategory?: string;
  phaseOfFlight?: string;
  lossOfSeparationType?: string;
  raCallout?: string;
  raFollowed?: 'Yes' | 'No';
  raNotFollowedReason?: string;
  aircraftInvolved?: string;
  location?: string;
  investigationTeam?: string[];
  investigationNotes?: string;
  occurrenceCategory?: string;
  discussion?: DiscussionEntry[];
  associatedRisks?: AssociatedRisk[];
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

export type GenerateCorrectiveActionPlanOutput = {
    summaryOfFindings: string;
    rootCause: string;
    correctiveActions: CorrectiveAction[];
};


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

export type FindingType = 'Compliant' | 'Non-compliant' | 'Partial' | 'Not Applicable' | 'Observation' | 'Level 1 Finding' | 'Level 2 Finding' | 'Level 3 Finding' | null;

export type AuditChecklistItem = {
    id: string;
    text: string;
    finding: FindingType;
    observation?: string;
    findingNotes?: string;
    evidence?: string;
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
    'Quality Manager': [...VIEW_ALL_PAGES, 'Quality:Edit', 'Alerts:Edit', 'Reports:View', 'Settings:Edit'],
    'Aircraft Manager': [...VIEW_ALL_PAGES, 'Aircraft:Edit', 'Aircraft:UpdateHobbs', 'Alerts:Edit'],
    'Maintenance': [...VIEW_ALL_PAGES, 'Aircraft:Edit', 'Aircraft:UpdateHobbs', 'Checklists:Edit'],
    'Chief Flight Instructor': [...VIEW_ALL_PAGES, 'Students:Edit', 'Bookings:Edit', 'Bookings:Approve', 'Personnel:View', 'Checklists:Edit', 'Alerts:Edit', 'Settings:Edit'],
    'Head Of Training': [...VIEW_ALL_PAGES, 'Students:Edit', 'Bookings:Edit', 'Bookings:Approve', 'Personnel:View', 'Checklists:Edit', 'Alerts:Edit', 'Settings:Edit'],
    'Instructor': [...VIEW_ALL_PAGES, 'Bookings:Edit', 'Bookings:Approve', 'Students:View', 'Checklists:View'],
    'Front Office': [...VIEW_ALL_PAGES],
    'Student': ['Bookings:View', 'Aircraft:View', 'Alerts:View'],
    'Driver': ['Alerts:View'],
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


export type NonConformanceIssue = {
  id: string;
  level: FindingType;
  category: 'Documentation' | 'Procedural' | 'Equipment' | 'Training';
  description: string;
};

export type QualityAudit = {
  id: string;
  companyId: string;
  date: string;
  type: 'Internal' | 'External';
  auditor: string;
  area: 'Flight Operations' | 'Maintenance' | 'Ground Ops' | 'Management';
  status: 'Compliant' | 'With Findings' | 'Non-Compliant';
  complianceScore: number;
  nonConformanceIssues: NonConformanceIssue[];
  summary: string;
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
  number: number;
  type: 'Red Tag' | 'Yellow Tag';
  title: string;
  description: string;
  author: string;
  date: string;
  readBy: string[];
};
