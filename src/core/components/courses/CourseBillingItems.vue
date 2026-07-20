<template>
  <div class="q-mt-lg q-mb-xl">
    <q-card class="q-mb-md">
      <ni-expanding-table :data="[billingSummary]" :columns="summaryColumns" hide-bottom separator="none">
        <template #header="{ props }">
          <q-tr :props="props">
            <q-th v-for="col in props.cols" :key="col.name" :props="props" :style="col.style">{{ col.label }}</q-th>
          </q-tr>
        </template>
        <template #row="{ props }">
          <q-td v-for="col in props.cols" :key="col.name" :data-label="col.label" :props="props"
            class="text-weight-bold" :style="col.style">
            {{ col.value }}
          </q-td>
        </template>
      </ni-expanding-table>
    </q-card>

    <p class="q-pt-md q-px-md text-weight-bold">Détail des coûts de formation</p>
    <q-card>
      <ni-expanding-table v-if="course.billingPurchaseList?.length" :data="course.billingPurchaseList"
        :columns="columns" v-model:pagination="pagination" class="q-mb-md" :loading="loading" hide-bottom
        table-class="table-responsive q-pa-sm">
        <template #header="{ props }">
          <q-tr :props="props">
            <q-th v-for="col in props.cols" :key="col.name" :props="props" :style="col.style">{{ col.label }}</q-th>
          </q-tr>
        </template>
        <template #row="{ props }">
          <q-td v-for="col in props.cols" :key="col.name" :data-label="col.label" :props="props" :class="col.name"
            :style="col.style">
            <template v-if="col.name === 'actions'">
              <div class="row no-wrap table-actions">
                <ni-button icon="edit" @click="openEditionModal(props.row)"
                  :disable="creationLoading || editionLoading" />
                <ni-button icon="delete" @click="validateBillingPurchaseDeletion(props.row._id)"
                  :disable="props.row.billingItem.type !== COURSE || creationLoading || editionLoading" />
              </div>
            </template>
            <template v-else-if="['billingItem', 'description'].includes(col.name)">
              <div class="ellipsis">{{ col.value }}</div>
            </template>
            <template v-else>{{ col.value }}</template>
          </q-td>
        </template>
        <template #bottom-row="{ props }">
          <q-tr class="text-weight-bold" :props="props">
            <q-td />
            <q-td />
            <q-td><div class="flex justify-end items-center">Total</div></q-td>
            <q-td><div class="flex justify-end items-center">{{ formatPrice(totalPrice) }}</div></q-td>
            <q-td />
            <q-td />
          </q-tr>
        </template>
      </ni-expanding-table>
      <div v-else class="text-italic text-center text-14 q-pt-md">Aucun coût ajouté à la formation</div>
      <q-card-actions align="right">
        <ni-button color="primary" icon="add" label="Ajouter un coût de formation" :disable="loading"
          @click="openCreationModal" />
      </q-card-actions>
    </q-card>

    <ni-billing-purchase-addition-modal v-model="creationModal" v-model:new-billing-purchase="newBillingPurchase"
      @submit="addBillingPurchase" :validations="v$.newBillingPurchase" @hide="resetCreationModal"
      :loading="creationLoading" :billing-item-options="billingItemOptions" is-course-fee
      :error-messages="newBillingPurchaseErrorMessages" :course-name="courseName" :companies-name="companiesName" />

    <ni-course-fee-edition-modal v-model="editionModal" v-model:course-fee="editedBillingPurchase" is-course-fee
      @submit="editBillingPurchase" :validations="v$.editedBillingPurchase" @hide="resetEditionModal"
      :loading="editionLoading" :error-messages="editedBillingPurchaseErrorMessages" :title="editedBillingPurchaseTitle"
      :course-name="courseName" :companies-name="companiesName"
      :disable-edition="disablePriceAndCount" />
  </div>
</template>

<script>
import { useStore } from 'vuex';
import { useQuasar } from 'quasar';
import { computed, ref } from 'vue';
import get from 'lodash/get';
import pickBy from 'lodash/pickBy';
import useVuelidate from '@vuelidate/core';
import { required } from '@vuelidate/validators';
import { strictPositiveNumber, integerNumber } from '@helpers/vuelidateCustomVal';
import { formatPrice, formatName, formatPercentage } from '@helpers/utils';
import { add, subtract, divide, multiply, toNumber } from '@helpers/numbers';
import { composeCourseName } from '@helpers/courses';
import Courses from '@api/Courses';
import CourseBillingItemsApi from '@api/CourseBillingItems';
import { NotifyNegative, NotifyPositive, NotifyWarning } from '@components/popup/notify';
import ExpandingTable from '@components/table/ExpandingTable';
import Button from '@components/Button';
import { COURSE, REQUIRED_LABEL } from '@data/constants';
import BillingPurchaseAdditionModal from 'src/modules/vendor/components/billing/BillingPurchaseAdditionModal';
import CourseFeeEditionModal from 'src/modules/vendor/components/billing/CourseFeeEditionModal';

