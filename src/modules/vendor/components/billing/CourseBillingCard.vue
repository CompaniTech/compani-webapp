<template>
  <div>
    <div class="q-mt-lg q-mb-xl">
      <p v-if="![INTRA, SINGLE].includes(course.type)" class="text-weight-bold">
        <span v-for="(company, index) of companies" :key="company._id" class="text-weight-regular text-copper-500">
          <router-link class="redirection cursor-pointer" :to="goToCompany(company._id)">
            {{ company.name }}
          </router-link>
          <span v-if="index + 1 < companies.length">, </span>
        </span>
      </p>
      <div v-if="courseBills.length">
        <p v-if="[INTRA, SINGLE].includes(course.type)" class="text-weight-bold">
          Infos de facturation -
          <span class="text-weight-regular text-copper-500">
            <router-link class="redirection cursor-pointer" :to="goToCompany(companies[0]._id)">
              {{ companies[0].name }}
            </router-link>
          </span>
        </p>
        <q-card v-for="bill of courseBills" :key="bill._id" flat class="q-mb-md">
          <q-card-section class="cursor-pointer row items-center" :id="bill._id" @click="showDetails(bill._id)">
            <q-item-section>
              <div class="flex">
                <div v-if="bill.number" class="text-weight-bold clickable-name" @click.stop="downloadBill(bill)"
                  :disable="pdfLoading">
                  {{ bill.number }} - {{ formatPrice(bill.netInclTaxes) }}
                </div>
                <div v-else class="row text-weight-bold">
                  <div class="q-pt-xs"> A facturer - {{ formatPrice(bill.netInclTaxes) }}</div>
                  <ni-button icon="delete" @click.stop="openBillDeletionModal(bill._id)" size="12px" />
                </div>
                <div class="q-ml-lg bill-cancel" v-if="bill.courseCreditNote">
                  <q-icon size="12px" name="fas fa-times-circle" color="orange-500 attendance" />
                  <div class="q-ml-xs text-orange-500">
                    Annulée par avoir -
                    <span class="clickable-name text-orange-500" :disable="pdfLoading"
                      @click.stop="downloadCreditNote(bill.courseCreditNote)">
                      {{ bill.courseCreditNote.number }}
                    </span>
                  </div>
                </div>
              </div>
              <div v-if="isPayerAndDateVisible(bill)">
                <div @click.stop="openCourseBillEditionModal(bill)" class="payer">
                  Payeur : {{ get(bill, 'payer.name') }}
                  <q-icon v-if="!isBilled(bill)" size="16px" name="edit" color="copper-grey-500" />
                </div>
                <span v-if="bill.billedAt">
                  {{ `Date de facture: ${CompaniDate(bill.billedAt).format(DD_MM_YYYY)}` }}
                </span>
                <span v-else>
                  Date d'échéance : {{ bill.maturityDate ? CompaniDate(bill.maturityDate).format(DD_MM_YYYY) : '' }}
                </span>
              </div>
            </q-item-section>
            <q-icon size="24px" :name="areDetailsVisible[bill._id] ? 'expand_less' : 'expand_more'" />
          </q-card-section>
          <div class="bg-peach-200 q-pt-sm" v-if="areDetailsVisible[bill._id]">
            <q-card flat class="q-mx-lg q-mb-sm">
              <q-card-section class="fee">
                <div class="fee-info">
                  <div class="text-copper-500">{{ get(course, 'subProgram.program.name') }}</div>
                  <div>Prix unitaire : {{ formatPrice(get(bill, 'mainFee.price')) }}</div>
                  <div>
                    Quantité ({{ COUNT_UNIT[get(bill, 'mainFee.countUnit')] }}) : {{ get(bill, 'mainFee.count') }}
                  </div>
                  <div v-if="get(bill, 'mainFee.percentage')">
                    Pourcentage du montant total : {{ bill.mainFee.percentage }} %
                  </div>
                  <div v-if="get(bill, 'mainFee.description')" class="ellipsis">
                    Description : {{ bill.mainFee.description }}
                  </div>
                </div>
                <ni-button icon="edit" @click="openMainFeeEditionModal(bill)" />
              </q-card-section>
            </q-card>
            <div v-for="billingPurchase of bill.billingPurchaseList" :key="billingPurchase._id">
              <q-card flat class="q-mx-lg q-mb-sm">
                <q-card-section class="fee">
                  <div class="fee-info">
                    <div class="text-copper-500">
                      {{ getBillingItemName(billingPurchase.billingItem) }}
                    </div>
                    <div>Prix unitaire : {{ formatPrice(billingPurchase.price) }}</div>
                    <div>Quantité : {{ billingPurchase.count }}</div>
                    <div v-if="billingPurchase.percentage">
                      Pourcentage du montant total : {{ billingPurchase.percentage }} %
                    </div>
                    <div v-if="billingPurchase.description" class="ellipsis">
                      Description : {{ billingPurchase.description }}
                    </div>
                  </div>
                  <div>
                    <ni-button icon="edit" @click="openBillingPurchaseEditionModal(bill, billingPurchase)" />
                    <ni-button v-if="!isBilled(bill)" :disable="isTrainerFeesWithPercentage(billingPurchase)"
                      @click="validatePurchaseDeletion(bill._id, billingPurchase._id)" icon="delete" />
                  </div>
                </q-card-section>
              </q-card>
            </div>
            <div class="row justify-end q-pa-sm">
              <ni-button v-if="!isBilled(bill)" color="primary" icon="add" label="Ajouter un article"
                :disable="billingPurchaseCreationLoading" @click="openBillingPurchaseAdditionModal(bill._id)" />
              <ni-button v-else-if="!bill.courseCreditNote" color="primary" :disable="creditNoteCreationLoading"
                @click="openCreditNoteCreationModal(bill)" label="Faire un avoir" icon="mdi-credit-card-refund" />
            </div>
            <div v-if="!isBilled(bill)" class="row justify-end q-px-lg q-py-sm">
              <ni-button label="Facturer" color="white" class="bg-primary" icon="payment"
                @click="openCourseBillValidationModal(bill._id)" :disable="billValidationLoading" />
            </div>
          </div>
        </q-card>
      </div>
    </div>

    <ni-course-bill-edition-modal v-model="courseBillEditionModal" v-model:edited-bill="editedBill" @submit="editBill"
      @hide="resetEditedBill" :loading="billEditionLoading" :payer-options="payerList" :course-name="courseName"
      :companies-name="companiesName" :validations="validations.editedBill" />

    <!-- main fee edition modal -->
    <ni-course-fee-edition-modal v-model="mainFeeEditionModal" v-model:course-fee="editedBill.mainFee"
      @submit="editBill" :validations="validations.editedBill.mainFee" @hide="resetMainFeeEditionModal"
      :loading="billEditionLoading" :error-messages="mainFeeErrorMessages" :course-name="courseName"
      :title="courseFeeEditionModalMetaInfo.title" :is-billed="courseFeeEditionModalMetaInfo.isBilled"
      :companies-name="companiesName" :show-count-unit="![INTRA, SINGLE].includes(course.type)"
      :trainees-quantity="traineesQuantity" :is-single-course="course.type === SINGLE"
      :total-price-to-bill="totalPriceToBill" />

    <ni-billing-purchase-addition-modal v-model="billingPurchaseAdditionModal" :course-name="courseName"
      v-model:new-billing-purchase="newBillingPurchase" @submit="addBillingPurchase"
      :validations="validations.newBillingPurchase" @hide="resetBillingPurchaseAdditionModal"
      :loading="billingPurchaseCreationLoading" :billing-item-options="billingItemList"
      :error-messages="newBillingPurchaseErrorMessages" :companies-name="companiesName" />

    <!-- billing purchase edition modal -->
    <ni-course-fee-edition-modal v-model="billingPurchaseEditionModal" :validations="validations.editedBillingPurchase"
      v-model:course-fee="editedBillingPurchase" :title="courseFeeEditionModalMetaInfo.title"
      @submit="editBillingPurchase" :loading="billingPurchaseEditionLoading" @hide="resetBillingPurchaseEditionModal"
      :error-messages="editedBillingPurchaseErrorMessages" :is-billed="courseFeeEditionModalMetaInfo.isBilled"
      :course-name="courseName" :companies-name="companiesName" />

    <ni-course-bill-validation-modal v-model="courseBillValidationModal" v-model:bill-to-validate="billToValidate"
      @submit="validateBill" @hide="resetCourseBillValidationModal" :loading="billValidationLoading"
      :validations="validations.billToValidate" @cancel="cancelBillValidation" :trainees-quantity="traineesQuantity"
      :course-name="courseName" :course-type="course.type" :companies-name="companiesName" />

    <ni-course-credit-note-creation-modal v-model="creditNoteCreationModal" v-model:new-credit-note="newCreditNote"
      @submit="addCreditNote" @hide="resetCreditNoteCreationModal" :loading="creditNoteCreationLoading"
      :validations="validations.newCreditNote" :min-date="minCourseCreditNoteDate"
      :credit-note-meta-info="creditNoteMetaInfo" :validated-course-bills-count="validatedCourseBillsCount"
      :display-validated-course-bills-count="displayValidatedCourseBillsCount" />
  </div>
