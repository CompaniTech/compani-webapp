<template>
  <div>
    <div v-if="isIntraCourse || isSingleCourse" class="row gutter-profile">
      <ni-input v-model="course.expectedBillsCount" required-field @focus="saveTmp('expectedBillsCount')"
        @blur="updateCourse('expectedBillsCount')" caption="Nombre de factures"
        :error="v$.course.expectedBillsCount.$error" :error-message="expectedBillsCountErrorMessage" />
    </div>
    <ni-banner v-else-if="missingBillsCompanies.length" icon="info_outline">
      <template #message>
        Les structures suivantes n'ont pas été facturées : {{ formatName(missingBillsCompanies) }}.
      </template>
    </ni-banner>
    <div v-for="(companies, index) of companiesList" :key="index">
      <ni-course-billing-card :course="course" :payer-list="payerList" :loading="billsLoading"
        :billing-item-list="billingItemList" :course-bills="billsGroupedByCompanies[companies]"
        @refresh-course-bills="refreshCourseBills" @unroll="unrollBill" :are-details-visible="areDetailsVisible"
        :expected-bills-count-invalid="v$.course.expectedBillsCount.$error" />
    </div>
    <div v-if="!course.companies.length" class="text-italic">Aucune structure n'est rattachée à la formation</div>

    <q-btn class="fixed fab-custom" no-caps rounded icon="add" label="Créer une facture" @click="openBillCreationModal"
      color="primary" :disable="billCreationLoading || !course.companies.length" :loading="billsLoading" />

    <ni-bill-creation-modal v-model="billCreationModal" v-model:new-bill="newBill" :course-name="courseName"
      @submit="validateBillCreation" :validations="v$.newBill" @hide="resetBillCreationModal"
      :loading="billCreationLoading" :payer-options="payerList" :error-messages="newBillErrorMessages"
      :trainees-quantity="traineesQuantity" :course="course" :companies-to-bill="companiesToBill" />

    <ni-companies-selection-modal v-model="companiesSelectionModal" v-model:companies-to-bill="companiesToBill"
      :course-companies="course.companies" @submit="openNextModal" :validations="v$.companiesToBill"
      @hide="resetCompaniesSelectionModal" :course-name="courseName" :is-inter-course="course.type === INTER_B2B" />
  </div>
</template>

<script>
import { useStore } from 'vuex';
import { useQuasar } from 'quasar';
import { computed, ref, watch } from 'vue';
import get from 'lodash/get';
import omit from 'lodash/omit';
import pickBy from 'lodash/pickBy';
import groupBy from 'lodash/groupBy';
import uniq from 'lodash/uniq';
import useVuelidate from '@vuelidate/core';
import { required, minValue } from '@vuelidate/validators';
import { minArrayLength, integerNumber, positiveNumber, strictPositiveNumber } from '@helpers/vuelidateCustomVal';
import { composeCourseName, computeDuration } from '@helpers/courses';
import {
  formatAndSortOptions,
  formatPrice,
  formatName,
  sortStrings,
  formatIdentity,
  formatAndSortCompanyOptions,
} from '@helpers/utils';
import { descendingSortBy, ascendingSortBy } from '@helpers/dates/utils';
import CompaniDate from '@helpers/dates/companiDates';
import CompaniDuration from '@helpers/dates/companiDurations';
import Companies from '@api/Companies';
import Courses from '@api/Courses';
import CourseFundingOrganisations from '@api/CourseFundingOrganisations';
import CourseBills from '@api/CourseBills';
import CourseBillingItems from '@api/CourseBillingItems';
import { NotifyNegative, NotifyPositive, NotifyWarning } from '@components/popup/notify';
import { useCourseBilling } from '@composables/courseBills';
import {
  LIST,
  COMPANY,
  REQUIRED_LABEL,
  INTRA,
  FUNDING_ORGANISATION,
  GROUP,
  TRAINEE,
  LONG_DURATION_H_MM,
  E_LEARNING,
  DD_MM_YYYY,
  DIRECTORY,
  INTER_B2B,
  SINGLE,
} from '@data/constants';
import CourseBillingCard from 'src/modules/vendor/components/billing/CourseBillingCard';
import BillCreationModal from 'src/modules/vendor/components/billing/CourseBillCreationModal';
import CompaniesSelectionModal from 'src/modules/vendor/components/billing/CompaniesSelectionModal';
import Input from '@components/form/Input';
import Banner from '@components/Banner';
import { useCourses } from '@composables/courses';