export default {
  name: 'CourseBillingItems',
  components: {
    'ni-expanding-table': ExpandingTable,
    'ni-button': Button,
    'ni-billing-purchase-addition-modal': BillingPurchaseAdditionModal,
    'ni-course-fee-edition-modal': CourseFeeEditionModal,
  },
  setup () {
    const $store = useStore();
    const $q = useQuasar();

    const course = computed(() => $store.state.course.course);

    const loading = ref(false);
    const creationLoading = ref(false);
    const editionLoading = ref(false);
    const creationModal = ref(false);
    const editionModal = ref(false);
    const billingItemOptions = ref([]);
    const newBillingPurchase = ref({ billingItem: '', price: 0, count: 1, description: '' });
    const editedBillingPurchase = ref({ _id: '', price: 0, count: 1, description: '' });
    const editedBillingPurchaseTitle = ref('');
    const disablePriceAndCount = ref(false);
    const pagination = { rowsPerPage: 0 };

    const columns = [
      {
        name: 'billingItem',
        label: 'Article',
        align: 'left',
        field: row => get(row, 'billingItem.name'),
        style: 'width: 30%',
      },
      {
        name: 'price',
        label: 'Prix unitaire',
        align: 'right',
        field: row => formatPrice(row.price),
        style: 'width: 10%',
      },
      { name: 'count', label: 'Quantité', align: 'right', field: 'count', style: 'width: 10%' },
      {
        name: 'total',
        label: 'Prix total',
        align: 'right',
        field: row => formatPrice(toNumber(multiply(row.price, row.count))),
        style: 'width: 10%',
      },
      {
        name: 'description',
        label: 'Description',
        align: 'left',
        field: row => row.description || '',
        style: 'width: 30%',
      },
      { name: 'actions', label: '', align: 'right', field: '_id', style: 'width: 10%' },
    ];

    const totalPrice = computed(() => toNumber(
      (course.value.billingPurchaseList || []).reduce((acc, item) => add(acc, multiply(item.price, item.count)), 0)
    ));

    const totalCoursePrice = computed(() => toNumber(
      (course.value.prices || []).reduce((acc, price) => add(acc, price.global || 0, price.trainerFees || 0), 0)
    ));

    const grossMargin = computed(() => toNumber(subtract(totalCoursePrice.value, totalPrice.value)));

    const grossMarginRate = computed(() => (totalCoursePrice.value
      ? toNumber(divide(grossMargin.value, totalCoursePrice.value))
      : 0));

    const billingSummary = computed(() => ({
      coursePrice: totalCoursePrice.value,
      courseCost: totalPrice.value,
      grossMargin: grossMargin.value,
      grossMarginRate: grossMarginRate.value,
    }));

    const summaryColumns = [
      {
        name: 'coursePrice',
        label: 'Prix de la formation',
        align: 'center',
        field: row => formatPrice(row.coursePrice),
        style: 'width: 25%',
      },
      {
        name: 'courseCost',
        label: 'Coût de la formation',
        align: 'center',
        field: row => formatPrice(row.courseCost),
        style: 'width: 25%',
      },
      {
        name: 'grossMargin',
        label: 'Marge brute',
        align: 'center',
        field: row => formatPrice(row.grossMargin),
        style: 'width: 25%',
      },
      {
        name: 'grossMarginRate',
        label: 'Taux de marge brut',
        align: 'center',
        field: row => formatPercentage(row.grossMarginRate),
        style: 'width: 25%',
      },
    ];

    const rules = {
      newBillingPurchase: {
        billingItem: { required },
        price: { required, strictPositiveNumber },
        count: { required, strictPositiveNumber, integerNumber },
      },
      editedBillingPurchase: {
        price: { required, strictPositiveNumber },
        count: { required, strictPositiveNumber, integerNumber },
      },
    };
    const v$ = useVuelidate(rules, { newBillingPurchase, editedBillingPurchase });

    const courseName = computed(() => composeCourseName(course.value));

    const companiesName = computed(() => formatName(course.value.companies));

    const getErrorMessages = (parent) => {
      let price = '';
      let count = '';

      if (get(v$.value, `${parent}.price.strictPositiveNumber.$response`) === false) price = 'Prix non valide';
      if (get(v$.value, `${parent}.price.required.$response`) === false) price = REQUIRED_LABEL;

      if (get(v$.value, `${parent}.count.strictPositiveNumber.$response`) === false ||
        get(v$.value, `${parent}.count.integerNumber.$response`) === false) {
        count = 'Nombre non valide';
      }
      if (get(v$.value, `${parent}.count.required.$response`) === false) count = REQUIRED_LABEL;

      return { price, count };
    };

    const newBillingPurchaseErrorMessages = computed(() => getErrorMessages('newBillingPurchase'));

    const editedBillingPurchaseErrorMessages = computed(() => getErrorMessages('editedBillingPurchase'));

    const refreshBillingItems = async () => {
      try {
        const items = await CourseBillingItemsApi.list({ type: COURSE });
        billingItemOptions.value = items.map(item => ({ label: item.name, value: item._id }));
      } catch (e) {
        console.error(e);
        billingItemOptions.value = [];
        NotifyNegative('Erreur lors de la récupération des articles.');
      }
    };

    const refreshCourse = async () => {
      try {
        loading.value = true;
        await $store.dispatch('course/fetchCourse', { courseId: course.value._id });
      } catch (e) {
        console.error(e);
      } finally {
        loading.value = false;
      }
    };

    const openCreationModal = () => { creationModal.value = true; };

    const resetCreationModal = () => {
      newBillingPurchase.value = { billingItem: '', price: 0, count: 1, description: '' };
      v$.value.newBillingPurchase.$reset();
    };

    const addBillingPurchase = async () => {
      try {
        v$.value.newBillingPurchase.$touch();
        if (v$.value.newBillingPurchase.$error) return NotifyWarning('Champ(s) invalide(s)');

        creationLoading.value = true;
        await Courses.addBillingPurchase(course.value._id, pickBy(newBillingPurchase.value));
        NotifyPositive('Coût de formation ajouté.');

        creationModal.value = false;
        await refreshCourse();
      } catch (e) {
        console.error(e);
        if (e.status === 409) return NotifyNegative(e.data.message);
        NotifyNegative('Erreur lors de l\'ajout du coût de formation.');
      } finally {
        creationLoading.value = false;
      }
    };

    const openEditionModal = (billingPurchase) => {
      editedBillingPurchase.value = {
        _id: billingPurchase._id,
        price: billingPurchase.price,
        count: billingPurchase.count,
        description: billingPurchase.description || '',
      };
      editedBillingPurchaseTitle.value = get(billingPurchase, 'billingItem.name');
      disablePriceAndCount.value = get(billingPurchase, 'billingItem.type') !== COURSE;
      editionModal.value = true;
    };

    const resetEditionModal = () => {
      editedBillingPurchase.value = { _id: '', price: 0, count: 1, description: '' };
      editedBillingPurchaseTitle.value = '';
      disablePriceAndCount.value = false;
      v$.value.editedBillingPurchase.$reset();
    };

    const editBillingPurchase = async () => {
      try {
        v$.value.editedBillingPurchase.$touch();
        if (v$.value.editedBillingPurchase.$error) return NotifyWarning('Champ(s) invalide(s)');

        editionLoading.value = true;
        const { _id, price, count, description } = editedBillingPurchase.value;
        await Courses.updateBillingPurchase(course.value._id, _id, { price, count, description });
        NotifyPositive('Coût de formation modifié.');

        editionModal.value = false;
        await refreshCourse();
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la modification du coût de formation.');
      } finally {
        editionLoading.value = false;
      }
    };

    const deleteBillingPurchase = async (billingPurchaseId) => {
      try {
        await Courses.deleteBillingPurchase(course.value._id, billingPurchaseId);
        NotifyPositive('Coût de formation supprimé.');
        await refreshCourse();
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la suppression du coût de formation.');
      }
    };

    const validateBillingPurchaseDeletion = (billingPurchaseId) => {
      $q.dialog({
        title: 'Confirmation',
        message: 'Êtes-vous sûr(e) de vouloir supprimer ce coût de formation&nbsp;?',
        html: true,
        ok: 'OK',
        cancel: 'Annuler',
      }).onOk(() => deleteBillingPurchase(billingPurchaseId))
        .onCancel(() => NotifyPositive('Suppression annulée.'));
    };

    const created = async () => { await refreshBillingItems(); };
    created();

    return {
      // Data
      COURSE,
      loading,
      creationLoading,
      editionLoading,
      creationModal,
      editionModal,
      billingItemOptions,
      newBillingPurchase,
      editedBillingPurchase,
      editedBillingPurchaseTitle,
      disablePriceAndCount,
      pagination,
      columns,
      summaryColumns,
      // Computed
      course,
      v$,
      courseName,
      companiesName,
      totalPrice,
      billingSummary,
      newBillingPurchaseErrorMessages,
      editedBillingPurchaseErrorMessages,
      // Methods
      openCreationModal,
      resetCreationModal,
      addBillingPurchase,
      openEditionModal,
      resetEditionModal,
      editBillingPurchase,
      validateBillingPurchaseDeletion,
      formatPrice,
    };
  },
};
</script>
