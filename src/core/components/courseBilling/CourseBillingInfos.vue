<template>
  <div v-if="get(company, '_id')">
    <div class="q-mb-xl">
      <p class="text-weight-bold">Contact</p>
      <div class="interlocutor-container">
        <ni-interlocutor-cell :interlocutor="company.billingRepresentative" can-update
          caption="Chargé de facturation dans la structure" label="Ajouter un chargé de facturation"
          @open-modal="openBillingRepresentativeModal" />
      </div>
    </div>
    <template v-if="Object.keys(groupedCourseBills).length">
      <div v-for="index of Object.keys(groupedCourseBills)" :key="index" class="q-mb-xl">
        <p class="text-weight-bold">{{ getTableName(index) }}</p>
        <ni-expanding-table :data="groupedCourseBills[index]" :columns="columns" v-model:pagination="paginations[index]"
          :hide-bottom="false" :loading="loading">
          <template #row="{ props }">
            <q-td v-for="col in props.cols" :key="col.name" :props="props">
              <template v-if="col.name === 'number'">
                <div class="clickable-name" @click.stop="downloadBill(props.row)" :disable="pdfLoading">
                  {{ col.value }}
                </div>
                <div @click="$event.stopPropagation()">
                  <router-link :to="goToCourse(get(props.row, 'course'))"
                    :class="getCourseNameClass(get(props.row, 'course'))">
                    <div class="program">{{ `${getProgramName(get(props.row, 'course'))}` }}</div>
                  </router-link>
                </div>
                <div class="row items-center" v-if="props.row.courseCreditNote">
                  <q-icon size="12px" name="fas fa-times-circle" color="orange-500 attendance" />
                  <div class="q-ml-xs text-orange-500">
                    Annulée par avoir -
                    <span class="download-credit-note" @click.stop="downloadCreditNote(props.row.courseCreditNote)">
                      {{ props.row.courseCreditNote.number }}
                    </span>
                  </div>
                </div>
                <div v-if="props.row.payer._id !== company._id" class="text-copper-grey-600 text-weight-bold">
                  Payeur : {{ props.row.payer.name }}
                </div>
                <div v-if="!props.row.companies.map(c => c._id).includes(company._id)"
                  class="text-copper-grey-600 text-weight-bold">
                  {{ formatQuantity('Structure', props.row.companies.length, 's', false) }} :
                  {{ formatName(props.row.companies) }}
                </div>
              </template>
              <template v-else-if="col.name === 'progress' && col.value >= 0">
                <ni-progress class="q-ml-lg" :value="col.value" />
              </template>
              <template v-else-if="col.name === 'payment'">
                <div v-if="canUpdateBilling" class="row justify-center table-actions">
                  <ni-button icon="add" :disable="paymentCreationLoading" color="white" class="add-payment"
                    @click="openCoursePaymentCreationModal(props.row)" />
                </div>
              </template>
              <template v-else-if="col.name === 'expand'">
                <q-icon :name="props.expand ? 'expand_less' : 'expand_more'" />
              </template>
              <template v-else>{{ col.value }}</template>
            </q-td>
          </template>
          <template #expanding-row="{ props }">
            <q-td colspan="100%" class="cell">
              <div v-if="!props.row.coursePayments.length && !props.row.courseCreditNote"
                class="text-italic text-center">
                Aucun règlement renseigné.
              </div>
              <div v-else v-for="item in getSortedItems(props.row)" :key="item._id" :props="props" class="q-my-sm row">
                <div class="date">{{ CompaniDate(item.date).format(DD_MM_YYYY) }}</div>
                <div class="payment">{{ item.number }} ({{ getItemType(item) }})</div>
                <div class="progress" />
                <div class="formatted-price" />
                <div v-if="item.netInclTaxes >=0" class="formatted-price">
                  {{ item.nature === REFUND ? '-' : '' }}{{ formatPrice(item.netInclTaxes) }}
                </div>
                <div v-else class="formatted-price">{{ formatPrice(props.row.netInclTaxes) }}</div>
                <div class="formatted-price" />
                <div class="formatted-price" />
                <div v-if="item.netInclTaxes >=0 && canUpdateBilling" class="edit">
                  <q-icon size="20px" name="edit" color="copper-grey-500"
                    @click="openCoursePaymentEditionModal(props.row, item)" />
                </div>
              </div>
            </q-td>
          </template>
          <template #bottom-row="{ props }">
            <q-tr class="text-weight-bold" :props="props">
              <q-td />
              <q-td />
              <q-td />
              <q-td />
              <q-td><div class="flex justify-end items-center">Total</div></q-td>
              <q-td><div class="flex justify-end items-center">{{ getTotal(groupedCourseBills[index]) }}</div></q-td>
              <q-td />
              <q-td />
            </q-tr>
          </template>
        </ni-expanding-table>
      </div>

      <ni-course-payment-creation-modal v-model:new-course-payment="newCoursePayment" @submit="createPayment"
        v-model="coursePaymentCreationModal" :loading="paymentCreationLoading" @hide="resetCoursePaymentCreationModal"
        :validations="validations.newCoursePayment" :course-payment-meta-info="coursePaymentMetaInfo" />

      <ni-course-payment-edition-modal v-model:edited-course-payment="editedCoursePayment" @submit="editPayment"
        v-model="coursePaymentEditionModal" :loading="paymentEditionLoading" @hide="resetCoursePaymentEditionModal"
        :validations="validations.editedCoursePayment" :course-payment-meta-info="coursePaymentMetaInfo" />
    </template>
    <div v-else class="text-italic">Pas de factures</div>
    <ni-interlocutor-modal v-model="billingRepresentativeModal" v-model:interlocutor="tmpBillingRepresentativeId"
      @submit="updateCompany" :label="billingRepresentativeModalLabel" :loading="billingRepresentativeModalLoading"
      :interlocutors-options="billingRepresentativeGroupedByCompany[company._id]" @hide="resetBillingRepresentative"
      :validations="validations.tmpBillingRepresentativeId" />
  </div>
