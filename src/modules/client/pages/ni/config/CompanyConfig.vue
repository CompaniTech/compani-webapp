<template>
  <q-page class="client-background" padding>
    <div v-if="company">
      <ni-title-header title="Configuration générale" class="q-mb-xl" />
      <div class="q-mb-xl">
        <p class="text-weight-bold">Informations de l'organisation</p>
        <div class="row gutter-profile">
          <ni-input caption="Raison sociale" v-model="company.name" @focus="saveTmp('name')"
            @blur="updateCompany('name')" :error="v$.company.name.$error" required-field />
          <ni-search-address v-model="company.address" :error-message="addressError" @blur="updateCompany('address')"
            @focus="saveTmp('address.fullAddress')" :error="v$.company.address.$error" required-field />
        </div>
      </div>
      <div>
        <p class="text-weight-bold">Contacts</p>
        <div class="interlocutor-container q-mb-xl">
          <interlocutor-cell v-for="billingRepresentative of company.billingRepresentatives" can-update clearable
          :key="billingRepresentative._id" :interlocutor="billingRepresentative" interlocutor-is-non-editable
          caption="Chargé de facturation dans ma structure" label="Ajouter un chargé de facturation"
          @open-modal="openBillingRepresentativeModal" />
        <ni-secondary-button class="button-billing-representative" label="Ajouter un chargé de facturation"
          @click="() => openBillingRepresentativeModal({ action: CREATION })" />
        </div>
      </div>
    </div>

    <interlocutor-modal v-model="billingRepresentativeModal" v-model:interlocutor="tmpBillingRepresentativeId"
      @submit="addBillingRepresentative" :label="billingRepresentativeModalLabel"
      :interlocutors-options="billingRepresentativeOptions" :loading="billingRepresentativeModalLoading"
      :validations="v$.tmpBillingRepresentativeId" @hide="resetBillingRepresentative" />
  </q-page>
</template>

