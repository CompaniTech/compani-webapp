<template>
  <div v-if="company">
    <p class="text-weight-bold">Accompagnement</p>
    <div class="interlocutor-container q-mb-xl">
      <ni-interlocutor-cell :interlocutor="company.salesRepresentative" caption="Chargé d'accompagnement"
        can-update label="Ajouter un chargé d'accompagnement" @open-modal="openSalesRepresentativeModal" />
    </div>
    <div class="q-mb-xl">
      <p class="text-weight-bold">Informations générales</p>
      <div class="row gutter-profile">
        <ni-input caption="Raison sociale" v-model="company.name" @focus="saveTmp('name')"
          @blur="trimAndUpdateCompany('name')" :error="v$.company.name.$error" />
        <ni-search-address v-model="company.address" :error-message="addressError" @blur="updateCompany('address')"
            @focus="saveTmp('address.fullAddress')" :error="v$.company.address.$error" />
      </div>
    </div>
    <div class="q-mb-xl">
      <p class="text-weight-bold">Coordonnées bancaires</p>
      <div class="row gutter-profile">
        <ni-input caption="IBAN" v-model="company.iban" :error="v$.company.iban.$error" required-field
          :error-message="ibanErrorMessage" @focus="saveTmp('iban')" @blur="updateCompany('iban')" />
        <ni-input caption="BIC" v-model="company.bic" :error="v$.company.bic.$error" required-field
          :error-message="bicErrorMessage" @focus="saveTmp('bic')" @blur="updateCompany('bic')" />
      </div>
    </div>
    <ni-coach-list :company="company" />
  </div>

  <ni-interlocutor-modal v-model="salesRepresentativeModal" v-model:interlocutor="tmpSalesRepresentativeId"
    @submit="updateCompany('salesRepresentative')" :label="salesRepresentativeModalLabel"
    :interlocutors-options="salesRepresentativeOptions" :loading="salesRepresentativeModalLoading"
    @hide="resetSalesRepresentative" :validations="v$.tmpSalesRepresentativeId" />
</template>

<script>
import useVuelidate from '@vuelidate/core';
import { computed, ref, toRefs } from 'vue';
import { useStore } from 'vuex';
import { required } from '@vuelidate/validators';
import get from 'lodash/get';
import set from 'lodash/set';
import Companies from '@api/Companies';
import Users from '@api/Users';
import SearchAddress from '@components/form/SearchAddress';
import Input from '@components/form/Input';
import CoachList from '@components/table/CoachList';
import { NotifyNegative, NotifyWarning, NotifyPositive } from '@components/popup/notify';
import InterlocutorCell from '@components/courses/InterlocutorCell';
import InterlocutorModal from '@components/courses/InterlocutorModal';
import { frAddress, iban, bic } from '@helpers/vuelidateCustomVal';
import { formatAndSortUserOptions } from '@helpers/utils';
import { useValidations } from '@composables/validations';
import { useCompanies } from '@composables/companies';
import { TRAINING_ORGANISATION_MANAGER, VENDOR_ADMIN, EDITION } from '@data/constants';

