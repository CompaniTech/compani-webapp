import { ref, computed } from 'vue';
import { useStore } from 'vuex';
import get from 'lodash/get';
import set from 'lodash/set';
import Companies from '@api/Companies';
import { NotifyNegative, NotifyPositive, NotifyWarning } from '@components/popup/notify';

export const useConfig = (
  v$,
  waitForValidation,
  billingRepresentativeModalLoading,
  tmpBillingRepresentativeId,
  billingRepresentativeModal,
  company
) => {
  const $store = useStore();

  const tmpInput = ref('');

  const loggedUser = computed(() => $store.state.main.loggedUser);

  const saveTmp = (path) => {
    tmpInput.value = get(company.value, path);
  };

  const refreshCompany = async () => {
    await $store.dispatch('main/fetchLoggedUser', loggedUser.value._id);
    v$.value.company.$touch();
  };

  const updateCompany = async (path) => {
    try {
      if (path === 'address' && tmpInput.value === get(company.value, 'address.fullAddress')) return;
      if (tmpInput.value === get(company.value, path)) return;

      if (get(v$.value.company, path)) {
        const isValid = await waitForValidation(v$.value.company, path);
        if (!isValid) return NotifyWarning('Champ(s) invalide(s)');
      }

      let payload;
      if (path === 'billingRepresentative') {
        billingRepresentativeModalLoading.value = true;
        v$.value.tmpBillingRepresentativeId.$touch();
        if (v$.value.tmpBillingRepresentativeId.$error) return NotifyWarning('Champ(s) invalide(s)');

        payload = { billingRepresentative: tmpBillingRepresentativeId.value };
      } else {
        payload = set({}, path, get(company.value, path));
      }
      await Companies.updateById(company.value._id, payload);
      NotifyPositive('Modification enregistrée.');

      await refreshCompany();
      billingRepresentativeModal.value = false;
    } catch (e) {
      console.error(e);
      NotifyNegative('Erreur lors de la modification.');
    } finally {
      tmpInput.value = '';
      tmpBillingRepresentativeId.value = '';
      billingRepresentativeModalLoading.value = false;
    }
  };

  return {
    // Method
    saveTmp,
    refreshCompany,
    updateCompany,
  };
};
