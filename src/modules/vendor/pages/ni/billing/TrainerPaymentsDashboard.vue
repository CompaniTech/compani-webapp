<template>
  <q-page padding :class="'q-pb-xl vendor-background'">
    <ni-profile-header title="Paiements Intervenants">
      <template #title>
        <ni-select caption="Statut des paiements" :options="TRAINER_PAYMENT_STATUS_OPTIONS" multiple required-field
          :model-value="selectedStatus" @update:model-value="updateSelectedStatus" class="selector" />
      </template>
    </ni-profile-header>
    <div class="reset-filters" @click="resetFilters">Effacer les filtres</div>
    <ni-select caption="Intervenant·e" :options="trainerOptions" :model-value="selectedTrainer"
      @update:model-value="updateSelectedTrainer" clearable class="selector" />
    <div>
      <ni-button v-if="filteredPayments.length" label="Télécharger le fichier de virements SEPA"
        @click="openXmlFileModal" :disable="!selectedPayments.length" />
    </div>
    <template v-if="!filteredPayments.length && !tableLoading">
      <span class="text-italic q-pa-lg">Aucun paiement pour les filtres sélectionnés.</span>
    </template>
    <ni-simple-table v-else :data="filteredPayments" :columns="columns" :loading="tableLoading"
      :pagination="{ rowsPerPage: 0 }" hide-bottom virtual-scroll>
      <template #header="{ props }">
        <q-tr :props="props">
          <q-th v-for="col in props.cols" :key="col.name" :props="props" :style="col.style">
            <div v-if="col.name === 'actions'">
              <q-checkbox class="q-mr-md" :model-value="multipleSelection" @update:model-value="selectPaymentList"
                dense :disable="!selectableTrainerPayments.length" />
            </div>
            <div v-else-if="sortableColumns.includes(col.name)" @click="onSort(col)"
              class="row no-wrap items-center cursor-pointer">
              {{ col.label }}
              <q-icon :name="sortDesc[col.name] ? 'arrow_downward' : 'arrow_upward'" size="14px"
                class="q-ml-xs" color="copper-grey-500" />
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
              <q-tooltip v-if="col.value">{{ col.value }}</q-tooltip>
            </router-link>
            <template v-else-if="col.name === 'actions'">
              <div class="row no-wrap items-center justify-end">
                <ni-button icon="delete" :disable="props.row.status !== PENDING"
                  @click="openDeleteDialog(props.row)" />
                <q-checkbox class="q-mr-md" v-model="selectedPayments" :val="props.row._id" dense
                  :disable="!isTrainerSelectable(props.row.trainerBill.trainer)" />
              </div>
            </template>
            <template v-else-if="['trainerBillNumber', 'trainerPaymentsXmlFileInfosName'].includes(col.name)">
              {{ col.value }}
              <q-tooltip v-if="col.value">{{ col.value }}</q-tooltip>
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

  <ni-xml-file-download-modal v-model="xmlFileDownloadModal" v-model:transaction-name="transactionName"
    title="fichier de virements SEPA" caption="Nom du lot de virements" :loading="xmlFileDownloadLoading"
    :validations="v$.transactionName" @submit="getXmlFile" @hide="resetXmlFileDownload" />

  <ni-multiple-payment-edition-modal v-model="multipleEditionModal" v-model:status="multipleEditionStatus"
    :status-options="statusOptions" :loading="multipleEditionLoading" @submit="editPaymentList"
    @hide="resetMultipleEditionModal" :validations="v$.multipleEditionStatus" />
</template>

<script>
import get from 'lodash/get';
import uniqBy from 'lodash/uniqBy';
import { useMeta, useQuasar } from 'quasar';
import { ref, watch, computed } from 'vue';
import useVuelidate from '@vuelidate/core';
import { required, maxLength } from '@vuelidate/validators';
import ProfileHeader from '@components/ProfileHeader';
import Select from '@components/form/Select';
import SimpleTable from '@components/table/SimpleTable';
import Button from '@components/Button';
import { NotifyNegative, NotifyWarning, NotifyPositive } from '@components/popup/notify';
import { DD_MM_YYYY, PENDING, PAID, XML_GENERATED, TRAINER_PAYMENT_STATUS_OPTIONS } from '@data/constants';
import TrainerPayments from '@api/TrainerPayments';
import TrainerPaymentsXmlFileInfos from '@api/TrainerPaymentsXmlFileInfos';
import { formatIdentity, formatPrice, formatQuantity, formatAndSortIdentityOptions, sortStrings } from '@helpers/utils';
import { ascendingSort } from '@helpers/dates/utils';
import CompaniDate from '@helpers/dates/companiDates';
import { downloadFile } from '@helpers/file';
import MultiplePaymentEditionModal from 'src/modules/vendor/components/billing/MultiplePaymentEditionModal';
import XmlFileDownloadModal from 'src/modules/vendor/components/billing/XmlFileDownloadModal';

