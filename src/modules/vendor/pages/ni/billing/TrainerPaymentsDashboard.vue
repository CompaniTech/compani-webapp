<template>
  <q-page padding :class="'q-pb-xl vendor-background'">
    <ni-profile-header title="Paiements Intervenants">
      <template #title>
        <ni-select caption="Statut des paiements" :options="TRAINER_PAYMENT_STATUS_OPTIONS" multiple required-field
          :model-value="selectedStatus" @update:model-value="updateSelectedStatus" class="selector" />
      </template>
    </ni-profile-header>
    <template v-if="!trainerPayments.length && !tableLoading">
      <span class="text-italic q-pa-lg">Aucun paiement pour les filtres sélectionnés.</span>
    </template>
    <ni-simple-table v-else :data="trainerPayments" :columns="columns" :loading="tableLoading"
      :pagination="{ rowsPerPage: 0 }" hide-bottom virtual-scroll>
      <template #header="{ props }">
        <q-tr :props="props">
          <q-th v-for="col in props.cols" :key="col.name" :props="props" :style="col.style">
            <div v-if="col.name === 'actions'">
              <q-checkbox class="q-mr-md" :model-value="multipleSelection" @update:model-value="selectPaymentList"
                dense :disable="!trainerPayments.length" />
            </div>
            <template v-else>{{ col.label }}</template>
          </q-th>
        </q-tr>
      </template>
      <template #body="{ props }">
        <q-tr :props="props">
          <q-td v-for="col in props.cols" :key="col.name" :props="props" :class="col.name" :style="col.style">
            <template v-if="col.name === 'status'">
              <div class="chip-container">
                <q-chip :class="[getStatusClass(col.value)]" :label="getItemStatus(col.value)" />
              </div>
            </template>
            <a v-else-if="col.name === 'file' && col.value" :href="col.value" target="_blank" rel="noopener">
              Voir la facture
            </a>
            <router-link v-else-if="col.name === 'trainer'" :to="goToTrainer(props.row.trainerBill.trainer)"
              class="clickable-name cursor-pointer">
              {{ col.value }}
            </router-link>
            <template v-else-if="col.name === 'actions'">
              <ni-button icon="delete" :disable="props.row.status !== PENDING"
                @click="openDeleteDialog(props.row)" />
              <q-checkbox class="q-mr-md" v-model="selectedPayments" :val="props.row._id" dense />
            </template>
            <template v-else>{{ col.value }}</template>
          </q-td>
        </q-tr>
      </template>
    </ni-simple-table>
    <div class="fixed fab-custom">
      <q-btn class="q-my-sm q-mx-lg" no-caps rounded icon="payment" label="Modifier les paiements"
        @click="openMultipleEditionModal" color="primary" :disable="!selectedPayments.length" />
    </div>
  </q-page>

  <ni-multiple-payment-edition-modal v-model="multipleEditionModal" v-model:status="multipleEditionStatus"
    :status-options="statusOptions" :loading="multipleEditionLoading" @submit="editPaymentList"
    @hide="resetMultipleEditionModal" :validations="v$.multipleEditionStatus" />
</template>

<script>
import get from 'lodash/get';
import { useMeta, useQuasar } from 'quasar';
import { ref, watch, computed } from 'vue';
import useVuelidate from '@vuelidate/core';
import { required } from '@vuelidate/validators';
import ProfileHeader from '@components/ProfileHeader';
import Select from '@components/form/Select';
import SimpleTable from '@components/table/SimpleTable';
import Button from '@components/Button';
import { NotifyNegative, NotifyWarning, NotifyPositive } from '@components/popup/notify';
import { DD_MM_YYYY, PENDING, PAID, XML_GENERATED, TRAINER_PAYMENT_STATUS_OPTIONS } from '@data/constants';
import TrainerPayments from '@api/TrainerPayments';
import { formatIdentity, formatPrice, formatQuantity } from '@helpers/utils';
import CompaniDate from '@helpers/dates/companiDates';
import MultiplePaymentEditionModal from 'src/modules/vendor/components/billing/MultiplePaymentEditionModal';

