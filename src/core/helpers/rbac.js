import {
  CLIENT_ADMIN,
  COACH,
  PLANNING_REFERENT,
  AUXILIARY,
  HELPER,
  VENDOR_ADMIN,
  TRAINER,
  TRAINING_ORGANISATION_MANAGER,
  AUXILIARY_WITHOUT_COMPANY,
  ERP,
  HOLDING_ADMIN,
} from '@data/constants';

const coachRoutes = [
  { name: 'ni exports data', subscription: ERP },
  { name: 'ni exports history', subscription: ERP },
  { name: 'account client' },
  { name: 'ni courses' },
  { name: 'ni courses dashboard' },
  { name: 'ni courses info' },
  { name: 'ni courses learners' },
  { name: 'ni courses learners info' },
  { name: 'ni courses contacts' },
  { name: 'ni elearning courses' },
  { name: 'ni elearning courses info' },
];
const clientAdminRoutes = [
  ...coachRoutes,
  { name: 'ni config company' },
  { name: 'ni config coach' },
  { name: 'ni billing clients balances', subscription: ERP },
  { name: 'ni courses bills' },
];
const auxiliaryRoutes = [
  { name: 'account client' },
];
const helperRoutes = [
  { name: 'account client' },
];
const trainingOrganisationManagerRoutes = [
  { name: 'ni users companies' },
  { name: 'ni users holdings' },
  { name: 'ni users companies info' },
  { name: 'ni users holdings info' },
  { name: 'ni users trainers' },
  { name: 'ni users trainers info' },
  { name: 'ni users learners' },
  { name: 'ni users learners info' },
  { name: 'ni pedagogy programs' },
  { name: 'ni pedagogy categories' },
  { name: 'ni pedagogy programs info' },
  { name: 'ni pedagogy activity info' },
  { name: 'ni pedagogy questionnaires' },
  { name: 'ni pedagogy questionnaire profile' },
  { name: 'ni pedagogy questionnaire answers' },
  { name: 'ni management blended courses' },
  { name: 'ni management single courses' },
  { name: 'ni management blended courses info' },
  { name: 'ni management elearning courses' },
  { name: 'ni management elearning courses info' },
  { name: 'account vendor' },
  { name: 'ni exports history vendor' },
  { name: 'ni billing config' },
  { name: 'ni billing completion certificates' },
  { name: 'trainers questionnaire answers' },
  { name: 'ni billing dashboard' },
  { name: 'ni billing directory' },
];
const vendorAdminRoutes = [...trainingOrganisationManagerRoutes];
const trainerRoutes = [
  { name: 'trainers courses' },
  { name: 'trainers courses info' },
  { name: 'trainers info' },
  { name: 'trainers contracts' },
  { name: 'account vendor' },
  { name: 'trainers questionnaire answers' },
  { name: 'ni pedagogy questionnaire answers' },
];

export const roleBasedAccessControl = {
  [HOLDING_ADMIN]: clientAdminRoutes,
  [CLIENT_ADMIN]: clientAdminRoutes,
  [COACH]: coachRoutes,
  [AUXILIARY_WITHOUT_COMPANY]: auxiliaryRoutes,
  [AUXILIARY]: auxiliaryRoutes,
  [PLANNING_REFERENT]: auxiliaryRoutes,
  [HELPER]: helperRoutes,
  [VENDOR_ADMIN]: vendorAdminRoutes,
  [TRAINING_ORGANISATION_MANAGER]: trainingOrganisationManagerRoutes,
  [TRAINER]: trainerRoutes,
};
