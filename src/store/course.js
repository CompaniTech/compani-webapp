import get from 'lodash/get';
import Courses from '@api/Courses';
import router from 'src/router/index';
import store from 'src/store/index';
import { hasUserAccessToCompany } from '@helpers/userCompanies';
import { UNARCHIVED_COURSES } from '../core/data/constants';

export default {
  namespaced: true,
  state: {
    course: null,
    companiesHoldings: null,
    selectedTrainer: '',
    selectedTrainee: '',
    selectedProgram: '',
    selectedHolding: '',
    selectedCompany: '',
    selectedOperationsRepresentative: '',
    selectedStartDate: '',
    selectedEndDate: '',
    selectedType: '',
    selectedNoAddressInSlots: false,
    selectedMissingTrainees: false,
    selectedArchiveStatus: '',
    selectedSalesRepresentative: '',
  },
  mutations: {
    SET_COURSE: (state, data) => { state.course = data ? ({ ...data }) : data; },
    SET_COMPANIES_HOLDINGS: (state, data) => { state.companiesHoldings = data ? ({ ...data }) : data; },
    SET_SELECTED_TRAINER: (state, data) => { state.selectedTrainer = data; },
    SET_SELECTED_TRAINEE: (state, data) => { state.selectedTrainee = data; },
    SET_SELECTED_PROGRAM: (state, data) => { state.selectedProgram = data; },
    SET_SELECTED_HOLDING: (state, data) => { state.selectedHolding = data; },
    SET_SELECTED_COMPANY: (state, data) => { state.selectedCompany = data; },
    SET_SELECTED_OPERATIONS_REPRESENTATIVE: (state, data) => { state.selectedOperationsRepresentative = data; },
    SET_SELECTED_START_DATE: (state, data) => { state.selectedStartDate = data; },
    SET_SELECTED_END_DATE: (state, data) => { state.selectedEndDate = data; },
    SET_SELECTED_TYPE: (state, data) => { state.selectedType = data; },
    SET_SELECTED_NO_ADDRESS_IN_SLOTS: (state, data) => { state.selectedNoAddressInSlots = data; },
    SET_SELECTED_MISSING_TRAINEES: (state, data) => { state.selectedMissingTrainees = data; },
    SET_SELECTED_ARCHIVE_STATUS: (state, data) => { state.selectedArchiveStatus = data; },
    SET_SELECTED_SALES_REPRESENTATIVE: (state, data) => { state.selectedSalesRepresentative = data; },
  },
  actions: {
    fetchCourse: async ({ commit }, params) => {
      try {
        const course = await Courses.getById(params.courseId);
        if (!get(course, 'trainers', []).length) course.trainers = [{ _id: '' }];
        if (!get(course, 'operationsRepresentative._id')) course.operationsRepresentative = { _id: '' };
        if (!get(course, 'contact._id')) course.contact = { _id: '' };
        if (!get(course, 'companyRepresentative._id')) course.companyRepresentative = { _id: '' };
        if (!get(course, 'salesRepresentative._id')) course.salesRepresentative = { _id: '' };

        // Coachs and client admins with vendor role only see trainees from their companies on client interface
        const userClientRole = store.getters['main/getClientRole'];
        if (userClientRole && !/\/ad\//.test(router.currentRoute.value.path)) {
          const loggedUser = store.getters['main/getLoggedUser'];
          course.trainees = course.trainees.filter(t => hasUserAccessToCompany(loggedUser, t.registrationCompany));
          if (course.companies) {
            course.companies = course.companies.filter(company => hasUserAccessToCompany(loggedUser, company._id));
          }
        }

        commit('SET_COURSE', course);
      } catch (e) {
        console.error(e);
      }
    },
    resetCourse: ({ commit }) => { commit('SET_COURSE', null); },
    setCompaniesHoldings: ({ commit }, params) => { commit('SET_COMPANIES_HOLDINGS', params.companiesHoldings); },
    resetCompaniesHoldings: ({ commit }) => { commit('SET_COMPANIES_HOLDINGS', null); },
    setSelectedTrainer: ({ commit }, params) => { commit('SET_SELECTED_TRAINER', params.trainerId); },
    setSelectedTrainee: ({ commit }, params) => { commit('SET_SELECTED_TRAINEE', params.traineeId); },
    setSelectedProgram: ({ commit }, params) => { commit('SET_SELECTED_PROGRAM', params.programId); },
    setSelectedHolding: ({ commit }, params) => { commit('SET_SELECTED_HOLDING', params.holdingId); },
    setSelectedCompany: ({ commit }, params) => { commit('SET_SELECTED_COMPANY', params.companyId); },
    setSelectedOperationsRepresentative: ({ commit }, params) => {
      commit('SET_SELECTED_OPERATIONS_REPRESENTATIVE', params.operationsRepresentativeId);
    },
    setSelectedStartDate: ({ commit }, params) => { commit('SET_SELECTED_START_DATE', params.startDate); },
    setSelectedEndDate: ({ commit }, params) => { commit('SET_SELECTED_END_DATE', params.endDate); },
    setSelectedType: ({ commit }, params) => { commit('SET_SELECTED_TYPE', params.type); },
    setSelectedNoAddressInSlots: ({ commit }, params) => commit('SET_SELECTED_NO_ADDRESS_IN_SLOTS', params.isSelected),
    setSelectedMissingTrainees: ({ commit }, params) => commit('SET_SELECTED_MISSING_TRAINEES', params.isSelected),
    setSelectedArchiveStatus: ({ commit }, params) => commit('SET_SELECTED_ARCHIVE_STATUS', params.status),
    setSelectedSalesRepresentative: ({ commit }, params) => {
      commit('SET_SELECTED_SALES_REPRESENTATIVE', params.salesRepresentativeId);
    },
    resetFilters: ({ commit }, params = {}) => {
      commit('SET_SELECTED_TRAINER', '');
      commit('SET_SELECTED_TRAINEE', '');
      commit('SET_SELECTED_PROGRAM', '');
      commit('SET_SELECTED_HOLDING', '');
      commit('SET_SELECTED_COMPANY', '');
      commit('SET_SELECTED_OPERATIONS_REPRESENTATIVE', '');
      commit('SET_SELECTED_START_DATE', '');
      commit('SET_SELECTED_END_DATE', '');
      commit('SET_SELECTED_TYPE', '');
      commit('SET_SELECTED_NO_ADDRESS_IN_SLOTS', false);
      commit('SET_SELECTED_MISSING_TRAINEES', false);
      commit('SET_SELECTED_ARCHIVE_STATUS', params.isClientInterfaceOrTrainer ? '' : UNARCHIVED_COURSES);
      commit('SET_SELECTED_SALES_REPRESENTATIVE', '');
    },
  },
  getters: {},
};