export default {
  name: 'TrainerPaymentsDashboard',
  components: {
    'ni-profile-header': ProfileHeader,
    'ni-select': Select,
    'ni-simple-table': SimpleTable,
    'ni-button': Button,
    'ni-multiple-payment-edition-modal': MultiplePaymentEditionModal,
  },
  setup () {
    const metaInfo = { title: 'Paiements Intervenants' };
    useMeta(metaInfo);

    const $q = useQuasar();

    const selectedStatus = ref([PENDING]);
    const trainerPayments = ref([]);
    const tableLoading = ref(false);
    const selectedPayments = ref([]);
    const multipleEditionModal = ref(false);
    const multipleEditionStatus = ref('');
    const multipleEditionLoading = ref(false);
    const columns = [
      {
        name: 'date',
        label: 'Date',
        field: 'date',
        format: value => CompaniDate(value).format(DD_MM_YYYY),
        align: 'left',
      },
      { name: 'number', label: 'Numéro', field: 'number', align: 'left' },
      { name: 'amount', label: 'Montant', field: 'amount', format: formatPrice, align: 'left' },
      { name: 'trainerBillNumber', label: 'Facture', field: row => get(row, 'trainerBill.number', ''), align: 'left' },
      { name: 'file', label: 'Lien', field: row => get(row, 'trainerBill.file.link', ''), align: 'left' },
      {
        name: 'trainer',
        label: 'Intervenant·e',
        field: row => formatIdentity(get(row, 'trainerBill.trainer.identity', {}), 'FL'),
        align: 'left',
      },
      { name: 'status', label: 'Statut', field: 'status', align: 'center', class: 'status' },
      { name: 'actions', label: '', field: '', align: 'right' },
    ];

    const rules = computed(() => ({ multipleEditionStatus: { required } }));
    const v$ = useVuelidate(rules, { multipleEditionStatus });

    const statusOptions = TRAINER_PAYMENT_STATUS_OPTIONS.filter(({ value }) => value !== XML_GENERATED);

    const multipleSelection = computed(() => (trainerPayments.value.length
      ? selectedPayments.value.length === trainerPayments.value.length
      : false));

    const getItemStatus = status => TRAINER_PAYMENT_STATUS_OPTIONS.find(s => s.value === status)?.label || '';

    const getStatusClass = (status) => {
      switch (status) {
        case PENDING:
          return 'orange-chip';
        case PAID:
          return 'green-chip';
        default:
          return 'peach-chip';
      }
    };

    const refreshPayments = async () => {
      try {
        tableLoading.value = true;
        trainerPayments.value = selectedStatus.value.length
          ? await TrainerPayments.list({ status: selectedStatus.value })
          : [];
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la récupération des paiements.');
      } finally {
        tableLoading.value = false;
        selectedPayments.value = [];
      }
    };

    const updateSelectedStatus = (status) => { selectedStatus.value = status; };

    const goToTrainer = trainer => ({
      name: 'ni users trainers info',
      params: { trainerId: trainer._id },
      query: { defaultTab: 'vaeiTrainerBillingInfos' },
    });

    const selectPaymentList = (value) => {
      selectedPayments.value = value ? trainerPayments.value.map(p => p._id) : [];
    };

    const openMultipleEditionModal = () => { multipleEditionModal.value = true; };

    const resetMultipleEditionModal = () => {
      multipleEditionModal.value = false;
      multipleEditionStatus.value = '';
      v$.value.multipleEditionStatus.$reset();
    };

    const editPaymentList = async () => {
      try {
        v$.value.multipleEditionStatus.$touch();
        if (v$.value.multipleEditionStatus.$error) return NotifyWarning('Champ invalide.');

        multipleEditionLoading.value = true;
        const results = await Promise.allSettled(
          selectedPayments.value.map(id => TrainerPayments.update(id, { status: multipleEditionStatus.value }))
        );
        const successCount = results.filter(r => r.status === 'fulfilled').length;
        const failureCount = results.length - successCount;

        if (successCount) NotifyPositive(`${formatQuantity('paiement modifié', successCount)}.`);
        if (failureCount) {
          results.filter(r => r.status === 'rejected').forEach(r => console.error(r.reason));
          NotifyNegative('Certains paiements n\'ont pas pu être modifiés.');
        }

        if (successCount) multipleEditionModal.value = false;
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de l\'édition des paiements.');
      } finally {
        await refreshPayments();
        multipleEditionLoading.value = false;
      }
    };

    const deletePayment = async (row) => {
      try {
        await TrainerPayments.remove(row._id);
        NotifyPositive('Paiement supprimé.');
        await refreshPayments();
      } catch (e) {
        console.error(e);
        if (e.data && e.data.statusCode === 409 && e.data.message) return NotifyNegative(e.data.message);
        NotifyNegative('Erreur lors de la suppression du paiement.');
      }
    };

    const openDeleteDialog = (row) => {
      $q.dialog({
        title: 'Confirmation',
        message: `Êtes-vous sûr(e) de vouloir supprimer le paiement ${row.number} et la facture `
          + `${row.trainerBill.number}&nbsp;?`,
        html: true,
        ok: 'OK',
        cancel: 'Annuler',
      }).onOk(() => deletePayment(row));
    };

    watch(selectedStatus, refreshPayments);

    refreshPayments();

    return {
      // Data
      PENDING,
      TRAINER_PAYMENT_STATUS_OPTIONS,
      statusOptions,
      selectedStatus,
      trainerPayments,
      tableLoading,
      columns,
      selectedPayments,
      multipleEditionModal,
      multipleEditionStatus,
      multipleEditionLoading,
      v$,
      // Computed
      multipleSelection,
      // Methods
      updateSelectedStatus,
      goToTrainer,
      getItemStatus,
      getStatusClass,
      selectPaymentList,
      openMultipleEditionModal,
      resetMultipleEditionModal,
      editPaymentList,
      openDeleteDialog,
    };
  },
};
</script>

<style lang="sass" scoped>
.selector
  width: 50%
.status
  width: 15%
.chip-container
  display: flex
  justify-content: center
</style>