</template>

<script>
import get from 'lodash/get';
import omit from 'lodash/omit';
import pick from 'lodash/pick';
import { Screen } from 'quasar';
import { ref, computed, watch, toRefs } from 'vue';
import { useStore } from 'vuex';
import useVuelidate from '@vuelidate/core';
import { required } from '@vuelidate/validators';
import CourseBills from '@api/CourseBills';
import CoursePayments from '@api/CoursePayments';
import Users from '@api/Users';
import Companies from '@api/Companies';
import Button from '@components/Button';
import Progress from '@components/CourseProgress';
import { NotifyNegative, NotifyPositive, NotifyWarning } from '@components/popup/notify';
import ExpandingTable from '@components/table/ExpandingTable';
import InterlocutorCell from '@components/courses/InterlocutorCell';
import InterlocutorModal from '@components/courses/InterlocutorModal';
import {
  BALANCE,
  PAYMENT,
  PAYMENT_OPTIONS,
  CREDIT_OPTION,
  REFUND,
  DD_MM_YYYY,
  CLIENT_ADMIN,
  EDITION,
  HOLDING_ADMIN,
} from '@data/constants.js';
import CompaniDate from '@helpers/dates/companiDates';
import { ascendingSortBy, descendingSortBy } from '@helpers/dates/utils';
import {
  formatPrice,
  formatPriceWithSign,
  formatAndSortUserOptions,
  truncate,
  formatName,
  formatQuantity,
} from '@helpers/utils';
import { positiveNumber } from '@helpers/vuelidateCustomVal';
import { defineAbilitiesFor } from '@helpers/ability';
import { composeCourseName } from '@helpers/courses';
import { useCourses } from '@composables/courses';
import { useCourseBilling } from '@composables/courseBills';
import CoursePaymentCreationModal from 'src/modules/vendor/components/billing/CoursePaymentCreationModal';
import CoursePaymentEditionModal from 'src/modules/vendor/components/billing/CoursePaymentEditionModal';
import { hasUserAccessToCompany } from '@helpers/userCompanies';

