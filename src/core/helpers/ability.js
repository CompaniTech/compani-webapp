import { AbilityBuilder, createMongoAbility } from '@casl/ability';
import get from 'lodash/get';
import { roleBasedAccessControl } from '@helpers/rbac';
import {
  CLIENT_ADMIN,
  VENDOR_ADMIN,
  TRAINING_ORGANISATION_MANAGER,
  COACH,
  TRAINER,
  INTRA,
  INTRA_HOLDING,
  HOLDING_ADMIN,
  INTER_B2B,
  SINGLE,
} from '@data/constants';
import router from 'src/router/index';

const getClientAbilities = (role, subscriptions) => roleBasedAccessControl[role]
  .filter(r => !r.subscription || subscriptions.includes(r.subscription))
  .map(r => r.name);

const getRoleAbilities = role => roleBasedAccessControl[role].map(r => r.name);

export const defineAbilitiesFor = (user) => {
  const isVendorInterface = /\/ad\//.test(router.currentRoute.value.path);
  const { role, company } = user;
  const clientRole = get(role, 'client.name');
  const vendorRole = get(role, 'vendor.name');
  const holdingRole = get(role, 'holding.name');
  const { can, rules } = new AbilityBuilder(createMongoAbility);

  const companySubscriptions = company
    ? Object.keys(company.subscriptions).filter(key => company.subscriptions[key])
    : [];
  if (clientRole) can('read', getClientAbilities(clientRole, companySubscriptions));
  if (holdingRole) can('read', getClientAbilities(holdingRole, companySubscriptions));
  if (vendorRole) can('read', getRoleAbilities(vendorRole));
  if (!clientRole && !vendorRole) can('read', 'account client');
  if (isVendorInterface && [VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER].includes(vendorRole)) {
    can('set', 'user_company');
    can('update', 'coursebilling');
  }
  if (isVendorInterface && [VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER, TRAINER].includes(vendorRole)) {
    can('update', 'course_trainee_follow_up');
  }

  return createMongoAbility(rules);
};

export const defineAbilitiesForCourse = (user) => {
  const isVendorInterface = /\/ad\//.test(router.currentRoute.value.path);
  const { role } = user;

  const { can, rules } = new AbilityBuilder(createMongoAbility);

  if (isVendorInterface) {
    const vendorRole = get(role, 'vendor.name');

    can('read', 'Course', 'all_trainees');
    can('update', 'Course', 'sms');
    can('read', 'Course', 'history');
    can('create', 'Course', 'slot');
    can('update', 'Course', 'concerned_trainees', { type: { $ne: SINGLE } });
    if ([VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER].includes(vendorRole)) {
      can('update', 'Course', 'company_representative', { type: { $in: [INTRA, INTRA_HOLDING, SINGLE] } });
      can('update', 'Course', 'interlocutor');
      can('read', 'Course', 'companies');
      can('update', 'Course', 'companies', { type: { $in: [INTER_B2B, INTRA_HOLDING] } });
      can('update', 'Course', 'trainees');
      can('access', 'trainee');
      can('read', 'Course', 'certificates');
      can('read', 'Course', 'training_contracts', { type: { $ne: SINGLE } });
      can('read', 'Course', 'interlocutor');
      can('update', 'Course', 'certifying_test');
      can('update', 'Courses', 'trainer_missions');
      can('read', 'Course', 'sales_representative');
      can('set', 'Course', 'learner_list', { type: { $ne: SINGLE } });
    } else if (vendorRole === TRAINER) can('update', 'Course', 'trainees', { type: { $in: [INTRA, SINGLE] } });
  } else {
    const holdingRole = get(role, 'holding.name');
    const clientRole = get(role, 'client.name');

    can('update', 'Course', 'company_representative', { type: { $in: [INTRA, SINGLE] } });
    can('update', 'Course', 'trainees', { type: { $in: [INTRA_HOLDING, INTRA] } });
    can('update', 'Course', 'sms', { type: { $in: [INTRA, SINGLE] } });
    can('read', 'Course', 'history', { type: { $in: [INTRA, SINGLE] } });
    can('access', 'trainee');
    can('read', 'Course', 'training_contracts', { type: { $ne: SINGLE } });
    can('read', 'Course', 'certificates');

    if ([HOLDING_ADMIN].includes(holdingRole)) {
      can('update', 'Course', 'company_representative', { type: INTRA_HOLDING });
      can('update', 'Course', 'companies', { type: INTRA_HOLDING });
      can('read', 'Course', 'all_trainees');
      can('update', 'Course', 'sms', { type: INTRA_HOLDING });
      can('read', 'Course', 'history', { type: INTRA_HOLDING });
    } else if ([COACH, CLIENT_ADMIN].includes(clientRole)) {
      can('read', 'Course', 'all_trainees', { type: { type: { $in: [INTRA, SINGLE] } } });
    }
  }

  return createMongoAbility(rules);
};
