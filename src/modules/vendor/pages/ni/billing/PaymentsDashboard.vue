<template>
  <q-page padding :class="'q-pb-xl vendor-background'">
    <ni-profile-header title="Paiements">
      <template #title>
        <ni-select caption="Statut des paiements" :options="PAYMENT_STATUS_OPTIONS" multiple required-field
          :model-value="selectedStatus" @update:model-value="updateSelectedStatus" class="selector" />
      </template>
    </ni-profile-header>
    <div>
      <ni-button v-if="paymentList.length" label="Télécharger le fichier de prélèvements SEPA"
        @click="openXmlFileModal" :disable="!selectedPayments.length" />
    </div>
    <template v-if="!paymentList.length">
      <span class="text-italic q-pa-lg">Aucun paiement pour les statuts sélectionnés.</span>
    </template>
    <ni-simple-table v-else :data="sortedPayments" :columns="columns" :loading="tableLoading"
      :pagination="{ rowsPerPage: 0 }" hide-bottom virtual-scroll>
      <template #header="{ props }">
        <q-tr :props="props">
          <q-th v-for="col in props.cols" :key="col.name" :props="props" :style="col.style">
            <div v-if="col.name === 'actions'">
              <q-checkbox class="q-mr-md" :model-value="multipleSelection" @update:model-value="selectPaymentList"
                dense />
            </div>
            <div v-else-if="sortableColumns.includes(col.name)" @click="onSort(col)" class="align-center">
              {{ col.label }}
              <q-icon :name="sortDesc[col.name] ? 'arrow_downward' : 'arrow_upward'" size="14px"
                class="q-ml-xs" color="copper-grey-500" />
            </div>
            <template v-else>
              {{ col.label }}
            </template>
          </q-th>
        </q-tr>
      </template>
      <template #body="{ props }">
        <q-tr :props="props">
          <q-td :props="props" v-for="col in props.cols" :key="col.name" :class="col.name" :style="col.style">
              <div v-if="col.name === 'status'" class="chip-container">
                <q-chip :class="[getStatusClass(col.value)]" :label="getItemStatus(col.value)" />
              </div>
              <template v-else-if="col.name === 'payer'">
                <div v-if="props.row.courseBill.isPayerCompany" @click="$event.stopPropagation()">
                  <router-link :to="goToCompany(props.row.courseBill.payer)" :class="'clickable-name cursor-pointer'">
                  {{ col.value }}
                  </router-link>
                </div>
                <div v-else class="company-name">{{ col.value }}</div>
              </template>
              <template v-else-if="col.name === 'actions'">
                <q-checkbox class="q-mr-md" v-model="selectedPayments" :val="props.row._id" dense />
              </template>
              <template v-else>{{ col.value }}</template>
          </q-td>
        </q-tr>
      </template>
    </ni-simple-table>
    <div class="fixed fab-custom">
      <q-btn class="q-my-sm q-mx-lg" no-caps rounded icon="payment" label="Modifier les paiements"
        @click="openCoursePaymentEditionModal" color="primary" :disable="!selectedPayments.length" />
    </div>
  </q-page>

  <ni-xml-file-download-modal v-model="xmlFileDownloadModal" v-model:transaction-name="transactionName"
    :loading="xmlFileDownloadLoading" :validations="v$.transactionName" @submit="getXmlFile"
    @hide="resetXmlFileDownload" />

  <ni-multiple-course-payment-edition-modal v-model="multipleCoursePaymentEditionModal"
    v-model:status="multipleEditionStatus" :loading="multipleCoursePaymentEditionLoading"
    @submit="editPaymentList" @hide="resetMultiplePaymentEditionModal" :validations="v$.multipleEditionStatus" />
</template>

<script>
import get from 'lodash/get';
import { useMeta } from 'quasar';
import { ref, watch, computed } from 'vue';
import useVuelidate from '@vuelidate/core';
import { required, maxLength } from '@vuelidate/validators';
import ProfileHeader from '@components/ProfileHeader';
import Select from '@components/form/Select';
import { NotifyNegative, NotifyWarning, NotifyPositive } from '@components/popup/notify';
import SimpleTable from '@components/table/SimpleTable';
import Button from '@components/Button';
import { PAYMENT_STATUS_OPTIONS, DD_MM_YYYY, PENDING, PAYMENT_OPTIONS, RECEIVED } from '@data/constants';
import CoursePayments from '@api/CoursePayments';
import XmlSEPAFileInfos from '@api/XmlSEPAFileInfos';
import { formatPrice, sortStrings, formatQuantity } from '@helpers/utils';
import { ascendingSort } from '@helpers/dates/utils';
import CompaniDate from '@helpers/dates/companiDates';
import { downloadFile } from '@helpers/file';
import XmlFileDownloadModal from 'src/modules/vendor/components/billing/XmlFileDownloadModal';
import MultipleCoursePaymentEditionModal from 'src/modules/vendor/components/billing/MultipleCoursePaymentEditionModal';

