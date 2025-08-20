import { ref, computed } from 'vue';
import { useStore } from 'vuex';
import get from 'lodash/get';
import pick from 'lodash/pick';
import {
  CLIENT_ADMIN,
  AUXILIARY,
  PLANNING_REFERENT,
  AUXILIARY_ROLES,
  COACH_ROLES,
} from '@data/constants';
import { defineAbilitiesFor } from '@helpers/ability';

export const useMenuItems = () => {
  const $store = useStore();

  const coachActiveRoutes = ref({
    courses: { open: true },
    customers: { open: false },
    teams: { open: false },
    billing: { open: false },
    pay: { open: false },
    exports: { open: false },
    configuration: { open: false },
  });

  const loggedUser = computed(() => $store.state.main.loggedUser);

  const clientRole = computed(() => get(loggedUser.value, 'role.client.name'));

  const isAdmin = computed(() => CLIENT_ADMIN === clientRole.value);

  const isAuxiliaryWithCompany = computed(() => [AUXILIARY, PLANNING_REFERENT].includes(clientRole.value));

  const isAuxiliary = computed(() => AUXILIARY_ROLES.includes(clientRole.value));

  const isCoach = computed(() => COACH_ROLES.includes(clientRole.value));

  const activeRoutes = computed(() => {
    if (isCoach.value) return coachActiveRoutes.value;
    return {};
  });

  const coachRoutes = computed(() => [
    {
      ref: 'courses',
      label: 'Formations',
      children: [
        { name: 'ni courses dashboard', icon: 'assessment', label: 'Tableau de bord' },
        { name: 'ni courses', icon: 'mdi-teach', label: 'Formations mixtes' },
        { name: 'ni elearning courses', icon: 'stay_primary_portrait', label: 'Formations eLearning' },
        { name: 'ni courses learners', icon: 'contacts', label: 'Apprenants' },
        { name: 'ni courses bills', icon: 'receipt', label: 'Factures' },
        { name: 'ni courses contacts', icon: 'people', label: 'Contacts Compani' },
      ],
    },
    {
      ref: 'billing',
      label: 'Facturation',
      children: [
        { name: 'ni billing clients balances', icon: 'mdi-scale-balance', label: 'Balances clients' },
      ],
    },
    {
      ref: 'exports',
      label: 'Exports',
      children: [
        { name: 'ni exports data', icon: 'list_alt', label: 'Données' },
        { name: 'ni exports history', icon: 'history', label: 'Historique' },
      ],
    },
    {
      ref: 'configuration',
      label: 'Configuration',
      children: [
        { name: 'ni config company', icon: 'settings', label: 'Configuration générale' },
        { name: 'ni config coach', icon: 'people', label: 'Coachs' },
      ],
    },
  ]);

  const routes = computed(() => {
    let availableRoutes = [];
    const ability = defineAbilitiesFor(pick(loggedUser.value, ['role', 'company']));

    if (isCoach.value) availableRoutes = coachRoutes.value;

    return availableRoutes
      .map(r => ({ ...r, children: r.children.filter(c => ability.can('read', c.name)) }))
      .filter(r => (r.children ? r.children.length : ability.can('read', r.name)));
  });

  return {
    // Computed
    isAdmin,
    isAuxiliaryWithCompany,
    isAuxiliary,
    isCoach,
    activeRoutes,
    routes,
  };
};
