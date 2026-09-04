import { Platform } from 'quasar';
import get from 'lodash/get';
import users from '@api/Users';
import { userModel } from '@data/user';
import { extend } from '@helpers/utils';
import { logOutAndRedirectToLogin } from 'src/router/redirect';

export default {
  namespaced: true,
  state: {
    loggedUser: null,
    drawer: !!Platform.is.desktop || window.innerWidth >= 1024,
  },
  mutations: {
    SET_DRAWER: (state, toggle) => { state.drawer = toggle; },
    SET_LOGGED_USER: (state, user) => { state.loggedUser = user; },
  },
  actions: {
    setDrawer: ({ commit }, toggle) => { commit('SET_DRAWER', toggle); },
    fetchLoggedUser: async ({ commit }, userId) => {
      try {
        const user = await users.getById(userId);

        commit('SET_LOGGED_USER', { ...extend(userModel, user) });
      } catch (e) {
        if (!e) return; // If the api does not respond anything
        console.error(e);
        commit('SET_LOGGED_USER', null);
        logOutAndRedirectToLogin();
      }
    },
    resetMain: ({ commit }) => {
      commit('SET_LOGGED_USER', null);
      commit('SET_DRAWER', !!Platform.is.desktop || window.innerWidth >= 1024);
    },
  },
  getters: {
    getLoggedUser: state => state.loggedUser,
    getCompany: state => state.loggedUser.company,
    getClientRole: state => get(state, 'loggedUser.role.client.name'),
    getVendorRole: state => get(state, 'loggedUser.role.vendor.name'),
  },
};