export default {
  name: 'PaymentsDashboard',
  components: {
    'ni-profile-header': ProfileHeader,
    'ni-select': Select,
    'ni-simple-table': SimpleTable,
    'ni-button': Button,
    'ni-xml-file-download-modal': XmlFileDownloadModal,
    'ni-multiple-course-payment-edition-modal': MultipleCoursePaymentEditionModal,
  },
  setup () {
    const metaInfo = { title: 'Paiements' };
    useMeta(metaInfo);

    const selectedStatus = ref([PENDING]);
    const paymentList = ref([]);
    const tableLoading = ref(false);
    const columns = [
      {
        name: 'date',
        label: 'Date',
        field: 'date',
        format: value => CompaniDate(value).format(DD_MM_YYYY),
        align: 'left',
      },
      { name: 'number', label: '#', field: 'number', align: 'left' },
      { name: 'netInclTaxes', label: 'Montant', field: 'netInclTaxes', format: formatPrice, align: 'left' },
      { name: 'courseBillNumber', label: '# Facture', field: row => row.courseBill.number, align: 'left' },
      { name: 'payer', label: 'Payeur', field: row => get(row, 'courseBill.payer.name', ''), align: 'left' },
      {
        name: 'type',
        label: 'Type',
        field: 'type',
        format: value => PAYMENT_OPTIONS.find(opt => opt.value === value).label,
        align: 'left',
      },
      { name: 'status', label: 'Statut', field: 'status', align: 'center', class: 'status' },
      {
        name: 'xmlSEPAFileInfosName',
        label: 'Nom de lot',
        align: 'center',
        field: row => get(row, 'xmlSEPAFileInfos.name'),
      },
      { name: 'actions', label: '', field: '', align: 'center' },
    ];
    const sortableColumns = ['date', 'courseBillNumber', 'payer', 'type', 'xmlSEPAFileInfosName'];
    const selectedPayments = ref([]);
    const xmlFileDownloadModal = ref(false);
    const transactionName = ref('');
    const xmlFileDownloadLoading = ref(false);
    const multipleSelection = ref(false);
    const multipleEditionStatus = ref('');
    const multipleCoursePaymentEditionModal = ref(false);
    const multipleCoursePaymentEditionLoading = ref(false);
    const sortBy = ref(null);
    const sortDesc = ref({
      date: false,
      courseBillNumber: false,
      payer: false,
      type: false,
      xmlSEPAFileInfosName: false,
    });

    const TRANSACTION_NAME_MAX_LENGTH = 140;
    const rules = computed(() => ({
      transactionName: { required, maxLength: maxLength(TRANSACTION_NAME_MAX_LENGTH) },
      multipleEditionStatus: { required },
    }));
    const v$ = useVuelidate(rules, { transactionName, multipleEditionStatus });

    const sortedPayments = computed(() => {
      if (!sortBy.value) return paymentList.value;

      switch (sortBy.value) {
        case 'payer': {
          const sortDir = sortDesc.value.payer ? -1 : 1;
          return [...paymentList.value]
            .sort((a, b) => sortStrings(a.courseBill.payer.name, b.courseBill.payer.name) * sortDir);
        }
        case 'courseBillNumber': {
          const sortDir = sortDesc.value.courseBillNumber ? -1 : 1;
          return [...paymentList.value].sort((a, b) => sortStrings(a.courseBill.number, b.courseBill.number) * sortDir);
        }
        case 'type': {
          const sortDir = sortDesc.value.type ? -1 : 1;
          return [...paymentList.value].sort((a, b) => {
            const valueA = PAYMENT_OPTIONS.find(opt => opt.value === a.type).label;
            const valueB = PAYMENT_OPTIONS.find(opt => opt.value === b.type).label;
            return sortStrings(valueA, valueB) * sortDir;
          });
        }
        case 'xmlSEPAFileInfosName': {
          const sortDir = sortDesc.value.xmlSEPAFileInfosName ? -1 : 1;
          return [...paymentList.value]
            .sort((a, b) => {
              const valueA = get(a, 'xmlSEPAFileInfos.name', '');
              const valueB = get(b, 'xmlSEPAFileInfos.name', '');

              return sortStrings(valueA, valueB) * sortDir;
            });
        }
        case 'date':
          return [...paymentList.value]
            .sort((a, b) => (sortDesc.value.date
              ? ascendingSort(CompaniDate(a.date), CompaniDate(b.date))
              : ascendingSort(CompaniDate(b.date), CompaniDate(a.date))
            ));
        default:
          return paymentList;
      }
    });

    const onSort = (col) => {
      sortBy.value = col.name;
      sortDesc.value[col.name] = !sortDesc.value[col.name];
    };

    const refreshPayments = async (params) => {
      try {
        tableLoading.value = true;
        paymentList.value = await CoursePayments.list(params);
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la récupération des paiements.');
      } finally {
        tableLoading.value = false;
        multipleSelection.value = false;
      }
    };

    const getItemStatus = status => PAYMENT_STATUS_OPTIONS.find(s => s.value === status).label;

    const getStatusClass = (status) => {
      switch (status) {
        case PENDING:
          return 'orange-chip';
        case RECEIVED:
          return 'green-chip';
        default:
          return 'peach-chip';
      }
    };

    const updateSelectedStatus = (status) => { selectedStatus.value = status; };

    const goToCompany = row => ({
      name: 'ni users companies info', params: { companyId: row._id }, query: { defaultTab: 'bills' },
    });

    const openXmlFileModal = () => { xmlFileDownloadModal.value = true; };

    const getXmlFile = async () => {
      try {
        xmlFileDownloadLoading.value = true;
        v$.value.transactionName.$touch();
        if (v$.value.transactionName.$error) return NotifyWarning('Champ invalide.');

        const file = await XmlSEPAFileInfos.create({ payments: selectedPayments.value, name: transactionName.value });
        const fileName = `Prelevements_SEPA_${transactionName.value.replace(/ /g, '')}.xml`;
        await downloadFile(file, fileName);

        await refreshPayments({ status: selectedStatus.value });

        xmlFileDownloadModal.value = false;
        selectedPayments.value = [];
      } catch (e) {
        console.error(e);
        if (e.data instanceof Blob) {
          const text = await e.data.text();
          const error = JSON.parse(text);
          if ([409, 404, 403].includes(error.statusCode) && error.message) return NotifyNegative(error.message);
        }
        NotifyNegative('Erreur lors du téléchargement du fichier des prélèvements SEPA.');
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

    const selectPaymentList = (value) => {
      multipleSelection.value = value;

      selectedPayments.value = value ? paymentList.value.map(p => p._id) : [];
    };

    let timeout;
    watch(selectedStatus, () => {
      clearTimeout(timeout);
      timeout = setTimeout(async () => {
        if (selectedStatus.value.length) await refreshPayments({ status: selectedStatus.value });
        else paymentList.value = [];
      }, 1000);
      selectedPayments.value = [];
    });

    const openCoursePaymentEditionModal = async () => {
      multipleCoursePaymentEditionModal.value = true;
    };

    const resetMultiplePaymentEditionModal = () => {
      multipleEditionStatus.value = '';
      v$.value.multipleEditionStatus.$reset();
    };

    const editPaymentList = async () => {
      try {
        v$.value.multipleEditionStatus.$touch();
        if (v$.value.multipleEditionStatus.$error) return NotifyWarning('Champ invalide.');

        multipleCoursePaymentEditionLoading.value = true;
        await CoursePayments.updatePaymentList({ _ids: selectedPayments.value, status: multipleEditionStatus.value });
        await refreshPayments({ status: selectedStatus.value });

        NotifyPositive(`${formatQuantity('paiement modifié', selectedPayments.value.length)}.`);

        selectedPayments.value = [];
        multipleCoursePaymentEditionModal.value = false;
      } catch (e) {
        console.error(e);
        if (e.status === 400 && e.data.message) NotifyNegative(e.data.message);
        else NotifyNegative('Erreur lors de l\'edition des paiements.');
      } finally {
        multipleCoursePaymentEditionLoading.value = false;
      }
    };

    const created = async () => { await refreshPayments({ status: selectedStatus.value }); };

    created();

    return {
      // Data
      PAYMENT_STATUS_OPTIONS,
      selectedStatus,
      paymentList,
      columns,
      tableLoading,
      selectedPayments,
      PENDING,
      xmlFileDownloadModal,
      transactionName,
      xmlFileDownloadLoading,
      v$,
      multipleSelection,
      multipleCoursePaymentEditionModal,
      multipleEditionStatus,
      multipleCoursePaymentEditionLoading,
      sortBy,
      sortDesc,
      sortableColumns,
      // Computed
      sortedPayments,
      // Methods
      updateSelectedStatus,
      getItemStatus,
      getStatusClass,
      goToCompany,
      openXmlFileModal,
      getXmlFile,
      resetXmlFileDownload,
      selectPaymentList,
      openCoursePaymentEditionModal,
      editPaymentList,
      resetMultiplePaymentEditionModal,
      onSort,
    };
  },
};

</script>
<style lang="sass" scoped>
.selector
  width: 50%
.status
  width: 15%
.company-name
  color: $primary
  width: fit-content
  cursor: default
</style>