export default {
  name: 'ProfileBilling',
  components: {
    'ni-course-billing-card': CourseBillingCard,
    'ni-bill-creation-modal': BillCreationModal,
    'ni-companies-selection-modal': CompaniesSelectionModal,
    'ni-input': Input,
    'ni-banner': Banner,
  },
  setup () {
    const $store = useStore();
    const $q = useQuasar();

    const courseBills = ref([]);
    const billsLoading = ref(false);
    const payerList = ref([]);
    const billingItemList = ref([]);
    const tmpInput = ref('');
    const billCreationModal = ref(false);
    const companiesSelectionModal = ref(false);
    const billCreationLoading = ref(false);
    const areDetailsVisible = ref(Object.fromEntries(courseBills.value.map(bill => [bill._id, false])));
    const removeNewBillDatas = ref(true);

    const course = computed(() => $store.state.course.course);

    const newBill = ref({
      payer: '',
      mainFee: { price: 0, count: 1, countUnit: course.value.type === SINGLE ? TRAINEE : GROUP, description: '' },
    });

    const companiesToBill = ref([INTRA, SINGLE].includes(course.value.type) ? [course.value.companies[0]._id] : []);

    const rules = computed(() => ({
      course: {
        expectedBillsCount: {
          required,
          positiveNumber,
          integerNumber,
          minValue: minValue(courseBills.value.filter(cb => !cb.courseCreditNote).length),
        },
      },
      newBill: {
        payer: { required },
        mainFee: {
          price: { required, strictPositiveNumber },
          count: { required, strictPositiveNumber, integerNumber },
          countUnit: { required },
        },
      },
      companiesToBill: { minArrayLength: minArrayLength(1) },
    }));

    const defaultDescription = computed(() => {
      const trainersName = course.value.trainers
        .map(trainer => formatIdentity(get(trainer, 'identity'), 'FL')).join(', ');

      if (!isSingleCourse.value) {
        const slots = [...course.value.slots].sort(ascendingSortBy('startDate'));

        const liveSteps = course.value.subProgram.steps.filter(s => s.type !== E_LEARNING);
        const liveDuration = CompaniDuration(computeDuration(liveSteps)).format(LONG_DURATION_H_MM);
        const eLearningSteps = course.value.subProgram.steps.filter(s => s.type === E_LEARNING);
        const eLearningDuration = CompaniDuration(computeDuration(eLearningSteps)).format(LONG_DURATION_H_MM);
        const startDate = slots.length ? CompaniDate(slots[0].startDate).format(DD_MM_YYYY) : '(date à planifier)';
        const endDate = course.value.slotsToPlan.length
          ? '(date à planifier)'
          : CompaniDate(slots[slots.length - 1].startDate).format(DD_MM_YYYY);
        const location = uniq(slots.map(s => get(s, 'address.city'))).join(', ');

        return 'Actions pour le développement des compétences \r\n'
        + `Formation pour ${traineesQuantity.value} salarié-es\r\n`
        + `Durée : ${liveDuration} présentiel${eLearningSteps.length ? `, ${eLearningDuration} eLearning` : ''}\r\n`
        + `Dates : du ${startDate} au ${endDate} \r\n`
        + `Lieu : ${location} \r\n`
        + `Nom du / des intervenant·es : ${trainersName}`;
      }
      const traineeName = course.value.trainees.length
        ? formatIdentity(get(course.value.trainees[0], 'identity'), 'FL')
        : '';

      return 'Facture liée à des frais pédagogiques \r\n'
      + 'Contrat de professionnalisation \r\n'
      + 'ACCOMPAGNEMENT \r\n'
      + `Nom de l'apprenant·e: ${traineeName} \r\n`
      + `Nom du / des intervenants: ${trainersName}`;
    });

    const v$ = useVuelidate(rules, { course, newBill, companiesToBill });

    const { isIntraCourse, isSingleCourse } = useCourses(course);

    const { getBillErrorMessages } = useCourseBilling(courseBills, v$);

    const billsGroupedByCompanies = computed(() => {
      const sortedBills = courseBills.value
        .map(bill => ({ ...bill, companies: bill.companies.sort((a, b) => sortStrings(a.name, b.name)) }))
        .sort((a, b) => sortStrings(formatName(a.companies), formatName(b.companies)));

      return groupBy(sortedBills, bill => bill.companies.map(cp => cp._id));
    });

    const companiesList = computed(() => Object.keys(billsGroupedByCompanies.value));

    const missingBillsCompanies = computed(() => course.value.companies
      .filter(c => !Object.keys(billsGroupedByCompanies.value).some(companiesIds => companiesIds.includes(c._id))));

    const expectedBillsCountErrorMessage = computed(() => {
      if (v$.value.course.expectedBillsCount.required.$response === false) return REQUIRED_LABEL;
      if (v$.value.course.expectedBillsCount.positiveNumber.$response === false) {
        return 'Nombre non valide, doit être positif';
      }
      if (v$.value.course.expectedBillsCount.minValue.$response === false) {
        return 'Le nombre doit être supérieur ou égal au nombre de factures valides pour cette formation';
      }
      return 'Nombre non valide';
    });

    const newBillErrorMessages = computed(() => getBillErrorMessages('newBill.mainFee'));

    const traineesQuantity = computed(() => course.value.trainees
      .filter(trainee => companiesToBill.value.includes(trainee.registrationCompany))
      .length);

    const courseName = computed(() => composeCourseName(course.value));

    const saveTmp = path => (tmpInput.value = course.value[path]);

    const refreshCourseBills = async () => {
      try {
        billsLoading.value = true;
        courseBills.value = await CourseBills.list({ course: course.value._id, action: LIST });
      } catch (e) {
        console.error(e);
        courseBills.value = [];
        NotifyNegative('Erreur lors de la récupération des factures.');
      } finally {
        billsLoading.value = false;
      }
    };

    const formatPayerForPayload = (payloadPayer) => {
      const payerType = payerList.value.find(payer => payer.value === payloadPayer).type;

      return payerType === COMPANY ? { company: payloadPayer } : { fundingOrganisation: payloadPayer };
    };

    const refreshPayers = async () => {
      try {
        const organisations = await CourseFundingOrganisations.list();
        const companyList = await Companies.list({ action: DIRECTORY });
        const formattedOrganisationList = formatAndSortOptions(organisations, 'name');
        const formattedCompanyList = formatAndSortCompanyOptions(companyList, 'name');
        payerList.value =
          [
            ...formattedOrganisationList.map(payer => ({ ...payer, type: FUNDING_ORGANISATION })),
            ...formattedCompanyList.map(company => ({ ...company, type: COMPANY })),
          ];
      } catch (e) {
        console.error(e);
        payerList.value = [];
        NotifyNegative('Erreur lors de la récupération des financeurs.');
      }
    };

    const refreshBillingItems = async () => {
      try {
        billsLoading.value = true;
        const billingItems = await CourseBillingItems.list();
        billingItemList.value = formatAndSortOptions([...billingItems], 'name');
      } catch (e) {
        console.error(e);
        billingItemList.value = [];
        NotifyNegative('Erreur lors de la récupération des articles de facturation.');
      } finally {
        billsLoading.value = false;
      }
    };

    const refreshCourse = async () => {
      try {
        billsLoading.value = true;
        await $store.dispatch('course/fetchCourse', { courseId: course.value._id });
      } catch (e) {
        console.error(e);
      } finally {
        billsLoading.value = false;
      }
    };

    const updateCourse = async (path) => {
      try {
        billsLoading.value = true;
        if (course.value[path] === tmpInput.value) return;

        v$.value.course.$touch();
        if (v$.value.course.$error) return NotifyWarning('Champ(s) invalide(s).');

        await Courses.update(course.value._id, { [path]: course.value[path] });
        NotifyPositive('Modification enregistrée.');

        await refreshCourse();
      } catch (e) {
        console.error(e);
        if (e.message === 'Champ(s) invalide(s)') return NotifyWarning(e.message);
        NotifyNegative('Erreur lors de la modification.');
      } finally {
        billsLoading.value = false;
      }
    };

    const formatCreationPayload = () => ({
      course: course.value._id,
      mainFee: newBill.value.mainFee,
      companies: companiesToBill.value,
      payer: formatPayerForPayload(newBill.value.payer),
    });

    const unrollBill = (billId) => {
      const bill = billId || [...courseBills.value].sort(descendingSortBy('createdAt'))[0]._id;
      areDetailsVisible.value[bill] = !areDetailsVisible.value[bill];
    };

    const validateBillCreation = async () => {
      v$.value.newBill.$touch();
      if (v$.value.newBill.$error) return NotifyWarning('Champ(s) invalide(s)');

      const areCompaniesAlreadyBilled = Object.keys(billsGroupedByCompanies.value)
        .some(companies => companiesToBill.value.some(c => companies.includes(c)));
      if (areCompaniesAlreadyBilled && !(isIntraCourse.value || isSingleCourse.value)) {
        const message = companiesToBill.value.length > 1
          ? 'Au moins une des structures sélectionnée a déjà été facturée, souhaitez-vous la refacturer&nbsp;?'
          : 'La structure sélectionnée a déjà été facturée, souhaitez-vous la refacturer&nbsp;?';

        $q.dialog({
          title: 'Confirmation',
          message,
          html: true,
          ok: true,
          cancel: 'Annuler',
          persistent: true,
        }).onOk(() => addBill())
          .onCancel(() => {
            removeNewBillDatas.value = false;
            billCreationModal.value = false;
            companiesSelectionModal.value = true;
          });
      } else {
        await addBill();
      }
    };

    const addBill = async () => {
      try {
        billCreationLoading.value = true;
        await CourseBills.create(formatCreationPayload());
        NotifyPositive('Facture créée.');

        billCreationModal.value = false;
        resetCompaniesSelectionModal();
        await refreshCourseBills();
        unrollBill();
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la création de la facture.');
      } finally {
        billCreationLoading.value = false;
      }
    };

    const resetBillCreationModal = () => {
      if (removeNewBillDatas.value) {
        newBill.value = {
          payer: '',
          mainFee: {
            price: 0,
            count: 1,
            countUnit: isSingleCourse.value ? TRAINEE : GROUP,
            description: '',
          },
        };
        v$.value.newBill.$reset();
        resetCompaniesSelectionModal();
      }
    };

    const openBillCreationModal = () => {
      if (isIntraCourse.value || isSingleCourse.value) {
        if (v$.value.course.expectedBillsCount.$error) return NotifyWarning('Champ(s) invalide(s).');

        const courseBillsWithoutCreditNote = courseBills.value.filter(cb => !cb.courseCreditNote);
        if (courseBillsWithoutCreditNote.length === course.value.expectedBillsCount) {
          return NotifyWarning('Impossible de créer une facture, nombre de factures maximum atteint.');
        }
        billCreationModal.value = true;
      } else {
        companiesSelectionModal.value = true;
      }
    };

    const openNextModal = () => {
      v$.value.companiesToBill.$touch();
      if (v$.value.companiesToBill.$error) return NotifyWarning('Champ(s) invalide(s).');
      companiesSelectionModal.value = false;
      billCreationModal.value = true;
      removeNewBillDatas.value = true;
    };

    const resetCompaniesSelectionModal = () => {
      if (!billCreationModal.value) {
        companiesToBill.value = isIntraCourse.value || isSingleCourse.value ? [course.value.companies[0]._id] : [];
        v$.value.companiesToBill.$reset();
      }
    };

    watch(billCreationModal, () => {
      if (billCreationModal.value) newBill.value.mainFee.description = defaultDescription.value;
    });

    const created = async () => {
      await Promise.all([refreshCourseBills(), refreshPayers(), refreshBillingItems()]);
    };

    created();

    return {
      // Data
      INTER_B2B,
      // Validation
      v$,
      // Data
      payerList,
      billingItemList,
      courseBills,
      billsLoading,
      billCreationLoading,
      billCreationModal,
      newBill,
      companiesSelectionModal,
      companiesToBill,
      areDetailsVisible,
      // Computed
      course,
      companiesList,
      isIntraCourse,
      isSingleCourse,
      expectedBillsCountErrorMessage,
      billsGroupedByCompanies,
      newBillErrorMessages,
      traineesQuantity,
      courseName,
      missingBillsCompanies,
      // Methods
      saveTmp,
      refreshCourseBills,
      unrollBill,
      refreshPayers,
      refreshBillingItems,
      updateCourse,
      validateBillCreation,
      resetBillCreationModal,
      openBillCreationModal,
      resetCompaniesSelectionModal,
      openNextModal,
      get,
      omit,
      pickBy,
      formatPrice,
      formatName,
    };
  },
};
</script>
