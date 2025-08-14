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
    <div class="q-mb-xl">
      <p class="text-weight-bold">Mandats de prélèvements</p>
       <q-card>
        <ni-responsive-table :columns="mandatesColumns" :data="debitMandates" class="mandate-table"
          :loading="mandatesLoading" v-model:pagination="pagination">
          <template #body="{ props }">
            <q-tr :props="props">
              <q-td v-for="col in props.cols" :key="col.name" :data-label="col.label" :props="props" :class="col.name"
                :style="col.style">
                <template v-if="col.name === 'emptyMandate'">
                  <ni-button v-if="isLastCreatedMandate(props.row)" @click="downloadMandate(props.row)"
                    icon="file_download" />
                </template>
                <template v-else-if="col.name === 'signedAt'">
                  <ni-date-input in-modal :model-value="debitMandatesGroupById[props.row._id].signedAt"
                    @update:model-value="updateMandate($event, props.row)" @focus="saveTmpSignedAt(props.row._id)" />
                </template>
                <template v-else>{{ col.value }}</template>
              </q-td>
            </q-tr>
          </template>
        </ni-responsive-table>
      </q-card>
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
import keyBy from 'lodash/keyBy';
import Companies from '@api/Companies';
import Users from '@api/Users';
import VendorCompanies from '@api/VendorCompanies';
import SearchAddress from '@components/form/SearchAddress';
import Input from '@components/form/Input';
import CoachList from '@components/table/CoachList';
import { NotifyNegative, NotifyWarning, NotifyPositive } from '@components/popup/notify';
import InterlocutorCell from '@components/courses/InterlocutorCell';
import InterlocutorModal from '@components/courses/InterlocutorModal';
import ResponsiveTable from '@components/table/ResponsiveTable';
import Button from '@components/Button';
import DateInput from '@components/form/DateInput';
import CompaniDate from '@helpers/dates/companiDates';
import { frAddress, iban, bic } from '@helpers/vuelidateCustomVal';
import { formatAndSortUserOptions } from '@helpers/utils';
import { descendingSortBy } from '@helpers/dates/utils';
import { downloadDocx } from '@helpers/file';
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
    'ni-button': Button,
    'ni-coach-list': CoachList,
    'ni-search-address': SearchAddress,
    'ni-interlocutor-cell': InterlocutorCell,
    'ni-interlocutor-modal': InterlocutorModal,
    'ni-responsive-table': ResponsiveTable,
    'ni-date-input': DateInput,
  },
  setup (props) {
    const { profileId } = toRefs(props);
    const tmpInput = ref('');
    const salesRepresentativeOptions = ref([]);
    const tmpSalesRepresentativeId = ref('');
    const salesRepresentativeModal = ref(false);
    const salesRepresentativeModalLoading = ref(false);
    const salesRepresentativeModalLabel = ref({ action: '', interlocutor: '' });
    const mandatesColumns = ref([
      { name: 'rum', label: 'RUM', align: 'left', field: 'rum' },
      { name: 'emptyMandate', label: 'Mandat vierge', align: 'center' },
      { name: 'signedAt', label: 'Date de signature', align: 'left', field: 'signedAt' },
    ]);
    const pagination = ref({ sortBy: 'createdAt', ascending: true, rowsPerPage: 0 });
    const mandatesLoading = ref(false);

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

    const debitMandatesGroupById = computed(() => keyBy(company.value.debitMandates, m => m._id));

    const { waitForValidation } = useValidations();

    const debitMandates = computed(() => [...company.value.debitMandates].sort(descendingSortBy('createdAt')));

    const { addressError, ibanErrorMessage, bicErrorMessage } = useCompanies(v$);

    const saveTmp = (path) => { tmpInput.value = get(company.value, path); };

    const saveTmpSignedAt = (mandateId) => {
      tmpInput.value = debitMandatesGroupById.value[mandateId].signedAt;
    };

    const refreshCompany = async () => {
      try {
        mandatesLoading.value = true;
        await $store.dispatch('company/fetchCompany', { companyId: profileId.value });
      } catch (e) {
        console.error(e);
      } finally {
        mandatesLoading.value = false;
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

    const isLastCreatedMandate = mandate => company.value.debitMandates
      .every(m => CompaniDate(m.createdAt).isSameOrBefore(mandate.createdAt));

    const downloadMandate = async (mandate) => {
      try {
        const vendorCompany = await VendorCompanies.get();
        const mandateDriveId = get(vendorCompany, 'debitMandateTemplate.driveId', null);
        if (!mandateDriveId) return NotifyWarning('Template manquant dans la configuration Compani.');

        const docx = await Companies.generateDocxMandate(company.value._id, { mandateId: mandate._id });
        const docName = `${company.value.name}_mandat.docx`;
        downloadDocx(docx, docName);

        NotifyPositive('Mandat téléchargé.');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors du téléchargement du mandat.');
      }
    };

    const updateMandate = async (date, mandate) => {
      try {
        if (!date || tmpInput.value === date) return;
        const params = { _id: company.value._id, mandateId: mandate._id };
        await Companies.updateMandate(params, { signedAt: date });

        await refreshCompany();
        NotifyPositive('Modification enregistrée.');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la modification.');
      }
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
      mandatesColumns,
      pagination,
      mandatesLoading,
      // Validations
      v$,
      // Computed
      company,
      debitMandates,
      addressError,
      ibanErrorMessage,
      bicErrorMessage,
      debitMandatesGroupById,
      // Methods
      saveTmp,
      trimAndUpdateCompany,
      updateCompany,
      refreshSalesRepresentativeOptions,
      openSalesRepresentativeModal,
      resetSalesRepresentative,
      isLastCreatedMandate,
      downloadMandate,
      updateMandate,
      saveTmpSignedAt,
    };
  },
};
</script>