export default {
  name: 'TrainerPaymentsDashboard',
  components: {
    'ni-profile-header': ProfileHeader,
    'ni-select': Select,
    'ni-simple-table': SimpleTable,
    'ni-button': Button,
    'ni-multiple-payment-edition-modal': MultiplePaymentEditionModal,
    'ni-xml-file-download-modal': XmlFileDownloadModal,
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
    const selectedTrainer = ref('');
    const xmlFileDownloadModal = ref(false);
    const transactionName = ref('');
    const xmlFileDownloadLoading = ref(false);
    const sortableColumns = ['date', 'number', 'trainerBillNumber', 'trainer', 'trainerPaymentsXmlFileInfosName'];
    const sortBy = ref(null);
    const sortDesc = ref({
      date: false,
      number: false,
      trainerBillNumber: false,
      trainer: false,
      trainerPaymentsXmlFileInfosName: false,
    });
    const columns = [
      {
        name: 'date',
        label: 'Date',
        field: 'date',
        format: value => CompaniDate(value).format(DD_MM_YYYY),
        align: 'left',
        style: { width: '10%' },
      },
      { name: 'number', label: 'Numéro', field: 'number', align: 'left', style: { width: '10%' } },
      {
        name: 'amount',
        label: 'Montant',
        field: 'amount',
        format: formatPrice,
        align: 'left',
        style: { width: '10%' },
      },
      {
        name: 'trainerBillNumber',
        label: 'Facture',
        field: row => get(row, 'trainerBill.number', ''),
        align: 'left',
        style: { width: '15%' },
      },
      {
        name: 'file',
        label: 'Lien',
        field: row => get(row, 'trainerBill.file.link', ''),
        align: 'left',
        style: { width: '5%' },
      },
      {
        name: 'trainer',
        label: 'Intervenant·e',
        field: row => formatIdentity(get(row, 'trainerBill.trainer.identity', {}), 'FL'),
        align: 'left',
        style: { width: '15%' },
      },
      { name: 'status', label: 'Statut', field: 'status', align: 'center', class: 'status', style: { width: '15%' } },
      {
        name: 'trainerPaymentsXmlFileInfosName',
        label: 'Nom de lot',
        align: 'center',
        field: row => get(row, 'trainerPaymentsXmlFileInfos.name', ''),
        style: { width: '10%' },
      },
      { name: 'actions', label: '', field: '', align: 'right', style: { width: '10%' } },
    ];

    const TRANSACTION_NAME_MAX_LENGTH = 140;
    const rules = computed(() => ({
      transactionName: { required, maxLength: maxLength(TRANSACTION_NAME_MAX_LENGTH) },
      multipleEditionStatus: { required },
    }));
    const v$ = useVuelidate(rules, { multipleEditionStatus, transactionName });

    const statusOptions = TRAINER_PAYMENT_STATUS_OPTIONS.filter(({ value }) => value !== XML_GENERATED);

    const trainerOptions = computed(() => [
      { label: 'Tous les intervenant·es', value: '' },
      ...formatAndSortIdentityOptions(
        uniqBy(trainerPayments.value.map(p => get(p, 'trainerBill.trainer')), '_id')
      ),
    ]);

    const sortedPayments = computed(() => {
      if (!sortBy.value) return trainerPayments.value;

      switch (sortBy.value) {
        case 'number': {
          const sortDir = sortDesc.value.number ? -1 : 1;
          return [...trainerPayments.value].sort((a, b) => sortStrings(a.number, b.number) * sortDir);
        }
        case 'trainerBillNumber': {
          const sortDir = sortDesc.value.trainerBillNumber ? -1 : 1;
          return [...trainerPayments.value]
            .sort((a, b) => sortStrings(get(a, 'trainerBill.number', ''), get(b, 'trainerBill.number', '')) * sortDir);
        }
        case 'trainer': {
          const sortDir = sortDesc.value.trainer ? -1 : 1;
          return [...trainerPayments.value].sort((a, b) => {
            const valueA = formatIdentity(get(a, 'trainerBill.trainer.identity', {}), 'FL');
            const valueB = formatIdentity(get(b, 'trainerBill.trainer.identity', {}), 'FL');
            return sortStrings(valueA, valueB) * sortDir;
          });
        }
        case 'trainerPaymentsXmlFileInfosName': {
          const sortDir = sortDesc.value.trainerPaymentsXmlFileInfosName ? -1 : 1;
          return [...trainerPayments.value]
            .sort((a, b) => {
              const valueA = get(a, 'trainerPaymentsXmlFileInfos.name', '');
              const valueB = get(b, 'trainerPaymentsXmlFileInfos.name', '');

              return sortStrings(valueA, valueB) * sortDir;
            });
        }
        case 'date':
          return [...trainerPayments.value]
            .sort((a, b) => (sortDesc.value.date
              ? ascendingSort(CompaniDate(a.date), CompaniDate(b.date))
              : ascendingSort(CompaniDate(b.date), CompaniDate(a.date))
            ));
        default:
          return trainerPayments.value;
      }
    });

    const filteredPayments = computed(() => (selectedTrainer.value
      ? sortedPayments.value.filter(p => selectedTrainer.value === get(p, 'trainerBill.trainer._id'))
      : sortedPayments.value));

    const isTrainerSelectable = trainer => !!(trainer.iban && trainer.bic);

    const selectableTrainerPayments = computed(() => filteredPayments.value
      .filter(p => isTrainerSelectable(p.trainerBill.trainer))
      .map(p => p._id));

    const multipleSelection = computed(() => (selectableTrainerPayments.value.length
      ? selectedPayments.value.length === selectableTrainerPayments.value.length
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
      // query: { defaultTab: 'vaeiTrainerBillingInfos' }, à remettre quand on aura créer l'onglet collectif
    });

    const onSort = (col) => {
      sortBy.value = col.name;
      sortDesc.value[col.name] = !sortDesc.value[col.name];
    };

    const selectPaymentList = (value) => {
      selectedPayments.value = value ? selectableTrainerPayments.value : [];
    };

    const updateSelectedTrainer = (trainerId) => {
      selectedTrainer.value = trainerId;
      selectedPayments.value = [];
    };

    const resetFilters = () => { updateSelectedTrainer(''); };

    const openXmlFileModal = () => { xmlFileDownloadModal.value = true; };

    const getXmlFile = async () => {
      try {
        xmlFileDownloadLoading.value = true;
        v$.value.transactionName.$touch();
        if (v$.value.transactionName.$error) return NotifyWarning('Champ invalide.');

        const file = await TrainerPaymentsXmlFileInfos
          .create({ payments: selectedPayments.value, name: transactionName.value });
        const fileName = `Virements_SEPA_${transactionName.value.replace(/ /g, '')}.xml`;
        await downloadFile(file, fileName);

        await refreshPayments();

        xmlFileDownloadModal.value = false;
      } catch (e) {
        console.error(e);
        if (e.data instanceof Blob) {
          const text = await e.data.text();
          const error = JSON.parse(text);
          if ([409, 404, 403].includes(error.statusCode) && error.message) return NotifyNegative(error.message);
        }
        NotifyNegative('Erreur lors du téléchargement du fichier des virements SEPA.');
      } finally {
        xmlFileDownloadLoading.value = false;
      }
    };

    const resetXmlFileDownload = () => {
      xmlFileDownloadModal.value = false;
      xmlFileDownloadLoading.value = false;
      transactionName.value = '';
      v$.value.transactionName.$reset();
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
          const errorMessage = [];
          results.filter(r => r.status === 'rejected').forEach((r) => {
            console.error(r.reason);
            if (get(r.reason, 'data.message')) errorMessage.push(r.reason.data.message);
          });
          if (errorMessage.length) [...new Set(errorMessage)].forEach(m => NotifyNegative(m));
          else NotifyNegative('Certains paiements n\'ont pas pu être modifiés.');
        }

        if (successCount) {
          await refreshPayments();
          multipleEditionModal.value = false;
        }
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de l\'édition des paiements.');
        await refreshPayments();
      } finally {
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
      })
        .onOk(() => deletePayment(row))
        .onCancel(() => NotifyPositive('Suppression du paiement annulé.'));
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
      selectedTrainer,
      xmlFileDownloadModal,
      transactionName,
      xmlFileDownloadLoading,
      sortableColumns,
      sortBy,
      sortDesc,
      v$,
      // Computed
      multipleSelection,
      trainerOptions,
      filteredPayments,
      selectableTrainerPayments,
      // Methods
      updateSelectedStatus,
      goToTrainer,
      getItemStatus,
      getStatusClass,
      onSort,
      isTrainerSelectable,
      selectPaymentList,
      updateSelectedTrainer,
      resetFilters,
      openMultipleEditionModal,
      resetMultipleEditionModal,
      editPaymentList,
      openDeleteDialog,
      openXmlFileModal,
      getXmlFile,
      resetXmlFileDownload,
    };
  },
};
</script>

<style lang="sass" scoped>
.selector
  width: 50%
.chip-container
  display: flex
  justify-content: center
:deep(table)
  table-layout: fixed
:deep(.trainerBillNumber),
:deep(.trainer),
:deep(.trainerPaymentsXmlFileInfosName)
  overflow: hidden
  text-overflow: ellipsis
  white-space: nowrap
</style>