</template>

<script>
import { useMeta, useQuasar } from 'quasar';
import { computed, ref, toRefs } from 'vue';
import useVuelidate from '@vuelidate/core';
import { required, maxValue } from '@vuelidate/validators';
import get from 'lodash/get';
import has from 'lodash/has';
import omit from 'lodash/omit';
import pickBy from 'lodash/pickBy';
import CourseBills from '@api/CourseBills';
import CourseCreditNotes from '@api/CourseCreditNotes';
import { NotifyNegative, NotifyPositive, NotifyWarning } from '@components/popup/notify';
import Button from '@components/Button';
import { useCourseBilling } from '@composables/courseBills';
import { COMPANY, INTRA, SINGLE, DD_MM_YYYY, GROUP, COUNT_UNIT } from '@data/constants';
import { strictPositiveNumber, integerNumber, minDate } from '@helpers/vuelidateCustomVal';
import { add } from '@helpers/numbers';
import { formatPrice, formatName } from '@helpers/utils';
import { composeCourseName } from '@helpers/courses';
import CompaniDate from '@helpers/dates/companiDates';
import CourseBillEditionModal from 'src/modules/vendor/components/billing/CourseBillEditionModal';
import CourseFeeEditionModal from 'src/modules/vendor/components/billing/CourseFeeEditionModal';
import BillingPurchaseAdditionModal from 'src/modules/vendor/components/billing/BillingPurchaseAdditionModal';
import CourseBillValidationModal from 'src/modules/vendor/components/billing/CourseBillValidationModal';
import CourseCreditNoteCreationModal from 'src/modules/vendor/components/billing/CourseCreditNoteCreationModal';

