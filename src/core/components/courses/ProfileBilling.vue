<template>
  <div>
    <div v-if="isIntraCourse || isSingleCourse" class="row gutter-profile">
      <ni-input v-model="course.expectedBillsCount" required-field @focus="saveTmp('expectedBillsCount')"
        @blur="updateCourse('expectedBillsCount')" caption="Nombre de factures" type="number"
        :error="v$.course.expectedBillsCount.$error" :error-message="expectedBillsCountErrorMessage" />
    </div>
    <ni-banner v-else-if="missingBillsCompanies.length" icon="info_outline">
      <template #message>
        Les structures suivantes n'ont pas été facturées : {{ formatName(missingBillsCompanies) }}.
      </template>
    </ni-banner>
    <q-card v-if="course.companies.length" class="q-mt-sm q-px-md bg-peach-200">
      <q-item-section @click="showDetails" class="prices cursor-pointer row copper-grey-700">
        {{ showPrices ? 'Masquer' : 'Afficher' }} les prix
        <q-icon size="xs" :name="showPrices ? 'expand_less' : 'expand_more'" color="copper-grey-700" />
      </q-item-section>
      <div v-if="showPrices">
        <div v-for="(company, i) of course.companies" :key="company._id">
          <span v-if="!(isIntraCourse || isSingleCourse)" class="text-weight-regular text-copper-500">
            {{ company.name }}
          </span>
          <div class="row gutter-profile">
            <ni-input v-model="course.prices[i].global" caption="Prix de la formation"
              :error="getPriceError(i, 'global')" @blur="updatePrice(i, 'global', course.companies[i]._id)"
              :disable="(companiesList.some(c => c.includes(company._id)) && !isSingleCourse) || !!course.archivedAt"
              type="number" @focus="saveTmp('prices[i].global')" required-field
              :error-message="getPriceErrorMessage(i, 'global')" />
            <ni-input v-model="course.prices[i].trainerFees" caption="Frais de formateur¹" type="number"
              :disable="(companiesList.some(c => c.includes(company._id)) && !isSingleCourse) || !!course.archivedAt"
              @focus="saveTmp('prices[i].trainerFees')" @blur="updatePrice(i, 'trainerFees', course.companies[i]._id)"
              :error="getPriceError(i, 'trainerFees')" :error-message="getPriceErrorMessage(i, 'trainerFees')" />
          </div>
        </div>
        <span class="text-italic text-12">
          1 - si les frais de formateur ne s’appliquent qu’à une seule facture, ne pas remplir ce champ et ajouter
          plutôt un article de facturation
        </span>
      </div>
    </q-card>
    <ni-banner v-if="courseBills.length" icon="info_outline" class="q-mt-md bg-peach-200">
      <template #message>
        Montant total des factures : <span class="text-weight-bold">{{ formatPrice(totalPrice.billedPrice) }}</span>
        (dont <span class="text-weight-bold">{{ formatPrice(totalPrice.validatedPrice) }}</span> facturés au client)
      </template>
    </ni-banner>
    <div v-for="(companies, index) of companiesList" :key="index">
      <ni-course-billing-card :course="course" :payer-list="payerList" :loading="billsLoading"
        :billing-item-list="billingItemList" :course-bills="billsGroupedByCompanies[companies]"
        @refresh-course-bills="refreshCourseBills" @unroll="unrollBill({ _id: $event })"
        :are-details-visible="areDetailsVisible" :expected-bills-count-invalid="v$.course.expectedBillsCount.$error"
        :selected-bills="selectedBills" @update-selected-bills="updateSelectedBills" />
    </div>
    <div v-if="!course.companies.length" class="text-italic">Aucune structure n'est rattachée à la formation</div>

    <div class="fixed fab-custom">
      <q-btn class="q-ma-sm" no-caps rounded label="Créer des factures" @click="openMultipleBillCreationModal"
        color="primary" :disable="billCreationLoading || !course.companies.length || !!selectedBills.length"
        :loading="billsLoading" icon="add" />

      <q-btn v-if="courseBills.length" class="q-ma-sm" no-caps rounded icon="edit" label="Modifier les factures"
        @click="openMultipleBillEditionModal" color="primary" :disable="!selectedBills.length" />

      <q-btn v-if="courseBills.length" class="q-ma-sm" no-caps rounded icon="delete" label="Supprimer les factures"
        @click="() => openBillDeletionModal(selectedBills.length === 1)" color="primary"
        :disable="!selectedBills.length" />
    </div>

    <ni-bill-creation-modal v-model="billCreationModal" v-model:new-bill="newBill" :course-name="courseName"
      @submit="validateBillCreation" :validations="v$.newBill" @hide="resetBillCreationModal"
      :loading="billCreationLoading" :payer-options="payerList" :error-messages="newBillErrorMessages"
      :trainees-quantity="traineesQuantity" :course="course" :companies-to-bill="companiesToBill"
      :total-price-to-bill="totalPriceToBill" :bills-quantity="newBillsQuantity" />

    <ni-multiple-course-bill-creation-modal :validations="v$.newBillsQuantity"
      v-model="multipleBillCreationModal" v-model:new-bills-quantity="newBillsQuantity"
      :loading="billCreationLoading" @submit="validateBillsQuantity" @hide="resetBillsQuantity" />

    <ni-companies-selection-modal v-model="companiesSelectionModal" v-model:companies-to-bill="companiesToBill"
      :course-companies="course.companies" @submit="openNextModal" :validations="v$.companiesToBill"
      @hide="resetCompaniesSelectionModal" :course-name="courseName" :is-inter-course="course.type === INTER_B2B" />

    <ni-multiple-course-bill-edition-modal v-model="multipleCourseBillEditionModal" :several-payers="severalPayers"
      v-model:bills-to-update="billsToUpdate" @submit="updateBills" @hide="resetBillsEditionModal"
      :payer-options="payerList" :course-infos="courseInfos" :validations="v$.billsToUpdate" />
  </div>