<script>
import { useMeta, useQuasar } from 'quasar';
import { ref, computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import get from 'lodash/get';
import useVuelidate from '@vuelidate/core';
import { required } from '@vuelidate/validators';
import Users from '@api/Users';
import Companies from '@api/Companies';
import TitleHeader from '@components/TitleHeader';
import Input from '@components/form/Input';
import SearchAddress from '@components/form/SearchAddress';
import InterlocutorCell from '@components/courses/InterlocutorCell';
import InterlocutorModal from '@components/courses/InterlocutorModal';
import SecondaryButton from '@components/SecondaryButton';
import { NotifyNegative, NotifyPositive, NotifyWarning } from '@components/popup/notify';
import { DELETION, CLIENT_ADMIN, HOLDING_ADMIN } from '@data/constants';
import { frAddress } from '@helpers/vuelidateCustomVal';
import { formatAndSortUserOptions, formatIdentity } from '@helpers/utils';
import { useCompanies } from '@composables/companies';
import { useValidations } from '@composables/validations';
import { useConfig } from '@composables/config';

export default {
  name: 'CompanyConfig',
  components: {
    'ni-input': Input,
    'ni-title-header': TitleHeader,
    'ni-search-address': SearchAddress,
    'interlocutor-cell': InterlocutorCell,
    'interlocutor-modal': InterlocutorModal,
    'ni-secondary-button': SecondaryButton,
  },
  setup () {
    const metaInfo = { title: 'Configuration générale' };
    useMeta(metaInfo);
    const $store = useStore();
    const $q = useQuasar();

    const billingRepresentativeOptions = ref([]);
    const billingRepresentativeModal = ref(false);
    const billingRepresentativeModalLoading = ref(false);
    const billingRepresentativeModalLabel = ref({ action: '', interlocutor: '' });
    const tmpBillingRepresentativeId = ref('');

    const company = computed(() => $store.getters['main/getCompany']);

    const companyRules = {
      company: {
        name: { required },
        address: {
          zipCode: { required },
          street: { required },
          city: { required },
          fullAddress: { required, frAddress },
          location: { required },
        },
      },
      tmpBillingRepresentativeId: { required },
    };

    const v$ = useVuelidate(companyRules, { company, tmpBillingRepresentativeId });

    const { addressError } = useCompanies(v$);

    const { waitForValidation } = useValidations();

    const { saveTmp, refreshCompany, updateCompany } = useConfig(
      v$,
      waitForValidation,
      billingRepresentativeModalLoading,
      tmpBillingRepresentativeId,
      billingRepresentativeModal,
      company
    );

    const removeBillingRepresentative = async(billingRepresentativeId) => {
      try {
        tmpBillingRepresentativeId.value = '';
        await Companies.deleteBillingRepresentative(company.value._id, billingRepresentativeId);

        await refreshCompany();
        NotifyPositive('Chargé de facturation détaché.');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors du détachement du chargé de facturation.');
      }
    };

    const openBillingRepresentativeDeletionValidationModal = (identity, billingRepresentativeId = '') => {
      const billingRepresentativeIdentity = formatIdentity(identity, 'FL');
      const message = `Êtes-vous sûr(e) de vouloir détacher ${billingRepresentativeIdentity} de ma structure&nbsp;?`;
      $q.dialog({
        title: 'Confirmation',
        message,
        html: true,
        ok: true,
        cancel: 'Annuler',
      }).onOk(() => removeBillingRepresentative(billingRepresentativeId))
        .onCancel(() => NotifyPositive('Détachement annulé.'));
    };
    const openBillingRepresentativeModal = (event) => {
      const { action, interlocutorId: billingRepresentativeId } = event;

      if (action === DELETION) {
        const billinRepresentativeToRemove = company.value.billingRepresentatives
          .find(br => br._id === billingRepresentativeId);
        openBillingRepresentativeDeletionValidationModal(
          get(billinRepresentativeToRemove, 'identity'),
          billingRepresentativeId
        );
      } else {
        tmpBillingRepresentativeId.value = billingRepresentativeId;
        billingRepresentativeModalLabel.value = {
          action: 'Ajouter un ',
          interlocutor: 'chargé de facturation de ma structure',
        };
        billingRepresentativeModal.value = true;
      }
    };

    const addBillingRepresentative = async () => {
      try {
        billingRepresentativeModalLoading.value = true;
        v$.value.tmpBillingRepresentativeId.$touch();
        if (v$.value.tmpBillingRepresentativeId.$error) return NotifyWarning('Champ(s) invalide(s)');

        await Companies
          .addBillingRepresentative(company.value._id, { billingRepresentative: tmpBillingRepresentativeId.value });
        NotifyPositive('Modification enregistrée.');

        await refreshCompany();
        billingRepresentativeModal.value = false;
      } catch (e) {
        console.error(e);
        if (e.status === 409) return NotifyNegative(e.data.message);
        NotifyNegative('Erreur lors de la modification.');
      } finally {
        billingRepresentativeModalLoading.value = false;
      }
    };

    const refreshBillingRepresentativeOptions = async () => {
      const clientAdminUsers = await Users
        .list({ role: [CLIENT_ADMIN, HOLDING_ADMIN], includeHoldingAdmins: true, company: company.value._id });

      billingRepresentativeOptions.value = formatAndSortUserOptions(clientAdminUsers, false);
    };

    const resetBillingRepresentative = () => {
      tmpBillingRepresentativeId.value = '';
      billingRepresentativeModalLabel.value = { action: '', interlocutor: '' };
      v$.value.tmpBillingRepresentativeId.$reset();
    };

    onMounted(() => Promise.all([refreshCompany(), refreshBillingRepresentativeOptions()]));

    return {
      // Data
      billingRepresentativeOptions,
      billingRepresentativeModal,
      billingRepresentativeModalLabel,
      tmpBillingRepresentativeId,
      billingRepresentativeModalLoading,
      company,
      // Computed
      v$,
      addressError,
      // Methods
      openBillingRepresentativeModal,
      refreshBillingRepresentativeOptions,
      resetBillingRepresentative,
      saveTmp,
      updateCompany,
      addBillingRepresentative,
    };
  },
};
</script>

<style lang="sass" scoped>
  .button-billing-representative
    justify-self: start
</style>
