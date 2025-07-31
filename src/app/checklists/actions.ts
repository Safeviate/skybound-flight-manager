
'use server';

import { db } from '@/lib/firebase';
import { collection, writeBatch } from 'firebase/firestore';
import type { AuditChecklist } from '@/lib/types';

const PRE_FLIGHT_CHECKLIST: Omit<AuditChecklist, 'id' | 'companyId'> = {
  title: 'Master Pre-Flight Checklist',
  category: 'Pre-Flight',
  items: [
    { id: 'pre1', type: 'AICamera-Registration', text: 'Scan Aircraft Registration', completed: false },
    { id: 'pre2', type: 'StandardCamera', text: 'Take photo of Left Side of Aircraft', completed: false },
    { id: 'pre3', type: 'StandardCamera', text: 'Take photo of Right Side of Aircraft', completed: false },
    { id: 'pre4', type: 'AICamera-Hobbs', text: 'Scan Hobbs Meter for starting hours', completed: false },
    { id: 'pre5', type: 'Checkbox', text: 'Aircraft Checklist / POH onboard', completed: false },
    { id: 'pre6', type: 'Checkbox', text: 'Flight Operations Manual onboard', completed: false },
    { id: 'pre7', type: 'Textbox', text: 'Anything to Report?', completed: false },
  ],
};

const POST_FLIGHT_CHECKLIST: Omit<AuditChecklist, 'id' | 'companyId'> = {
  title: 'Master Post-Flight Checklist',
  category: 'Post-Flight',
  items: [
    { id: 'post1', type: 'StandardCamera', text: 'Take photo of Left Side of Aircraft', completed: false },
    { id: 'post2', type: 'StandardCamera', text: 'Take photo of Right Side of Aircraft', completed: false },
    { id: 'post3', type: 'AICamera-Hobbs', text: 'Scan Hobbs Meter for closing hours', completed: false },
    { id: 'post4', type: 'Textbox', text: 'Anything to Report?', completed: false },
  ],
};

const POST_MAINTENANCE_CHECKLIST: Omit<AuditChecklist, 'id' | 'companyId'> = {
  title: 'Master Post-Maintenance Checklist',
  category: 'Post-Maintenance',
  items: [
    { id: 'maint1', type: 'Checkbox', text: 'All tools and equipment removed from aircraft', completed: false },
    { id: 'maint2', type: 'Checkbox', text: 'All panels and cowlings secured', completed: false },
    { id: 'maint3', type: 'Checkbox', text: 'Fluid levels (oil, hydraulic fluid) checked', completed: false },
    { id: 'maint4', type: 'Textbox', text: 'Brief summary of work completed', completed: false },
    { id: 'maint5', type: 'Checkbox', text: 'Certificate of Release to Service signed', completed: false },
  ],
};

export async function createMasterChecklists(companyId: string) {
  const batch = writeBatch(db);
  const checklistsCollection = collection(db, `companies/${companyId}/audit-checklists`);

  const checklistsToCreate = [
    { id: 'master-pre-flight', data: PRE_FLIGHT_CHECKLIST },
    { id: 'master-post-flight', data: POST_FLIGHT_CHECKLIST },
    { id: 'master-post-maintenance', data: POST_MAINTENANCE_CHECKLIST },
  ];

  checklistsToCreate.forEach(checklist => {
    const docRef = doc(checklistsCollection, checklist.id);
    batch.set(docRef, { ...checklist.data, companyId });
  });

  await batch.commit();
}