</template>

<script>
import { useStore } from 'vuex';
import { useQuasar } from 'quasar';
import { computed, ref, watch } from 'vue';
import get from 'lodash/get';
import set from 'lodash/set';
import omit from 'lodash/omit';
import pickBy from 'lodash/pickBy';
import groupBy from 'lodash/groupBy';
import uniq from 'lodash/uniq';
import has from 'lodash/has';
import useVuelidate from '@vuelidate/core';
import { required, minValue, maxValue, helpers, or, requiredIf } from '@vuelidate/validators';
import { minArrayLength, integerNumber, positiveNumber, strictPositiveNumber } from '@helpers/vuelidateCustomVal';
import { composeCourseName, computeDuration } from '@helpers/courses';
import { formatPrice, formatName, sortStrings, formatIdentity, removeEmptyProps, formatQuantity } from '@helpers/utils';
import { ascendingSortBy } from '@helpers/dates/utils';
import CompaniDate from '@helpers/dates/companiDates';
import CompaniDuration from '@helpers/dates/companiDurations';
import { add, multiply, toFixedToFloat } from '@helpers/numbers';
import Courses from '@api/Courses';
import CourseBills from '@api/CourseBills';
import { NotifyNegative, NotifyPositive, NotifyWarning } from '@components/popup/notify';
import { useCourseBilling } from '@composables/courseBills';
import {
  LIST,
  COMPANY,
  REQUIRED_LABEL,
  INTRA,
  GROUP,
  TRAINEE,
  LONG_DURATION_H_MM,
  E_LEARNING,
  DD_MM_YYYY,
  INTER_B2B,
  SINGLE,
  EDITION,
} from '@data/constants';
import CourseBillingCard from 'src/modules/vendor/components/billing/CourseBillingCard';
import BillCreationModal from 'src/modules/vendor/components/billing/CourseBillCreationModal';
import CompaniesSelectionModal from 'src/modules/vendor/components/billing/CompaniesSelectionModal';
import MultipleCourseBillCreationModal from 'src/modules/vendor/components/billing/MultipleCourseBillCreationModal';
import MultipleCourseBillEditionModal from 'src/modules/vendor/components/billing/MultipleCourseBillEditionModal';
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
    'ni-multiple-course-bill-creation-modal': MultipleCourseBillCreationModal,
    'ni-multiple-course-bill-edition-modal': MultipleCourseBillEditionModal,
  },
  setup () {
    const $store = useStore();
    const $q = useQuasar();

    const courseBills = ref([]);
    const billsLoading = ref(false);
    const tmpInput = ref('');
    const billCreationModal = ref(false);
    const companiesSelectionModal = ref(false);
    const billCreationLoading = ref(false);
    const removeNewBillDatas = ref(true);
    const multipleBillCreationModal = ref(false);
    const newBillsQuantity = ref(1);
    const billsToUpdate = ref({ _ids: [] });
    const multipleCourseBillEditionModal = ref(false);

    const course = computed(() => $store.state.course.course);

    const showPrices = ref((course.value.prices || []).some(p => !p.global));

    const companiesToBill = ref([INTRA, SINGLE].includes(course.value.type) ? [course.value.companies[0]._id] : []);

    const everyCompaniesToBillHasPrice = computed(() => companiesToBill.value.length && companiesToBill.value
      .every(c => course.value.prices.find(p => p.company === c && p.global)));

    const newBill = ref({
      payer: '',
      mainFee: { price: 0, count: 1, countUnit: course.value.type === SINGLE ? TRAINEE : GROUP, description: '' },
      maturityDate: '',
    });

    const totalPriceToBill = ref({ global: 0, trainerFees: 0 });

    const { isIntraCourse, isSingleCourse } = useCourses(course);

    const rules = computed(() => ({
      course: {
        expectedBillsCount: {
          required,
          positiveNumber,
          integerNumber,
          minValue: minValue(courseBills.value.filter(bill => !bill.courseCreditNote).length),
        },
        prices: {
          $each: helpers.forEach({
            trainerFees: { strictPositiveNumber: or(strictPositiveNumber, value => value === '') },
            global: { required, strictPositiveNumber },
          }),
        },
      },
      newBill: {
        payer: { required },
        mainFee: {
          ...(newBillsQuantity.value === 1 && { price: { strictPositiveNumber, required } }),
          count: { required, strictPositiveNumber, integerNumber },
          ...(course.value.type !== SINGLE && everyCompaniesToBillHasPrice.value && {
            ...(newBillsQuantity.value === 1 &&
            { percentage: { required, strictPositiveNumber, integerNumber, maxValue: maxValue(100) } }),
          }),
          countUnit: { required },
        },
        ...((newBillsQuantity.value === 1 || isSingleCourse.value) && { maturityDate: { required } }),
      },
      companiesToBill: { minArrayLength: minArrayLength(1) },
      newBillsQuantity: { strictPositiveNumber, integerNumber, required },
      billsToUpdate: {
        _ids: { minArrayLength: minArrayLength(1) },
        payer: { required: requiredIf(Object.keys(billsToUpdate.value).includes('payer')) },
        mainFee: {
          ...(Object.keys(get(billsToUpdate.value, 'mainFee', {})).includes('price') &&
            { price: { strictPositiveNumber, required } }),
        },
      },
    }));

    const v$ = useVuelidate(rules, { course, newBill, companiesToBill, newBillsQuantity, billsToUpdate });

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

    const {
      payerList,
      billingItemList,
      areDetailsVisible,
      selectedBills,
      getBillErrorMessages,
      openBillDeletionModal,
      updateSelectedBills,
      refreshPayers,
      refreshBillingItems,
      unrollBill,
    } = useCourseBilling(courseBills, v$, refreshCourseBills);

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

    const courseInfos = computed(() => ({
      courseType: course.value.type,
      companiesName: courseBills.value
        .filter(bill => selectedBills.value.includes(bill._id))
        .map(bill => formatName(bill.companies)),
      courseName,
      ...(isSingleCourse.value && {
        trainersName: course.value.trainers.map(trainer => formatIdentity(trainer.identity, 'FL')).join(', '),
        traineeName: formatIdentity(course.value.trainees[0].identity, 'FL'),
      }),
    }));

    const severalPayers = computed(() => {
      const payerCount = uniq(
        courseBills.value.filter(bill => selectedBills.value.includes(bill._id)).map(bill => bill.payer._id)
      ).length;

      return payerCount > 1;
    });

    const totalPrice = computed(() => {
      let billedPrice = 0;
      let validatedPrice = 0;

      courseBills.value.filter(bill => !bill.courseCreditNote).forEach((cb) => {
        const billingItemsPrice = cb.billingPurchaseList
          .reduce((acc, item) => add(acc, (multiply(item.price, item.count))), 0);
        const billPrice = add(multiply(cb.mainFee.count, cb.mainFee.price || 0), billingItemsPrice);

        billedPrice = add(billedPrice, billPrice);
        if (cb.billedAt) validatedPrice = add(validatedPrice, billPrice);
      });

      return { billedPrice: toFixedToFloat(billedPrice), validatedPrice: toFixedToFloat(validatedPrice) };
    });

    const saveTmp = (path) => { tmpInput.value = course.value[path]; };

    const formatPayerForPayload = (payloadPayer) => {
      const payerType = payerList.value.find(payer => payer.value === payloadPayer).type;

      return payerType === COMPANY ? { company: payloadPayer } : { fundingOrganisation: payloadPayer };
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

        v$.value.course[path].$touch();
        if (v$.value.course[path].$error) return NotifyWarning('Champ(s) invalide(s).');

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
      quantity: newBillsQuantity.value,
      companies: companiesToBill.value,
      payer: formatPayerForPayload(newBill.value.payer),
      mainFee: isSingleCourse.value && newBillsQuantity.value > 1
        ? omit(newBill.value.mainFee, 'description')
        : newBill.value.mainFee,
      ...((newBillsQuantity.value === 1 || isSingleCourse.value) && { maturityDate: newBill.value.maturityDate }),
    });

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

    const validateBillsQuantity = async () => {
      v$.value.newBillsQuantity.$touch();
      if (v$.value.newBillsQuantity.$error) return NotifyWarning('Champ invalide.');

      const courseBillsWithoutCreditNote = courseBills.value.filter(bill => !bill.courseCreditNote);
      const totalBillsAfterCreation = courseBillsWithoutCreditNote.length + newBillsQuantity.value;

      if (totalBillsAfterCreation > course.value.expectedBillsCount) {
        return NotifyWarning('Impossible de créer autant de factures, nombre maximum de factures atteint.');
      }

      if (isIntraCourse.value || isSingleCourse.value) openBillCreationModal();
      else companiesSelectionModal.value = true;

      multipleBillCreationModal.value = false;
    };

    const addBill = async () => {
      try {
        billCreationLoading.value = true;
        await CourseBills.createList(formatCreationPayload());

        NotifyPositive('Facture(s) créée(s).');

        billCreationModal.value = false;
        await refreshCourseBills();
        unrollBill({ quantity: newBillsQuantity.value });
        resetCompaniesSelectionModal();
      } catch (e) {
        console.error(e);
        if (e.status === 409) return NotifyNegative(e.data.message);
        NotifyNegative('Erreur lors de la création de la facture.');
      } finally {
        billCreationLoading.value = false;
      }
    };

    const resetBillsQuantity = () => {
      if (!billCreationModal.value && !companiesSelectionModal.value) {
        newBillsQuantity.value = 1;
        v$.value.newBillsQuantity.$reset();
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
          maturityDate: '',
        };
        totalPriceToBill.value = { global: 0, trainerFees: 0 };
        v$.value.newBill.$reset();
        resetCompaniesSelectionModal();
        resetBillsQuantity();
      }
    };

    const openBillCreationModal = () => {
      totalPriceToBill.value = course.value.prices.reduce((acc, price) => {
        if (companiesToBill.value.includes(price.company)) {
          return {
            global: toFixedToFloat(add(acc.global, (price.global || 0))),
            trainerFees: toFixedToFloat(add(acc.trainerFees, (price.trainerFees || 0))),
          };
        }
        return acc;
      }, { global: 0, trainerFees: 0 });

      if (!isSingleCourse.value && everyCompaniesToBillHasPrice.value && newBillsQuantity.value === 1) {
        newBill.value.mainFee.percentage = 40;
      }

      billCreationModal.value = true;
    };

    const openMultipleBillCreationModal = () => {
      if (course.value.interruptedAt) return NotifyWarning('Impossible : la formation est en pause.');

      if (!courseBills.value.length && !course.value.prices.some(p => p.global)) {
        return NotifyWarning('Prix de la formation manquant.');
      }

      if (isIntraCourse.value || isSingleCourse.value) {
        if (v$.value.course.expectedBillsCount.$error) return NotifyWarning('Champ(s) invalide(s).');

        const courseBillsWithoutCreditNote = courseBills.value.filter(bill => !bill.courseCreditNote);
        if (courseBillsWithoutCreditNote.length === course.value.expectedBillsCount) {
          return NotifyWarning('Impossible de créer une facture, nombre de factures maximum atteint.');
        }
      }

      if (!courseBills.value.length && course.value.expectedBillsCount) {
        newBillsQuantity.value = course.value.expectedBillsCount;
      }

      multipleBillCreationModal.value = true;
    };

    const openNextModal = () => {
      v$.value.companiesToBill.$touch();
      if (v$.value.companiesToBill.$error) return NotifyWarning('Champ(s) invalide(s).');
      if (!everyCompaniesToBillHasPrice.value) {
        const someCompaniesToBillHasPrice = companiesToBill.value
          .some(c => course.value.prices.find(price => price.global && price.company === c));
        if (someCompaniesToBillHasPrice) {
          return NotifyWarning('Impossible de facturer les structures sélectionnées simultanément.');
        }
        const someCompaniesToBillHasNoBill = companiesToBill.value
          .some(c => !companiesList.value.some(companies => companies.includes(c)));
        if (someCompaniesToBillHasNoBill) {
          return NotifyWarning('Prix de la formation manquant pour une structure sélectionnée.');
        }
      }

      openBillCreationModal();
      companiesSelectionModal.value = false;
      removeNewBillDatas.value = true;
    };

    const resetCompaniesSelectionModal = () => {
      if (!billCreationModal.value) {
        companiesToBill.value = isIntraCourse.value || isSingleCourse.value ? [course.value.companies[0]._id] : [];
        v$.value.companiesToBill.$reset();
      }

      resetBillsQuantity();
    };

    const getPriceError = (index, path) => {
      const validation = v$.value.course.prices.$each.$response.$errors[index];

      return get(validation, `${path}.0.$response`) === false;
    };

    const getPriceErrorMessage = (index, path) => {
      const validation = v$.value.course.prices.$each.$response.$errors[index][path];
      switch (get(validation, '0.$validator')) {
        case 'required':
          return REQUIRED_LABEL;
        case 'strictPositiveNumber':
          return 'Nombre invalide';
        default:
          return '';
      }
    };

    const updatePrice = async (index, path, company) => {
      try {
        get(v$.value, 'course.prices').$touch();
        const validation = get(v$.value, `course.prices.$each.$response.$errors[${index}].[${path}].0.$response`);
        if (validation === false) return NotifyWarning('Champ(s) invalide(s).');
        if (path === 'trainerFees' && !get(course.value, `prices[${index}].global`)) {
          return NotifyWarning('Veuillez ajouter un prix à la formation.');
        }
        const editedPrice = get(course.value, `prices[${index}].${path}`) || '';
        const payload = { prices: { company, [path]: editedPrice } };
        await Courses.update(course.value._id, payload);
        NotifyPositive('Modification enregistrée.');
      } catch (error) {
        console.error(error);
        NotifyNegative('Erreur lors de la modification.');
      }
    };

    const showDetails = () => { showPrices.value = !showPrices.value; };

    const openMultipleBillEditionModal = () => {
      const firstBill = courseBills.value.find(b => b._id === selectedBills.value[0]);
      if (selectedBills.value.length === 1) {
        set(billsToUpdate.value, 'payer', firstBill.payer._id);
        set(billsToUpdate.value, 'mainFee.description', firstBill.mainFee.description || '');
        if (isSingleCourse.value) set(billsToUpdate.value, 'mainFee.price', get(firstBill, 'mainFee.price', 0));
      } else if (!severalPayers.value) {
        set(billsToUpdate.value, 'payer', firstBill.payer._id);
      }

      if (isSingleCourse.value) {
        const sortedBills = courseBills.value
          .filter(cb => selectedBills.value.includes(cb._id))
          .sort(ascendingSortBy('maturityDate'));
        set(billsToUpdate.value, '_ids', sortedBills.map(cb => cb._id));
        set(billsToUpdate.value, 'firstMaturityDate', sortedBills[0].maturityDate);
        set(billsToUpdate.value, 'maturityDate', sortedBills[0].maturityDate);
        if (sortedBills[0].mainFee.description) {
          set(billsToUpdate.value, 'mainFee.description', sortedBills[0].mainFee.description);
        }
      } else {
        set(billsToUpdate.value, '_ids', selectedBills.value);
      }

      multipleCourseBillEditionModal.value = true;
    };

    const formatBillsPayload = () => {
      const bills = billsToUpdate.value;
      const fieldsToRemove = ['firstMaturityDate'];
      if (get(bills, 'maturityDate') && get(bills, 'firstMaturityDate')) {
        const isSameMaturityDate = CompaniDate(bills.maturityDate).isSame(bills.firstMaturityDate);

        if (isSameMaturityDate) {
          fieldsToRemove.push('maturityDate');
          if (bills._ids.length > 1) fieldsToRemove.push('mainFee.description');
        }
      }

      const payload = {
        ...omit(bills, fieldsToRemove),
        ...(bills.payer && { payer: formatPayerForPayload(bills.payer) }),
      };

      const keepEmptyDescription = has(bills, 'mainFee.description') && bills.mainFee.description === '';
      return keepEmptyDescription ? payload : removeEmptyProps(payload);
    };

    const updateBills = async () => {
      try {
        const editedFields = has(billsToUpdate.value, 'payer') || has(billsToUpdate.value, 'mainFee.description') ||
          has(billsToUpdate.value, 'mainFee.price');
        if (!editedFields) return NotifyWarning('Vous devez éditer au moins un champ.');

        v$.value.billsToUpdate.$touch();
        if (v$.value.billsToUpdate.$error) return NotifyWarning('Champ(s) invalide(s).');

        const payload = formatBillsPayload();
        await CourseBills.updateBillList(payload);

        await refreshCourseBills();
        unrollBill({ quantity: selectedBills.value.length, type: EDITION });

        NotifyPositive(`${formatQuantity('facture modifiée', selectedBills.value.length)}.`);
        selectedBills.value = [];
        multipleCourseBillEditionModal.value = false;
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la modification des factures.');
      }
    };

    const resetBillsEditionModal = () => {
      billsToUpdate.value = { _ids: [] };
      v$.value.billsToUpdate.$reset();
    };

    watch(billCreationModal, () => {
      if (billCreationModal.value) newBill.value.mainFee.description = defaultDescription.value;
    });

    watch(newBillsQuantity, () => {
      if (newBillsQuantity.value > 1) {
        newBill.value = omit(newBill.value, ['mainFee.price', ...(!isSingleCourse.value ? ['maturityDate'] : [])]);
      }
    });

    const created = async () => {
      await Promise.all([refreshCourseBills(), refreshPayers(), refreshBillingItems()]);
    };

    created();

    return {
      // Data
      INTER_B2B,
      showPrices,
      totalPriceToBill,
      newBillsQuantity,
      // Validation
      v$,
      // Data
      payerList,
      billingItemList,
      courseBills,
      billsLoading,
      billCreationLoading,
      billCreationModal,
      multipleBillCreationModal,
      newBill,
      companiesSelectionModal,
      companiesToBill,
      areDetailsVisible,
      selectedBills,
      multipleCourseBillEditionModal,
      billsToUpdate,
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
      totalPrice,
      severalPayers,
      courseInfos,
      // Methods
      saveTmp,
      refreshCourseBills,
      unrollBill,
      refreshPayers,
      updateCourse,
      validateBillCreation,
      validateBillsQuantity,
      resetBillCreationModal,
      resetBillsQuantity,
      openBillCreationModal,
      openMultipleBillCreationModal,
      resetCompaniesSelectionModal,
      openNextModal,
      get,
      omit,
      pickBy,
      formatPrice,
      formatName,
      updatePrice,
      getPriceError,
      getPriceErrorMessage,
      showDetails,
      openBillDeletionModal,
      updateSelectedBills,
      openMultipleBillEditionModal,
      updateBills,
      resetBillsEditionModal,
    };
  },
};
</script>

<style lang="sass" scoped>
.prices
  flex-direction: row
  justify-content: space-between
  padding: 16px 0px
</style>
