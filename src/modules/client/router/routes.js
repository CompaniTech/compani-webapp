import { canNavigate } from '@helpers/alenvi';
import { HELPER, AUXILIARY_ROLES, COACH_ROLES } from 'src/core/data/constants';
import store from 'src/store/index';
import { logOutAndRedirectToLogin } from 'src/router/redirect';

const routes = [
  {
    path: '/',
    components: { default: () => import('src/modules/client/layouts/Layout') },
    beforeEnter: async (to, from, next) => {
      try {
        if (to.path !== '/') return next();

        const canNav = await canNavigate();
        if (!canNav) return logOutAndRedirectToLogin();

        const userVendorRole = store.getters['main/getVendorRole'];
        const userClientRole = store.getters['main/getClientRole'];
        if (!userClientRole && !userVendorRole) return next({ name: 'account client' });
        if (userVendorRole) return next({ path: '/ad' });

        if ([...AUXILIARY_ROLES, HELPER].includes(userClientRole)) return next({ name: 'account client' });
        if (COACH_ROLES.includes(userClientRole)) return next({ name: 'ni courses' });

        return next({ name: '404' });
      } catch (e) {
        console.error(e);
      }
    },
    children: [
      {
        path: 'ni/config/company',
        name: 'ni config company',
        component: () => import('src/modules/client/pages/ni/config/CompanyConfig'),
        meta: {
          cookies: ['alenvi_token', 'refresh_token'],
          parent: 'configuration',
        },
      },
      {
        path: 'ni/config/coachs',
        name: 'ni config coach',
        component: () => import('src/modules/client/pages/ni/config/CoachConfig'),
        meta: {
          cookies: ['alenvi_token', 'refresh_token'],
          parent: 'configuration',
        },
      },
      {
        path: 'ni/billing/clients-balances',
        name: 'ni billing clients balances',
        component: () => import('src/modules/client/pages/ni/billing/ClientsBalances'),
        meta: {
          cookies: ['alenvi_token', 'refresh_token'],
          parent: 'billing',
        },
      },
      {
        path: 'ni/exports/data',
        name: 'ni exports data',
        component: () => import('src/modules/client/pages/ni/exports/DataExports'),
        meta: {
          cookies: ['alenvi_token', 'refresh_token'],
          parent: 'exports',
        },
      },
      {
        path: 'ni/exports/history',
        name: 'ni exports history',
        component: () => import('src/modules/client/pages/ni/exports/HistoryExports'),
        meta: {
          cookies: ['alenvi_token', 'refresh_token'],
          parent: 'exports',
        },
      },
      {
        path: 'ni/courses',
        name: 'ni courses',
        component: () => import('src/modules/client/pages/ni/courses/BlendedCoursesDirectory'),
        meta: {
          cookies: ['alenvi_token', 'refresh_token'],
          parent: 'courses',
        },
      },
      {
        path: 'ni/courses/dashboard',
        name: 'ni courses dashboard',
        component: () => import('src/modules/client/pages/ni/courses/Dashboard'),
        meta: {
          cookies: ['alenvi_token', 'refresh_token'],
          parent: 'courses',
        },
      },
      {
        path: 'ni/courses/elearning-courses',
        name: 'ni elearning courses',
        component: () => import('src/modules/client/pages/ni/courses/ELearningCoursesDirectory'),
        meta: {
          cookies: ['alenvi_token', 'refresh_token'],
          parent: 'courses',
        },
      },
      {
        path: 'ni/courses/elearning-courses/:courseId',
        name: 'ni elearning courses info',
        component: () => import('src/modules/client/pages/ni/courses/ELearningCourseProfile'),
        props: true,
        meta: {
          cookies: ['alenvi_token', 'refresh_token'],
          parent: 'courses',
        },
      },
      {
        path: 'ni/courses/learners',
        name: 'ni courses learners',
        component: () => import('src/modules/client/pages/ni/courses/LearnersDirectory'),
        meta: {
          cookies: ['alenvi_token', 'refresh_token'],
          parent: 'courses',
        },
      },
      {
        path: 'ni/courses/contacts',
        name: 'ni courses contacts',
        component: () => import('src/modules/client/pages/ni/courses/ContactProfile'),
        meta: {
          cookies: ['alenvi_token', 'refresh_token'],
          parent: 'courses',
        },
      },
      {
        path: 'ni/users/learners/:learnerId',
        name: 'ni courses learners info',
        component: () => import('src/modules/client/pages/ni/courses/LearnerProfile'),
        beforeEnter: async (to, from, next) => {
          try {
            if (from.name === 'ni courses info') to.query.defaultTab = 'courses';
            if (from.name === 'ni elearning courses info') to.query.defaultTab = 'courses';

            return next();
          } catch (e) {
            console.error(e);
          }
        },
        props: route => ({ ...route.params, ...route.query }),
        meta: {
          cookies: ['alenvi_token', 'refresh_token'],
          parent: 'courses',
        },
      },
      {
        path: 'ni/courses/:courseId',
        name: 'ni courses info',
        component: () => import('src/modules/client/pages/ni/courses/BlendedCourseProfile'),
        beforeEnter: async (to, from, next) => {
          try {
            if (from.name === 'ni courses learners info' && !to.query.defaultTab) {
              to.query.defaultTab = 'traineeFollowUp';
            }

            return next();
          } catch (e) {
            console.error(e);
          }
        },
        props: route => ({ ...route.params, ...route.query }),
        meta: {
          cookies: ['alenvi_token', 'refresh_token'],
          parent: 'courses',
        },
      },
      {
        path: 'ni/courses/bills',
        name: 'ni courses bills',
        component: () => import('src/modules/client/pages/ni/courses/BillingProfile'),
        props: true,
        meta: {
          cookies: ['alenvi_token', 'refresh_token'],
          parent: 'courses',
        },
      },
      {
        path: 'ni/courses/completion-certificates',
        name: 'ni courses completion certificates',
        component: () => import('src/modules/vendor/pages/ni/billing/CompletionCertificatesDashboard'),
        meta: {
          cookies: ['alenvi_token', 'refresh_token'],
          parent: 'courses',
        },
      },
      // All profiles
      {
        path: 'account',
        name: 'account client',
        component: () => import('src/core/pages/AccountInfo'),
        meta: {
          cookies: ['alenvi_token', 'refresh_token'],
        },
      },
    ],
  },
];

export default routes;