export default {
  name: 'CourseBillingCard',
  props: {
    course: { type: Object, default: () => ({}) },
    payerList: { type: Array, default: () => ([]) },
    billingItemList: { type: Array, default: () => ([]) },
    courseBills: { type: Array, default: () => ([]) },
    loading: { type: Boolean, default: false },
    expectedBillsCountInvalid: { type: Boolean, default: false },
    areDetailsVisible: { type: Object, default: () => ({}) },
  },
  emits: ['refresh-course-bills', 'unroll'],
  components: {
    'ni-course-bill-edition-modal': CourseBillEditionModal,
    'ni-course-fee-edition-modal': CourseFeeEditionModal,
    'ni-billing-purchase-addition-modal': BillingPurchaseAdditionModal,
    'ni-course-bill-validation-modal': CourseBillValidationModal,
    'ni-course-credit-note-creation-modal': CourseCreditNoteCreationModal,
    'ni-button': Button,
  },
  setup (props, { emit }) {
    const metaInfo = { title: 'Configuration facturation' };
    useMeta(metaInfo);
    const $q = useQuasar();

    const totalPriceToBill = ref({ global: 0, trainerFees: 0 });

    const {
      course,
      payerList,
      billingItemList,
      courseBills,
      expectedBillsCountInvalid,
      areDetailsVisible,
    } = toRefs(props);
    const billEditionLoading = ref(false);
    const billingPurchaseCreationLoading = ref(false);
    const billingPurchaseEditionLoading = ref(false);
    const billValidationLoading = ref(false);
    const creditNoteCreationLoading = ref(false);
    const courseBillEditionModal = ref(false);
    const mainFeeEditionModal = ref(false);
    const billingPurchaseAdditionModal = ref(false);
    const billingPurchaseEditionModal = ref(false);
    const courseBillValidationModal = ref(false);
    const creditNoteCreationModal = ref(false);
    const editedBill = ref({
      _id: '',
      payer: '',
      mainFee: { price: '', description: '', count: '', countUnit: GROUP },
    });
    const newBillingPurchase = ref({ billId: '', billingItem: '', price: 0, count: 1, description: '' });
    const editedBillingPurchase = ref({ _id: '', billId: '', price: 0, count: 1, description: '' });
    const newCreditNote = ref({ courseBill: '', misc: '', date: '' });
    const creditNoteMetaInfo = ref({ number: '', netInclTaxes: '', courseName: '', companiesName: '' });
    const billToValidate = ref({ _id: '', billedAt: '' });
    const courseFeeEditionModalMetaInfo = ref({ title: '', isBilled: false });
    const minCourseCreditNoteDate = ref('');

    const rules = computed(() => ({
      editedBill: {
        mainFee: {
          price: { required, strictPositiveNumber },
          count: { required, strictPositiveNumber, integerNumber },
          countUnit: { required },
          percentage: has(editedBill.value, 'mainFee.percentage')
            ? {
              required,
              strictPositiveNumber,
              integerNumber,
              maxValue: maxValue(100),
            }
            : {},
        },
        maturityDate: has(editedBill.value, 'maturityDate') ? { required } : {},
        payer: { required },
      },
      newBillingPurchase: {
        billingItem: { required },
        price: { required, strictPositiveNumber },
        count: { required, strictPositiveNumber, integerNumber },
      },
      editedBillingPurchase: {
        price: { required, strictPositiveNumber },
        count: { required, strictPositiveNumber, integerNumber },
      },
      billToValidate: {
        billedAt: { required },
      },
      newCreditNote: {
        courseBill: { required },
        date: { required, minDate: minDate(minCourseCreditNoteDate.value) },
      },
    }));
    const validations = useVuelidate(rules, {
      editedBill,
      newBillingPurchase,
      editedBillingPurchase,
      billToValidate,
      newCreditNote,
    });

    const {
      pdfLoading,
      downloadBill,
      downloadCreditNote,
      getBillErrorMessages,
    } = useCourseBilling(courseBills, validations);

    const companies = computed(() => courseBills.value[0].companies);

    const mainFeeErrorMessages = computed(() => getBillErrorMessages('editedBill.mainFee'));

    const newBillingPurchaseErrorMessages = computed(() => getBillErrorMessages('newBillingPurchase'));

    const editedBillingPurchaseErrorMessages = computed(() => getBillErrorMessages('editedBillingPurchase'));

    const validatedCourseBillsCount = computed(() => courseBills.value
      .filter(cb => cb.billedAt && !cb.courseCreditNote)
      .length);

    const traineesQuantity = computed(() => course.value.trainees
      .filter(trainee => companies.value.map(c => c._id).includes(trainee.registrationCompany))
      .length);

    const courseName = computed(() => composeCourseName(course.value));

    const companiesName = computed(() => formatName(companies.value));

    const displayValidatedCourseBillsCount = computed(() => [INTRA, SINGLE].includes(course.value.type) &&
      course.value.expectedBillsCount > 1);

    const setEditedBill = (bill, addMaturityDate = false) => {
      const payer = get(bill, 'payer._id');
      const maturityDate = get(bill, 'maturityDate');
      editedBill.value = {
        _id: bill._id,
        payer,
        mainFee: {
          price: bill.mainFee.price,
          count: bill.mainFee.count,
          countUnit: bill.mainFee.countUnit,
          description: bill.mainFee.description,
          ...(bill.mainFee.percentage && { percentage: bill.mainFee.percentage }),
        },
        ...(addMaturityDate && { maturityDate }),
      };
    };

    const openCourseBillEditionModal = (bill) => {
      if (isBilled(bill)) return null;

      setEditedBill(bill, true);
      courseBillEditionModal.value = true;
    };

    const openMainFeeEditionModal = (bill) => {
      setEditedBill(bill);
      courseFeeEditionModalMetaInfo.value = {
        title: get(course, 'value.subProgram.program.name'),
        isBilled: isBilled(bill),
      };
      totalPriceToBill.value = course.value.prices.reduce((acc, price) => {
        if (bill.companies.map(c => c._id).includes(price.company)) {
          return {
            global: Number(add(acc.global, (price.global || 0))),
            trainerFees: Number(add(acc.trainerFees, (price.trainerFees || 0))),
          };
        }
        return acc;
      }, { global: 0, trainerFees: 0 });
      mainFeeEditionModal.value = true;
    };

    const openBillingPurchaseAdditionModal = (billId) => {
      newBillingPurchase.value.billId = billId;
      billingPurchaseAdditionModal.value = true;
    };

    const openBillingPurchaseEditionModal = (bill, billingPurchase) => {
      editedBillingPurchase.value = {
        _id: billingPurchase._id,
        billId: bill._id,
        price: billingPurchase.price,
        count: billingPurchase.count,
        ...(billingPurchase.percentage) && {
          percentage: billingPurchase.percentage,
          billingItem: billingPurchase.billingItem,
        },
        description: billingPurchase.description,
      };
      courseFeeEditionModalMetaInfo.value = {
        title: getBillingItemName(billingPurchase.billingItem),
        isBilled: isBilled(bill),
      };
      billingPurchaseEditionModal.value = true;
    };

    const openCourseBillValidationModal = (billId) => {
      billToValidate.value._id = billId;
      courseBillValidationModal.value = true;
    };

    const resetEditedBill = () => {
      editedBill.value = {
        _id: '',
        payer: '',
        mainFee: { price: '', description: '', count: '', countUnit: GROUP },
      };
      totalPriceToBill.value = { global: 0, trainerFees: 0 };
      validations.value.editedBill.$reset();
    };

    const resetMainFeeEditionModal = () => {
      resetEditedBill();
      courseFeeEditionModalMetaInfo.value = { title: '', isBilled: false };
    };

    const resetBillingPurchaseAdditionModal = () => {
      newBillingPurchase.value = { billId: '', billingItem: '', price: 0, count: 1, description: '' };
      validations.value.newBillingPurchase.$reset();
    };

    const resetBillingPurchaseEditionModal = () => {
      editedBillingPurchase.value = { billId: '', price: 0, count: 1, description: '' };
      validations.value.editedBillingPurchase.$reset();
      courseFeeEditionModalMetaInfo.value = { title: '', isBilled: false };
    };

    const resetCourseBillValidationModal = () => {
      billToValidate.value = { _id: '', billedAt: '' };
      validations.value.billToValidate.$reset();
    };

    const formatPayerForPayload = (payloadPayer) => {
      const payerType = payerList.value.find(payer => payer.value === payloadPayer).type;

      return payerType === COMPANY ? { company: payloadPayer } : { fundingOrganisation: payloadPayer };
    };

    const editBill = async () => {
      try {
        validations.value.editedBill.$touch();
        if (validations.value.editedBill.$error) return NotifyWarning('Champ(s) invalide(s)');

        billEditionLoading.value = true;
        await CourseBills.update(
          editedBill.value._id,
          {
            payer: formatPayerForPayload(editedBill.value.payer),
            mainFee: editedBill.value.mainFee,
            maturityDate: editedBill.value.maturityDate,
          }
        );
        NotifyPositive('Facture modifiée.');

        courseBillEditionModal.value = false;
        mainFeeEditionModal.value = false;
        await emit('refresh-course-bills');
      } catch (e) {
        console.error(e);
        if (e.status === 409) return NotifyNegative(e.data.message);
        NotifyNegative('Erreur lors de la modification de la facture.');
      } finally {
        billEditionLoading.value = false;
      }
    };

    const addBillingPurchase = async () => {
      try {
        validations.value.newBillingPurchase.$touch();
        if (validations.value.newBillingPurchase.$error) return NotifyWarning('Champ(s) invalide(s)');

        billingPurchaseCreationLoading.value = true;

        await CourseBills
          .addBillingPurchase(newBillingPurchase.value.billId, pickBy(omit(newBillingPurchase.value, 'billId')));
        NotifyPositive('Article ajouté.');

        billingPurchaseAdditionModal.value = false;
        await emit('refresh-course-bills');
      } catch (e) {
        console.error(e);
        if (e.status === 409) return NotifyNegative(e.data.message);
        NotifyNegative('Erreur lors de l\'ajout de l\'article.');
      } finally {
        billingPurchaseCreationLoading.value = false;
      }
    };

    const editBillingPurchase = async () => {
      try {
        validations.value.editedBillingPurchase.$touch();
        if (validations.value.editedBillingPurchase.$error) return NotifyWarning('Champ(s) invalide(s)');

        billingPurchaseEditionLoading.value = true;

        const { _id: purchaseId, billId, price, count, description } = editedBillingPurchase.value;
        await CourseBills.updateBillingPurchase(billId, purchaseId, { price, count, description });
        NotifyPositive('Article modifié.');

        billingPurchaseEditionModal.value = false;
        await emit('refresh-course-bills');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la modification de l\'article.');
      } finally {
        billingPurchaseEditionLoading.value = false;
      }
    };

    const deleteBillingPurchase = async (billId, purchaseId) => {
      try {
        await CourseBills.deleteBillingPurchase(billId, purchaseId);

        NotifyPositive('Article supprimé.');
        await emit('refresh-course-bills');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la suppression de l\'article.');
      }
    };

    const validatePurchaseDeletion = (billId, purchaseId) => {
      $q.dialog({
        title: 'Confirmation',
        message: 'Êtes-vous sûr(e) de vouloir supprimer cet article&nbsp;?',
        html: true,
        ok: 'OK',
        cancel: 'Annuler',
      }).onOk(() => deleteBillingPurchase(billId, purchaseId))
        .onCancel(() => NotifyPositive('Suppression annulée.'));
    };

    const openCreditNoteCreationModal = (bill) => {
      if (expectedBillsCountInvalid.value) return NotifyWarning('Champ(s) invalide(s).');
      const { _id: billId, number, netInclTaxes } = bill;
      newCreditNote.value = { courseBill: billId, date: '', misc: '' };
      creditNoteCreationModal.value = true;
      minCourseCreditNoteDate.value = bill.billedAt;
      creditNoteMetaInfo.value = { number, netInclTaxes, courseName: composeCourseName(course.value), companiesName };
    };

    const addCreditNote = async () => {
      try {
        validations.value.newCreditNote.$touch();
        if (validations.value.newCreditNote.$error) return NotifyWarning('Champ(s) invalide(s)');

        creditNoteCreationLoading.value = true;

        await CourseCreditNotes.create(newCreditNote.value);
        NotifyPositive('Avoir créé.');

        creditNoteCreationModal.value = false;
        await emit('refresh-course-bills');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la création de l\'avoir.');
      } finally {
        creditNoteCreationLoading.value = false;
      }
    };

    const resetCreditNoteCreationModal = () => {
      newCreditNote.value = { courseBill: '', date: '', misc: '' };
      minCourseCreditNoteDate.value = '';
      creditNoteMetaInfo.value = { number: '', netInclTaxes: '', courseName: '', companiesName: '' };
      validations.value.newCreditNote.$reset();
    };

    const validateBill = async () => {
      try {
        validations.value.billToValidate.$touch();
        if (validations.value.billToValidate.$error) return NotifyWarning('Champ(s) invalide(s)');

        billValidationLoading.value = true;

        await CourseBills.update(billToValidate.value._id, { billedAt: billToValidate.value.billedAt });
        NotifyPositive('Facture validée.');

        courseBillValidationModal.value = false;
        await emit('refresh-course-bills');
      } catch (e) {
        console.error(e);
        if (e.status === 403) return NotifyNegative(e.data.message);
        NotifyNegative('Erreur lors de la validation de la facture.');
      } finally {
        billValidationLoading.value = false;
      }
    };

    const cancelBillValidation = () => {
      resetCourseBillValidationModal();
      courseBillValidationModal.value = false;
      NotifyPositive('Validation de la facture annulée.');
    };

    const deleteBill = async (billId) => {
      try {
        await CourseBills.deleteBill(billId);

        NotifyPositive('Facture supprimée');
        emit('refresh-course-bills');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la suppression de la facture brouillon.');
      }
    };

    const openBillDeletionModal = (billId) => {
      $q.dialog({
        title: 'Confirmation',
        message: 'Êtes-vous sûr(e) de vouloir supprimer cette facture brouillon ?',
        html: true,
        ok: 'OK',
        cancel: 'Annuler',
      }).onOk(() => deleteBill(billId))
        .onCancel(() => NotifyPositive('Suppression annulée.'));
    };

    const isBilled = bill => !!bill.billedAt;

    const showDetails = (billId) => { emit('unroll', billId); };

    const isPayerAndDateVisible = bill => !bill.courseCreditNote || areDetailsVisible.value[bill._id];

    const getBillingItemName = billingItem => billingItemList.value.find(item => item.value === billingItem).label;

    const goToCompany = companyId => ({
      name: 'ni users companies info',
      params: { companyId },
      query: { defaultTab: 'bills' },
    });

    const isTrainerFeesWithPercentage = billingPurchase => billingPurchase.percentage &&
      billingPurchase.billingItem === process.env.TRAINER_FEES_BILLING_ITEM;

    return {
      // Data
      billEditionLoading,
      pdfLoading,
      billingPurchaseCreationLoading,
      billingPurchaseEditionLoading,
      creditNoteCreationLoading,
      billValidationLoading,
      courseBillEditionModal,
      mainFeeEditionModal,
      billingPurchaseAdditionModal,
      billingPurchaseEditionModal,
      creditNoteCreationModal,
      courseBillValidationModal,
      newBillingPurchase,
      editedBillingPurchase,
      editedBill,
      newCreditNote,
      billToValidate,
      courseFeeEditionModalMetaInfo,
      minCourseCreditNoteDate,
      creditNoteMetaInfo,
      totalPriceToBill,
      INTRA,
      SINGLE,
      DD_MM_YYYY,
      COUNT_UNIT,
      // Computed
      validations,
      companies,
      mainFeeErrorMessages,
      newBillingPurchaseErrorMessages,
      editedBillingPurchaseErrorMessages,
      traineesQuantity,
      courseName,
      companiesName,
      validatedCourseBillsCount,
      displayValidatedCourseBillsCount,
      // Methods
      resetEditedBill,
      resetMainFeeEditionModal,
      resetBillingPurchaseAdditionModal,
      resetBillingPurchaseEditionModal,
      resetCreditNoteCreationModal,
      resetCourseBillValidationModal,
      editBill,
      addBillingPurchase,
      editBillingPurchase,
      addCreditNote,
      validateBill,
      cancelBillValidation,
      isBilled,
      getBillErrorMessages,
      openCourseBillEditionModal,
      openMainFeeEditionModal,
      openBillingPurchaseAdditionModal,
      openBillingPurchaseEditionModal,
      openCreditNoteCreationModal,
      openCourseBillValidationModal,
      validatePurchaseDeletion,
      isPayerAndDateVisible,
      showDetails,
      getBillingItemName,
      downloadBill,
      downloadCreditNote,
      goToCompany,
      get,
      omit,
      pickBy,
      formatPrice,
      CompaniDate,
      openBillDeletionModal,
      isTrainerFeesWithPercentage,
    };
  },
};
</script>

<style lang="sass" scoped>
.payer
  width: fit-content

.fee
  display: flex
  justify-content: space-between
  align-items: flex-start
  &-info
    max-width: 90%

.bill-cancel
  display: flex
  align-items: center

.redirection
  &:hover
    text-decoration: underline
    text-decoration-color: $copper-500
</style>