export default {
  name: 'CourseBillingInfos',
  props: {
    company: { type: Object, default: () => ({}) },
  },
  components: {
    'ni-expanding-table': ExpandingTable,
    'ni-progress': Progress,
    'ni-button': Button,
    'ni-course-payment-creation-modal': CoursePaymentCreationModal,
    'ni-course-payment-edition-modal': CoursePaymentEditionModal,
    'ni-interlocutor-cell': InterlocutorCell,
    'ni-interlocutor-modal': InterlocutorModal,
  },
  emits: ['refresh-company'],
  setup (props, { emit }) {
    const { company } = toRefs(props);

    const $store = useStore();
    const courseBillsGroupedByCompany = ref({});
    const loading = ref(false);
    const paymentCreationLoading = ref(false);
    const paymentEditionLoading = ref(false);
    const coursePaymentMetaInfo = ref({ number: '', courseName: '', netInclTaxes: '', companiesName: '' });
    const coursePaymentCreationModal = ref(false);
    const coursePaymentEditionModal = ref(false);
    const newCoursePayment = ref({ nature: PAYMENT, type: '', netInclTaxes: '', date: '', courseBill: '' });
    const editedCoursePayment = ref({ _id: '', nature: '', type: '', netInclTaxes: '', date: '' });
    const columns = ref([
      {
        name: 'date',
        label: 'Date',
        field: 'billedAt',
        format: value => CompaniDate(value).format(DD_MM_YYYY),
        align: 'left',
        classes: 'date',
      },
      { name: 'number', label: '#', field: 'number', align: 'left', classes: 'payment' },
      { name: 'progress', label: 'Avancement formation', field: 'progress', align: 'center', classes: 'progress' },
      {
        name: 'netInclTaxes',
        label: 'Montant',
        field: 'netInclTaxes',
        format: formatPrice,
        align: 'right',
        classes: 'formatted-price',
      },
      {
        name: 'paid',
        label: 'Réglé / crédité',
        field: 'paid',
        format: formatPrice,
        align: 'right',
        classes: 'formatted-price',
      },
      {
        name: 'total',
        label: 'Solde',
        field: 'total',
        format: formatPriceWithSign,
        align: 'right',
        classes: 'text-weight-bold formatted-price',
      },
      { name: 'payment', align: 'center', field: val => val.coursePayments || '', classes: 'formatted-price' },
      { name: 'expand', classes: 'expand' },
    ]);
    const paginations = ref([{ page: 1, rowsPerPage: 15 }, { page: 1, rowsPerPage: 15 }, { page: 1, rowsPerPage: 15 }]);
    const billingRepresentativeGroupedByCompany = ref({});
    const billingRepresentativeModal = ref(false);
    const billingRepresentativeModalLoading = ref(false);
    const billingRepresentativeModalLabel = ref({ action: '', interlocutor: '' });
    const tmpBillingRepresentativeId = ref('');

    const rules = {
      newCoursePayment: {
        nature: { required },
        netInclTaxes: { required, positiveNumber },
        type: { required },
        date: { required },
      },
      editedCoursePayment: {
        netInclTaxes: { required, positiveNumber },
        type: { required },
        date: { required },
      },
      tmpBillingRepresentativeId: { required },
    };

    const { isVendorInterface } = useCourses();

    const validations = useVuelidate(rules, { newCoursePayment, editedCoursePayment, tmpBillingRepresentativeId });

    const loggedUser = computed(() => $store.state.main.loggedUser);

    const hasHoldingRole = computed(() => !!get(loggedUser.value, 'role.holding'));

    const canUpdateBilling = computed(() => {
      const ability = defineAbilitiesFor(pick(loggedUser.value, ['role']));

      return ability.can('update', 'coursebilling');
    });

    const courseBillList = computed(() => courseBillsGroupedByCompany.value[company.value._id] || []);

    const groupedCourseBills = computed(() => {
      if (!courseBillList.value.length) return [];

      const companyBillsPayedByCompany = courseBillList.value
        .filter(bill => bill.payer._id === company.value._id &&
          bill.companies.map(c => c._id).includes(company.value._id));

      const companyBillsPayedByOther = courseBillList.value
        .filter(bill => bill.payer._id !== company.value._id &&
          bill.companies.map(c => c._id).includes(company.value._id));

      const otherBillsPayedByCompany = courseBillList.value
        .filter(bill => bill.payer._id === company.value._id &&
          !bill.companies.map(c => c._id).includes(company.value._id));

      return {
        ...companyBillsPayedByCompany.length && { 0: companyBillsPayedByCompany },
        ...companyBillsPayedByOther.length && { 1: companyBillsPayedByOther },
        ...otherBillsPayedByCompany.length && { 2: otherBillsPayedByCompany },
      };
    });

    const { pdfLoading, downloadBill, downloadCreditNote } = useCourseBilling(courseBillList);

    const sortCourseBills = (a, b) => {
      const billedAtCompare = descendingSortBy('billedAt')(a, b);

      return billedAtCompare === 0 ? descendingSortBy('createdAt')(a, b) : billedAtCompare;
    };

    const refreshCourseBills = async () => {
      try {
        loading.value = true;
        courseBillsGroupedByCompany.value[company.value._id] = await CourseBills
          .list({ company: company.value._id, action: BALANCE })
          .then(data => data.sort(sortCourseBills));
      } catch (e) {
        console.error(e);
        courseBillsGroupedByCompany.value[company.value._id] = [];
        NotifyNegative('Erreur lors de la récupération des factures.');
      } finally {
        loading.value = false;
      }
    };

    const openCoursePaymentCreationModal = (courseBill) => {
      coursePaymentMetaInfo.value = {
        number: courseBill.number,
        netInclTaxes: courseBill.netInclTaxes,
        courseName: composeCourseName(courseBill.course),
        companiesName: courseBill.companies.map(c => c.name).join(', '),
      };
      newCoursePayment.value.courseBill = courseBill._id;
      coursePaymentCreationModal.value = true;
    };

    const openCoursePaymentEditionModal = (courseBill, coursePayment) => {
      coursePaymentMetaInfo.value = {
        number: courseBill.number,
        netInclTaxes: courseBill.netInclTaxes,
        courseName: `${company.value.name} - ${courseBill.course.subProgram.program.name} - ${courseBill.course.misc}`,
      };
      editedCoursePayment.value = pick(coursePayment, ['_id', 'nature', 'netInclTaxes', 'type', 'date']);
      coursePaymentEditionModal.value = true;
    };

    const createPayment = async () => {
      try {
        if (canUpdateBilling.value) {
          validations.value.newCoursePayment.$touch();
          if (validations.value.newCoursePayment.$error) return NotifyWarning('Champ(s) invalide(s)');

          paymentCreationLoading.value = true;
          await CoursePayments.create(newCoursePayment.value);
          NotifyPositive('Règlement créé.');

          coursePaymentCreationModal.value = false;
          await refreshCourseBills();
        }
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la création du règlement.');
      } finally {
        paymentCreationLoading.value = false;
      }
    };

    const editPayment = async () => {
      try {
        if (canUpdateBilling.value) {
          validations.value.editedCoursePayment.$touch();
          if (validations.value.editedCoursePayment.$error) return NotifyWarning('Champ(s) invalide(s)');

          paymentEditionLoading.value = true;
          await CoursePayments.update(
            editedCoursePayment.value._id,
            omit(editedCoursePayment.value, ['_id', 'nature'])
          );
          NotifyPositive('Règlement modifié.');

          coursePaymentEditionModal.value = false;
          await refreshCourseBills();
        }
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la modification du règlement.');
      } finally {
        paymentEditionLoading.value = false;
      }
    };

    const resetCoursePaymentCreationModal = () => {
      newCoursePayment.value = { nature: PAYMENT, type: '', netInclTaxes: '', date: '', courseBill: '' };
      coursePaymentMetaInfo.value = { number: '', courseName: '', netInclTaxes: '' };
      validations.value.newCoursePayment.$reset();
    };

    const resetCoursePaymentEditionModal = () => {
      editedCoursePayment.value = { _id: '', nature: '', type: '', netInclTaxes: '', date: '' };
      coursePaymentMetaInfo.value = { number: '', courseName: '', netInclTaxes: '' };
      validations.value.editedCoursePayment.$reset();
    };

    const getItemType = item => (item.type
      ? PAYMENT_OPTIONS.find(option => option.value === item.type).label
      : CREDIT_OPTION.label);

    const getSortedItems = bill => (bill.courseCreditNote
      ? [...bill.coursePayments, bill.courseCreditNote].sort(ascendingSortBy('date'))
      : bill.coursePayments.sort(ascendingSortBy('date')));

    const getTotal = (bills) => {
      const total = bills.reduce((acc, val) => acc + val.total, 0);

      return formatPriceWithSign(total);
    };

    const hasUserAccessToCourse = course => course.companies.find(c => hasUserAccessToCompany(loggedUser.value, c));

    const goToCourse = (course) => {
      if (canUpdateBilling.value) {
        return {
          name: 'ni management blended courses info',
          params: { courseId: course._id },
          query: { defaultTab: 'billing' },
        };
      }
      if (hasUserAccessToCourse(course)) return { name: 'ni courses info', params: { courseId: course._id } };
      return {};
    };

    const getCourseNameClass = course => (
      canUpdateBilling.value || hasUserAccessToCourse(course) ? 'course redirection' : 'course no-event'
    );

    const getTableName = (index) => {
      switch (index) {
        case '0':
          return isVendorInterface || hasHoldingRole.value
            ? `Formation de ${company.value.name} facturées à ${company.value.name}`
            : 'Mes formations facturées à ma structure';
        case '1':
          return isVendorInterface || hasHoldingRole.value
            ? `Formations de ${company.value.name} facturées à un tiers`
            : 'Mes formations facturées à un tiers';
        case '2':
          return isVendorInterface || hasHoldingRole.value
            ? `Autres formations facturées à ${company.value.name}`
            : 'Autres formations facturées à ma structure';
      }
    };

    const getProgramName = (course) => {
      const programName = get(course, 'subProgram.program.name');
      const misc = get(course, 'misc') ? `\u00A0- ${get(course, 'misc')}` : '';
      const miscLength = misc ? misc.length : 0;
      const length = programName.length + miscLength;
      const tableSize = Screen.width >= 1024 ? Screen.width * (70 / 100) : Screen.width * (90 / 100);
      // table width : 70(or 90)% of screen width; program name column width : 30% of table width; letter width : 6.5px
      const maxLength = Math.floor(((30 / 100) * tableSize) / 6.5);
      if (length > maxLength) {
        const limit = maxLength - miscLength - 3;
        return `${programName.slice(0, limit)}...${misc}`;
      }
      return `${programName}${misc}`;
    };

    const openBillingRepresentativeModal = (event) => {
      const { action: eventAction } = event;
      const action = eventAction === EDITION ? 'Modifier le ' : 'Ajouter un ';

      tmpBillingRepresentativeId.value = get(company.value, 'billingRepresentative._id');
      billingRepresentativeModalLabel.value = {
        action,
        interlocutor: `chargé de facturation chez ${truncate(company.value.name, 20)}`,
      };
      billingRepresentativeModal.value = true;
    };

    const refreshBillingRepresentativeOptions = async () => {
      const usersOptions = await Users
        .list({ role: [CLIENT_ADMIN, HOLDING_ADMIN], includeHoldingAdmins: true, company: company.value._id });

      billingRepresentativeGroupedByCompany.value[company.value._id] = formatAndSortUserOptions(usersOptions, false);
    };

    const updateCompany = async () => {
      try {
        billingRepresentativeModalLoading.value = true;
        validations.value.tmpBillingRepresentativeId.$touch();
        if (validations.value.tmpBillingRepresentativeId.$error) return NotifyWarning('Champ(s) invalide(s)');

        await Companies.updateById(company.value._id, { billingRepresentative: tmpBillingRepresentativeId.value });
        NotifyPositive('Modification enregistrée.');

        emit('refresh-company');
        billingRepresentativeModal.value = false;
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la modification.');
      } finally {
        tmpBillingRepresentativeId.value = '';
        billingRepresentativeModalLoading.value = false;
      }
    };

    const resetBillingRepresentative = () => {
      tmpBillingRepresentativeId.value = '';
      billingRepresentativeModalLabel.value = { action: '', interlocutor: '' };
      validations.value.tmpBillingRepresentativeId.$reset();
    };

    watch(company, async () => {
      if (!courseBillList.value.length && company.value._id) {
        await Promise.all([refreshCourseBills(), refreshBillingRepresentativeOptions()]);
      }
    });

    const created = async () => {
      if (get(company.value, '_id')) {
        await Promise.all([refreshCourseBills(), refreshBillingRepresentativeOptions()]);
      }
    };

    created();

    return {
      // Data
      columns,
      paginations,
      loading,
      pdfLoading,
      coursePaymentMetaInfo,
      coursePaymentCreationModal,
      coursePaymentEditionModal,
      newCoursePayment,
      editedCoursePayment,
      paymentCreationLoading,
      paymentEditionLoading,
      PAYMENT_OPTIONS,
      REFUND,
      DD_MM_YYYY,
      billingRepresentativeModal,
      billingRepresentativeModalLabel,
      billingRepresentativeModalLoading,
      billingRepresentativeGroupedByCompany,
      tmpBillingRepresentativeId,
      // Computed
      validations,
      canUpdateBilling,
      groupedCourseBills,
      // Methods
      refreshCourseBills,
      formatPrice,
      formatName,
      formatQuantity,
      downloadBill,
      downloadCreditNote,
      openCoursePaymentCreationModal,
      openCoursePaymentEditionModal,
      createPayment,
      editPayment,
      resetCoursePaymentCreationModal,
      resetCoursePaymentEditionModal,
      getItemType,
      getSortedItems,
      getTotal,
      get,
      goToCourse,
      getCourseNameClass,
      getTableName,
      getProgramName,
      CompaniDate,
      openBillingRepresentativeModal,
      updateCompany,
      resetBillingRepresentative,
    };
  },
};
</script>

<style lang="sass" scoped>
.q-td
  @media screen and (max-width: 767px)
    font-size: 9px
.program
  flex: 1
  color: $copper-grey-600
  height: 1.5em
  overflow: hidden
.misc
  width: max-content
  color: $copper-grey-600
.course
  display: flex
  max-width: fit-content
.redirection
  &:hover
    text-decoration: underline
    text-decoration-color: $copper-grey-600
.no-event
  pointer-events: none
.add-payment
  background-color: $copper-grey-500
  width: 20px
  height: 20px
  justify-content: center
.cell
  padding: 0
  width: 100%
.date
  width: 10%
  padding: 4px
.payment
  width: 30%
  padding: 4px
.progress
  width: 15%
  padding: 4px
.formatted-price
  width: 10%
  padding: 4px
  text-align: right
.edit
  display: flex
  justify-content: flex-end
  width: 5%
  padding-right: 4px
.expand
  width: 5%
  padding: 4px
.download-credit-note
  text-decoration: underline
</style>