export default {
  name: 'ProfileInfo',
  props: {
    profileId: { type: String, required: true },
  },
  components: {
    'ni-input': Input,
    'ni-coach-list': CoachList,
    'ni-search-address': SearchAddress,
    'ni-interlocutor-cell': InterlocutorCell,
    'ni-interlocutor-modal': InterlocutorModal,
  },
  setup (props) {
    const { profileId } = toRefs(props);
    const tmpInput = ref('');
    const salesRepresentativeOptions = ref([]);
    const tmpSalesRepresentativeId = ref('');
    const salesRepresentativeModal = ref(false);
    const salesRepresentativeModalLoading = ref(false);
    const salesRepresentativeModalLabel = ref({ action: '', interlocutor: '' });

    const $store = useStore();
    const company = computed(() => $store.state.company.company);

    const companyRules = computed(() => ({
      company: {
        name: { required },
        address: {
          zipCode: { required },
          street: { required },
          city: { required },
          fullAddress: { required, frAddress },
          location: { required },
        },
        iban: { required, iban },
        bic: { required, bic },
      },
      tmpSalesRepresentativeId: { required },
    }));
    const v$ = useVuelidate(companyRules, { company, tmpSalesRepresentativeId });

    const { waitForValidation } = useValidations();

    const { addressError, ibanErrorMessage, bicErrorMessage } = useCompanies(v$);

    const saveTmp = (path) => { tmpInput.value = get(company.value, path); };

    const refreshCompany = async () => {
      try {
        await $store.dispatch('company/fetchCompany', { companyId: profileId.value });
      } catch (e) {
        console.error(e);
      }
    };

    const trimAndUpdateCompany = async (path) => {
      const value = get(company.value, path);
      set(company.value, path, value ? value.trim() : '');

      await updateCompany(path);
    };

    const updateCompany = async (path) => {
      try {
        const value = get(company.value, path);
        if (path === 'address' && tmpInput.value === get(company.value, 'address.fullAddress')) return;
        if (tmpInput.value === value) return;

        let payload;
        if (path === 'salesRepresentative') {
          v$.value.tmpSalesRepresentativeId.$touch();
          if (v$.value.tmpSalesRepresentativeId.$error) return NotifyWarning('Champ invalide');

          payload = { salesRepresentative: tmpSalesRepresentativeId.value };
        } else {
          v$.value.company.$touch();
          if (path === 'address') {
            const isValid = await waitForValidation(v$.value.company, path);
            if (!isValid) return NotifyWarning('Champ(s) invalide(s)');
          } else if (v$.value.company[path].$error) return NotifyWarning('Champ invalide');

          payload = set({}, path, value);
        }

        await Companies.updateById(company.value._id, payload);

        NotifyPositive('Modification enregistrée.');
        salesRepresentativeModal.value = false;

        await refreshCompany();
      } catch (e) {
        console.error(e);
        if (e.message === 'Champ(s) invalide(s)') return NotifyWarning(e.message);
        if (e.status === 409) return NotifyNegative(e.data.message);
        NotifyNegative('Erreur lors de la modification.');
      } finally {
        tmpInput.value = '';
      }
    };

    const refreshSalesRepresentativeOptions = async () => {
      const rofAndAdminUsers = await Users.list({ role: [TRAINING_ORGANISATION_MANAGER, VENDOR_ADMIN] });

      salesRepresentativeOptions.value = formatAndSortUserOptions(rofAndAdminUsers, false);
    };

    const openSalesRepresentativeModal = (event) => {
      const { action: eventAction } = event;
      const action = eventAction === EDITION ? 'Modifier le ' : 'Ajouter un ';

      tmpSalesRepresentativeId.value = get(company.value, 'salesRepresentative._id');
      salesRepresentativeModalLabel.value = { action, interlocutor: 'chargé d\'accompagnement' };
      salesRepresentativeModal.value = true;
    };

    const resetSalesRepresentative = () => {
      tmpSalesRepresentativeId.value = '';
      salesRepresentativeModalLabel.value = { action: '', interlocutor: '' };
      salesRepresentativeModalLoading.value = false;
      v$.value.tmpSalesRepresentativeId.$reset();
    };

    const created = async () => {
      if (!company.value) await refreshCompany();
      await refreshSalesRepresentativeOptions();
    };

    created();

    return {
      // Data
      tmpInput,
      salesRepresentativeOptions,
      salesRepresentativeModal,
      salesRepresentativeModalLabel,
      salesRepresentativeModalLoading,
      tmpSalesRepresentativeId,
      // Validations
      v$,
      // Computed
      company,
      addressError,
      ibanErrorMessage,
      bicErrorMessage,
      // Methods
      saveTmp,
      trimAndUpdateCompany,
      updateCompany,
      refreshSalesRepresentativeOptions,
      openSalesRepresentativeModal,
      resetSalesRepresentative,
    };
  },
};
</script>
