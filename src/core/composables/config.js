import { ref, computed } from 'vue';
import { useStore } from 'vuex';
import get from 'lodash/get';
import set from 'lodash/set';
import { extend } from '@helpers/utils';
import Companies from '@api/Companies';
import { NotifyNegative, NotifyPositive, NotifyWarning } from '@components/popup/notify';

export const useConfig = (
  v$,
  waitForValidation,
  billingRepresentativeModalLoading,
  tmpBillingRepresentativeId,
  billingRepresentativeModal
) => {
  const $store = useStore();

  const companyModel = {
    address: { fullAddress: '' },
    billingRepresentative: {},
  };

  const tmpInput = ref('');
  const resetCompany = ref({ ...companyModel });
  const company = ref({ ...companyModel });

  const loggedUser = computed(() => $store.state.main.loggedUser);
  const loggedCompany = computed(() => $store.getters['main/getCompany']);

  const saveTmp = (path) => {
    tmpInput.value = get(company.value, path);
  };

  const refreshCompany = async () => {
    await $store.dispatch('main/fetchLoggedUser', loggedUser.value._id);
    company.value = { ...extend(resetCompany.value, loggedCompany.value) };
    v$.value.company.$touch();
  };

  const updateCompany = async (path) => {
    try {
      console.log('tmp input', tmpInput.value);
      if (path === 'address' && tmpInput.value === get(company.value, 'address.fullAddress')) return;
      console.log('je passe ici ----');
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
      console.log('tmpInput.value', tmpInput.value);
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
