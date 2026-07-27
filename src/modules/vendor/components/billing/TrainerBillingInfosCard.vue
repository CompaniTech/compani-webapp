<template>
  <q-card v-if="trainerInfos.courses.length || Object.keys(trainerInfos.collectiveSlots.slots).length"
    class="container clickable cursor-pointer" flat>
    <q-expansion-item class="q-my-md" v-model="displayDetails">
      <template #header>
        <div class="full-width items-center">
          <div class="trainerInfosContainer">
            <div>
              <span v-if="isDashboard" class="text-copper-500">{{ formatIdentity(trainerInfos.identity, 'FL') }}</span>
              <div class="q-ml-md q-py-sm">
                <span v-if="displayDuration(formattedTrainerDurations.notInvoiced)"
                  class="text-weight-bold text-orange-400">
                  Non facturé : {{ formattedTrainerDurations.notInvoiced }} -
                  {{ formattedTrainerDurations.notInvoicedAmount }}
                  &nbsp;(dont {{ formattedTrainerDurations.notInvoicedAbsence }} d'absence)
                </span>
                <span v-if="displayDuration(formattedTrainerDurations.invoiced)" class="text-weight-bold">
                  <span v-if="displayDuration(formattedTrainerDurations.notInvoiced)">&nbsp;/ </span>Facturé :
                  {{ formattedTrainerDurations.invoiced }} - {{ formattedTrainerDurations.invoicedAmount }} (dont
                  &nbsp;{{ formattedTrainerDurations.invoicedAbsence }} d'absence)
                </span>
                <span v-if="displayDuration(formattedTrainerDurations.paid)" class="text-copper-500">
                  <span v-if="displayDuration(formattedTrainerDurations.notInvoiced) ||
                    displayDuration(formattedTrainerDurations.invoiced)">&nbsp;/ </span>réglé :
                  {{ formattedTrainerDurations.paid }} - {{ formattedTrainerDurations.paidAmount }} (dont
                  &nbsp;{{ formattedTrainerDurations.paidAbsence }} d'absence)
                </span>
              </div>
            </div>
            <ni-primary-button v-if="isTrainer" class="q-ma-sm" label="Facturer les créneaux"
              @click.stop="openCourseSlotInvoiceModal"
              :disabled="Object.values(selectedCourseSlots).flat().length === 0" />
            <ni-primary-button v-else class="q-ma-sm" label="Régler les créneaux sélectionnés"
              @click.stop="openCourseSlotListValidationModal"
              :disabled="Object.values(selectedCourseSlots).flat().length === 0" />
          </div>
        </div>
      </template>
      <div class="q-pa-sm bg-peach-200">
        <q-expansion-item v-for="course of coursesWithFormattedData" :key="course._id" class="q-ma-sm bg-white"
          v-model="areCourseDetailsVisible[course._id]">
          <template #header>
            <div class="full-width">
              <router-link :to="goToCourse(course._id)" @click.stop>
                <span class="text-weight-bold text-copper-600 clickable-name">{{ course.name }}</span>
              </router-link>
              <span v-if="displayDuration(course.notInvoicedSingleSlotsDuration)"
                class="text-weight-bold text-orange-400">
                  <br> Non facturé : {{ course.notInvoicedSingleSlotsDuration }} -
                  {{ course.notInvoicedSingleSlotsAmount }} (dont
                  &nbsp;{{ course.notInvoicedSingleSlotsAbsenceDuration }} d'absence)
                </span>
                <span class="text-weight-bold" v-if="displayDuration(course.invoicedSingleSlotsDuration)">
                  &nbsp;/&nbsp;Facturé : {{ course.invoicedSingleSlotsDuration }} -
                  {{ course.invoicedSingleSlotsAmount }} (dont
                  &nbsp;{{ course.invoicedSingleSlotsAbsenceDuration }} d'absence)
                </span>
                <span class="text-copper-500" v-if="displayDuration(course.paidSingleSlotsDuration)">
                  &nbsp;/&nbsp;réglé : {{ course.paidSingleSlotsDuration }} - {{ course.paidSingleSlotsAmount }} (dont
                  &nbsp;{{ course.paidSingleSlotsAbsenceDuration }} d'absence)
                </span>
            </div>
          </template>
          <div class="q-pt-sm" v-if="areCourseDetailsVisible[course._id]">
            <div v-for="stepName of Object.keys(course.singleTraineeSlots)" :key="stepName" class="q-pa-sm q-pl-md">
              <span class="text-italic">{{ stepName }}</span>
              &nbsp;:&nbsp;
              <span class="text-orange-400"
                v-if="displayDuration(course.singleTraineeSlots[stepName].notInvoicedDuration)">
                {{ course.singleTraineeSlots[stepName].notInvoicedDuration }} non facturées
                &nbsp;({{ course.singleTraineeSlots[stepName].notInvoicedAmount }})
              </span>
              <span v-if="displayDuration(course.singleTraineeSlots[stepName].invoicedDuration)">
                <span v-if="displayDuration(course.singleTraineeSlots[stepName].notInvoicedDuration)"> , </span>
                {{ course.singleTraineeSlots[stepName].invoicedDuration }} facturées
                &nbsp;({{ course.singleTraineeSlots[stepName].invoicedAmount }})
              </span>
              <span v-if="displayDuration(course.singleTraineeSlots[stepName].paidDuration)">
                <span v-if="displayDuration(course.singleTraineeSlots[stepName].notInvoicedDuration) ||
                  displayDuration(course.singleTraineeSlots[stepName].invoicedDuration)"> , </span>
                {{ course.singleTraineeSlots[stepName].paidDuration }} réglées
                &nbsp;({{ course.singleTraineeSlots[stepName].paidAmount }})
              </span>
            </div>
            <ni-expanding-table :data="course.rows" :columns="singleSlotColumns" hide-bottom>
              <template #header="{ props }">
                <q-th v-for="col in props.cols" :key="col.name" :props="props" :style="col.style">
                  <template v-if="col.name === 'actions'">
                    <q-checkbox :model-value="multipleSlotSelection[course._id]" class="q-mr-sm" size="sm"
                      @update:model-value="selectSlotList($event, { courseId: course._id, slots: course.rows })"
                      :disable="course.rows.every(s => !isSlotSelectable(s))" />
                  </template>
                  <template v-else>{{ col.label }}</template>
                </q-th>
              </template>
              <template #row="{ props }">
                <q-td v-for="col in props.cols" :key="col.name" :props="props">
                  <template v-if="col.name === 'actions'">
                    <q-checkbox class="q-mr-md" v-model="selectedCourseSlots[course._id]" :val="props.row._id" dense
                      :disable="!isSlotSelectable(props.row)" />
                  </template>
                  <template v-else>{{ col.value }}</template>
                  </q-td>
              </template>
            </ni-expanding-table>
          </div>
        </q-expansion-item>
        <q-expansion-item class="q-ma-sm bg-white" v-if="Object.keys(trainerInfos.collectiveSlots.slots).length">
          <template #header>
            <div class="full-width align-center">
              <span class="text-weight-bold text-copper-600"> Sessions collectives</span>
              <span v-if="displayDuration(formattedCollectiveSlots.notInvoiced)"
                class="text-weight-bold text-orange-400 q-ma-md">
                <br> Non facturé : {{ formattedCollectiveSlots.notInvoiced }} -
                &nbsp;{{ formattedCollectiveSlots.notInvoicedCollectiveSlotsAmount }} (dont
                &nbsp;{{ formattedCollectiveSlots.notInvoicedAbsence }} d'absence)
              </span>
              <span class="text-weight-bold q-ma-md" v-if="displayDuration(formattedCollectiveSlots.invoiced)">
                &nbsp;/ Facturé : {{ formattedCollectiveSlots.invoiced }} -
                &nbsp;{{ formattedCollectiveSlots.invoicedCollectiveSlotsAmount }} (dont
                &nbsp;{{ formattedCollectiveSlots.invoicedAbsence }} d'absence)
              </span>
              <span class="text-copper-500" v-if="displayDuration(formattedCollectiveSlots.paid)">
                &nbsp;/ réglé : {{ formattedCollectiveSlots.paid }} -
                &nbsp;{{ formattedCollectiveSlots.paidCollectiveSlotsAmount }} (dont
                &nbsp;{{ formattedCollectiveSlots.paidAbsence }} d'absence)
              </span>
            </div>
          </template>
          <ni-banner class="bg-copper-grey-100 q-pa-lg" icon="info_outline">
              <template #message>
                <span>
                  Attention, les créneaux qui n'ont pas les mêmes horaires de début et de fin sont comptés séparément.
                  <br> Un créneau est comptabilisé dans les heures d'absence si tous les apprenants sont absents.
                  </span>
              </template>
            </ni-banner>
          <div v-for="day of Object.keys(formattedCollectiveSlots.slots)" :key="day">
            <q-item-label class="q-pl-lg text-weight-bold q-pt-lg">
              Session du {{ day }}
              <span v-if="displayDuration(formattedCollectiveSlots.slots[day].notInvoicedDuration)"
                class="text-weight-bold text-orange-400 q-ma-md">
                &nbsp;Non facturé : {{ formattedCollectiveSlots.slots[day].notInvoicedDuration }}
                ({{ formattedCollectiveSlots.slots[day].notInvoicedAmount }})
              </span>
              <span class="text-weight-bold q-ma-md"
                v-if="displayDuration(formattedCollectiveSlots.slots[day].invoicedDuration)">
                &nbsp;/ Facturé : {{ formattedCollectiveSlots.slots[day].invoicedDuration }}
                ({{ formattedCollectiveSlots.slots[day].invoicedAmount }})
              </span>
              <span class="text-copper-500"
                v-if="displayDuration(formattedCollectiveSlots.slots[day].paidDuration)">
                &nbsp;/ réglé : {{ formattedCollectiveSlots.slots[day].paidDuration }}
                &nbsp;({{ formattedCollectiveSlots.slots[day].paidAmount }})
              </span>
            </q-item-label>
            <ni-expanding-table :data="trainerInfos.collectiveSlots.slots[day].slots" :columns="collectiveSlotsColumns"
              hide-bottom>
              <template #header="{ props }">
                <q-th v-for="col in props.cols" :key="col.name" :props="props" :style="col.style">
                  <template v-if="col.name === 'actions'">
                    <q-checkbox :model-value="multipleSlotSelection[day]" class="q-mr-sm" size="sm"
                      @update:model-value="
                        selectSlotList($event, { day, slots: trainerInfos.collectiveSlots.slots[day].slots })"
                      :disable="trainerInfos.collectiveSlots.slots[day].slots.every(s => !isSlotSelectable(s))" />
                  </template>
                  <template v-else>{{ col.label }}</template>
                </q-th>
              </template>
              <template #row="{ props }">
                <q-td v-for="col in props.cols" :key="col.name" :props="props">
                  <template v-if="col.name === 'traineeName'">
                    <router-link :to="goToCourse(props.row.courseId)" @click.stop>
                      <span class="text-weight-bold text-copper-600 clickable-name">{{ col.value }}</span>
                    </router-link>
                  </template>
                  <template v-else-if="col.name === 'actions'">
                    <q-checkbox class="q-mr-md"
                      :model-value="selectedCourseSlots[day]?.includes(props.row._id)" dense
                      @update:model-value="val =>
                        selectSlotGroupByDate(val, props.row, day, trainerInfos.collectiveSlots.slots[day].slots)"
                      :disable="!isSlotSelectable(props.row)" />
                  </template>
                  <template v-else>{{ col.value }}</template>
                </q-td>
              </template>
            </ni-expanding-table>
          </div>
        </q-expansion-item>
      </div>
    </q-expansion-item>
  </q-card>

  <course-slot-list-validation-modal v-model="courseSlotListValidationModal" :course-slots-to-pay="courseSlotsToPay"
    :validations="v$.courseSlotsToPay" @hide="resetSlotListValidationInfos" @submit="updateSlotList"
    @cancel="resetSlotListValidationInfos(true)" />

  <course-slot-invoice-modal v-model="courseSlotInvoiceModal" :course-slots="selectedSlotsForInvoice"
    :loading="courseSlotInvoiceLoading" :invoice="invoice" :validations="v$.invoice" @hide="resetCourseSlotInvoiceModal"
    @submit="submitCourseSlotInvoice" />
</template>

<script>

import { ref, toRefs, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import get from 'lodash/get';
import { required } from '@vuelidate/validators';
import useVuelidate from '@vuelidate/core';
import { LONG_DURATION_H_MM, DD_MM_YYYY, HHhMM, SLOT_STATUS, NOT_INVOICED, PAID } from '@data/constants';
import { formatIdentity, formatStringToPrice } from '@helpers/utils';
import CompaniDuration from '@helpers/dates/companiDurations';
import CompaniDate from '@helpers/dates/companiDates';
import ExpandingTable from '@components/table/ExpandingTable';
import Banner from '@components/Banner';
import Button from '@components/PrimaryButton';
import { NotifyNegative, NotifyWarning, NotifyPositive } from '@components/popup/notify';
import CourseSlotListValidationModal from 'src/modules/vendor/components/billing/CourseSlotListValidationModal';
import CourseSlotInvoiceModal from 'src/modules/vendor/components/billing/CourseSlotInvoiceModal';
import CourseSlots from '@api/CourseSlots';
import TrainerInvoices from '@api/TrainerInvoices';

export default {
  name: 'TrainerBillingInfosCard',
  props: {
    trainerInfos: { type: Object, default: () => ({}) },
    trainerId: { type: String, required: true },
    isTrainer: { type: Boolean, default: false },
  },
  components: {
    'ni-expanding-table': ExpandingTable,
    'ni-banner': Banner,
    'ni-primary-button': Button,
    'course-slot-list-validation-modal': CourseSlotListValidationModal,
    'course-slot-invoice-modal': CourseSlotInvoiceModal,
  },
  emits: ['refresh'],
  setup (props, { emit }) {
    const { trainerInfos, trainerId, isTrainer } = toRefs(props);
    const $route = useRoute();
    const isDashboard = /\/trainers-follow-up/.test($route.path);
    const isTrainerSection = /^\/ad\/trainers\//.test($route.path);
    const displayDetails = ref(!isDashboard);

    const areCourseDetailsVisible = ref({});
    const selectedCourseSlots = ref({});
    const courseSlotsToPay = ref({ _ids: [], billNumber: '' });
    const invoice = ref({ number: '', file: '' });
    const courseSlotListValidationModal = ref(false);
    const courseSlotInvoiceModal = ref(false);
    const courseSlotInvoiceLoading = ref(false);
    const multipleSlotSelection = ref({});

    const isSlotSelectable = slot => (isTrainer.value ? slot.status === NOT_INVOICED : slot.status !== PAID);

    const singleSlotColumns = computed(() => [
      { name: 'stepName', label: 'Étape', field: 'stepName', align: 'left' },
      {
        name: 'startDate',
        label: 'Début',
        field: 'startDate',
        align: 'center',
        format: value => CompaniDate(value).format(`${DD_MM_YYYY} ${HHhMM}`),
      },
      {
        name: 'endDate',
        label: 'Fin',
        field: 'endDate',
        align: 'center',
        format: value => CompaniDate(value).format(`${DD_MM_YYYY} ${HHhMM}`),
      },
      {
        name: 'duration',
        label: 'Durée',
        field: 'duration',
        align: 'center',
        format: value => CompaniDuration(value).format(LONG_DURATION_H_MM),
      },
      {
        name: 'amount',
        label: 'Montant',
        field: 'amount',
        format: formatStringToPrice,
        align: 'center',
      },
      {
        name: 'isAbsence',
        label: 'Absence',
        field: 'isAbsence',
        align: 'center',
        format: value => (value ? 'Oui' : 'Non'),
      },
      {
        name: 'status',
        label: 'Statut',
        field: 'status',
        align: 'center',
        format: value => SLOT_STATUS[value],
      },
      {
        name: 'trainerBillNumber',
        label: 'Facture',
        field: 'trainerBillNumber',
        align: 'center',
      },
      { name: 'actions', label: '', field: '', align: 'right' },
    ]);

    const collectiveSlotsColumns = computed(() => [
      { name: 'traineeName', label: 'Apprenant', field: 'traineeName', align: 'left' },
      { name: 'stepName', label: 'Étape', field: 'stepName', align: 'left' },
      {
        name: 'startDate',
        label: 'Début',
        field: 'startDate',
        align: 'center',
        format: value => CompaniDate(value).format(`${DD_MM_YYYY} ${HHhMM}`),
      },
      {
        name: 'endDate',
        label: 'Fin',
        field: 'endDate',
        align: 'center',
        format: value => CompaniDate(value).format(`${DD_MM_YYYY} ${HHhMM}`),
      },
      {
        name: 'duration',
        label: 'Durée',
        field: 'duration',
        align: 'center',
        format: value => CompaniDuration(value).format(LONG_DURATION_H_MM),
      },
      {
        name: 'amount',
        label: 'Montant',
        field: 'amount',
        format: formatStringToPrice,
        align: 'center',
      },
      {
        name: 'isAbsence',
        label: 'Absence',
        field: 'isAbsence',
        align: 'center',
        format: value => (value ? 'Oui' : 'Non'),
      },
      {
        name: 'status',
        label: 'Statut',
        field: 'status',
        align: 'center',
        format: value => SLOT_STATUS[value],
      },
      {
        name: 'trainerBillNumber',
        label: 'Facture',
        field: 'trainerBillNumber',
        align: 'center',
      },
      { name: 'actions', label: '', field: '', align: 'right' },
    ]);

    const formatStatusDurations = (obj, prefix = '') => {
      const formatted = {
        [`notInvoiced${prefix}Duration`]: CompaniDuration(obj[`notInvoiced${prefix}Duration`])
          .format(LONG_DURATION_H_MM),
        [`notInvoiced${prefix}Amount`]: formatStringToPrice(obj[`notInvoiced${prefix}Amount`]),
        [`invoiced${prefix}Duration`]: CompaniDuration(obj[`invoiced${prefix}Duration`]).format(LONG_DURATION_H_MM),
        [`invoiced${prefix}Amount`]: formatStringToPrice(obj[`invoiced${prefix}Amount`]),
        [`paid${prefix}Duration`]: CompaniDuration(obj[`paid${prefix}Duration`]).format(LONG_DURATION_H_MM),
        [`paid${prefix}Amount`]: formatStringToPrice(obj[`paid${prefix}Amount`]),
      };

      // Absence duration is only tracked at the course/collective totals level (with a SingleSlots/CollectiveSlots
      // prefix), not on individual steps or days.
      if (!prefix) return formatted;

      return {
        ...formatted,
        [`notInvoiced${prefix}AbsenceDuration`]: CompaniDuration(obj[`notInvoiced${prefix}AbsenceDuration`])
          .format(LONG_DURATION_H_MM),
        [`invoiced${prefix}AbsenceDuration`]: CompaniDuration(obj[`invoiced${prefix}AbsenceDuration`])
          .format(LONG_DURATION_H_MM),
        [`paid${prefix}AbsenceDuration`]: CompaniDuration(obj[`paid${prefix}AbsenceDuration`])
          .format(LONG_DURATION_H_MM),
      };
    };

    const coursesWithFormattedData = computed(() => trainerInfos.value.courses.map((course) => {
      const singleSlots = Object.entries(course.singleTraineeSlots || {});

      const rows = singleSlots.flatMap(([stepName, obj]) => obj.slots.map(slot => ({ stepName, ...slot })));

      const formattedSingleTraineeSlots = Object.fromEntries(
        singleSlots.map(([stepName, obj]) => [stepName, { ...obj, ...formatStatusDurations(obj) }])
      );

      return {
        ...course,
        singleTraineeSlots: formattedSingleTraineeSlots,
        ...formatStatusDurations(course, 'SingleSlots'),
        rows,
      };
    }));

    const formattedTrainerDurations = computed(() => ({
      notInvoiced: CompaniDuration(trainerInfos.value.totalNotInvoicedSlotsDuration).format(LONG_DURATION_H_MM),
      notInvoicedAbsence: CompaniDuration(trainerInfos.value.totalNotInvoicedSlotsAbsenceDuration)
        .format(LONG_DURATION_H_MM),
      notInvoicedAmount: formatStringToPrice(trainerInfos.value.totalNotInvoicedSlotsAmount),
      invoiced: CompaniDuration(trainerInfos.value.totalInvoicedSlotsDuration).format(LONG_DURATION_H_MM),
      invoicedAbsence: CompaniDuration(trainerInfos.value.totalInvoicedSlotsAbsenceDuration).format(LONG_DURATION_H_MM),
      invoicedAmount: formatStringToPrice(trainerInfos.value.totalInvoicedSlotsAmount),
      paid: CompaniDuration(trainerInfos.value.totalPaidSlotsDuration).format(LONG_DURATION_H_MM),
      paidAbsence: CompaniDuration(trainerInfos.value.totalPaidSlotsAbsenceDuration).format(LONG_DURATION_H_MM),
      paidAmount: formatStringToPrice(trainerInfos.value.totalPaidSlotsAmount),
    }));

    const formattedCollectiveSlots = computed(() => {
      const { slots, totals } = trainerInfos.value.collectiveSlots;

      const formattedSlots = Object.fromEntries(
        Object.entries(slots).map(([day, slotGroup]) => [day, { ...slotGroup, ...formatStatusDurations(slotGroup) }])
      );

      const formattedTotals = formatStatusDurations(totals, 'CollectiveSlots');

      return {
        slots: formattedSlots,
        notInvoiced: formattedTotals.notInvoicedCollectiveSlotsDuration,
        notInvoicedAbsence: formattedTotals.notInvoicedCollectiveSlotsAbsenceDuration,
        invoiced: formattedTotals.invoicedCollectiveSlotsDuration,
        invoicedAbsence: formattedTotals.invoicedCollectiveSlotsAbsenceDuration,
        paid: formattedTotals.paidCollectiveSlotsDuration,
        paidAbsence: formattedTotals.paidCollectiveSlotsAbsenceDuration,
        ...formattedTotals,
      };
    });

    const rules = computed(() => ({
      courseSlotsToPay: { billNumber: { required } },
      invoice: { number: { required }, file: { required } },
    }));

    const v$ = useVuelidate(rules, { courseSlotsToPay, invoice });

    const displayDuration = value => value !== '0min';

    const goToCourse = courseId => ({
      name: isTrainerSection ? 'trainers courses info' : 'ni management blended courses info',
      params: { courseId },
      query: { defaultTab: 'traineeFollowUp' },
    });

    const openCourseSlotListValidationModal = () => {
      courseSlotsToPay.value._ids = Object.values(selectedCourseSlots.value).flat();
      courseSlotListValidationModal.value = true;
    };

    const resetSlotListValidationInfos = (displayMessage = false) => {
      courseSlotListValidationModal.value = false;
      if (displayMessage) NotifyPositive('Modification des créneaux annulées.');

      courseSlotsToPay.value = { _ids: [], billNumber: '' };
      v$.value.courseSlotsToPay.$reset();
    };

    const updateSlotList = async () => {
      try {
        v$.value.courseSlotsToPay.$touch();
        if (v$.value.courseSlotsToPay.$error) return NotifyWarning('Champ(s) invalide(s).');

        await CourseSlots.updateSlotList({ ...courseSlotsToPay.value, trainer: trainerId.value });
        emit('refresh');
        courseSlotListValidationModal.value = false;

        NotifyPositive('Créneaux modifiés.');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la modification des créneaux.');
      }
    };

    const openCourseSlotInvoiceModal = () => { courseSlotInvoiceModal.value = true; };

    const resetCourseSlotInvoiceModal = () => {
      courseSlotInvoiceModal.value = false;
      invoice.value = { number: '', file: '' };
      v$.value.invoice.$reset();
    };

    const submitCourseSlotInvoice = async () => {
      try {
        v$.value.invoice.$touch();
        if (v$.value.invoice.$error) return NotifyWarning('Champ(s) invalide(s).');

        courseSlotInvoiceLoading.value = true;

        const form = new FormData();
        selectedSlotsForInvoice.value.forEach(slot => form.append('courseSlots', slot._id));
        form.append('number', invoice.value.number);
        form.append('file', invoice.value.file);

        await TrainerInvoices.create(form);
        emit('refresh');
        courseSlotInvoiceModal.value = false;

        NotifyPositive('Créneaux facturés.');
      } catch (e) {
        console.error(e);
        if (e.data && e.data.statusCode === 409 && e.data.message) return NotifyNegative(e.data.message);
        NotifyNegative('Erreur lors de la facturation des créneaux.');
      } finally {
        courseSlotInvoiceLoading.value = false;
      }
    };

    const selectSlotList = (event, obj) => {
      const selectableSlots = obj.slots.filter(isSlotSelectable).map(s => s._id);

      if (!obj.day) {
        const { courseId } = obj;
        multipleSlotSelection.value[courseId] = event;
        selectedCourseSlots.value[courseId] = event ? selectableSlots : [];
      } else {
        const { day } = obj;
        multipleSlotSelection.value[day] = event;
        selectedCourseSlots.value[day] = event ? selectableSlots : [];
      }
    };

    const selectSlotGroupByDate = (event, row, day, slots) => {
      const sameDate = slots
        .filter(s => CompaniDate(s.startDate).isSame(row.startDate) &&
          CompaniDate(s.endDate).isSame(row.endDate) && isSlotSelectable(s))
        .map(s => s._id);

      const currentSelectedCourseSlots = Array.isArray(selectedCourseSlots.value[day])
        ? selectedCourseSlots.value[day]
        : [];

      selectedCourseSlots.value[day] = event
        ? [...new Set([...currentSelectedCourseSlots, ...sameDate])]
        : currentSelectedCourseSlots.filter(id => !sameDate.includes(id));
    };

    watch(() => trainerInfos.value, (newVal) => {
      selectedCourseSlots.value = Object.fromEntries([
        ...newVal.courses.map(course => [course._id, []]),
        ...Object.keys(get(newVal, 'collectiveSlots.slots', {})).map(day => [day, []]),
      ]);

      multipleSlotSelection.value = Object.fromEntries([
        ...newVal.courses.map(course => [course._id, false]),
        ...Object.keys(get(newVal, 'collectiveSlots.slots', {})).map(day => [day, false]),
      ]);

      areCourseDetailsVisible.value = Object.fromEntries(
        newVal.courses.map(course => [course._id, areCourseDetailsVisible.value[course._id]])
      );
    }, { immediate: true });

    watch(() => selectedCourseSlots.value, (newVal) => {
      Object.keys(newVal).forEach((val) => {
        const slots = trainerInfos.value.collectiveSlots.slots[val]?.slots ||
          get(coursesWithFormattedData.value.find(course => course._id === val), 'rows') || [];
        const selectableSlots = slots.filter(isSlotSelectable).map(s => s._id);

        if (selectableSlots.length) {
          multipleSlotSelection.value[val] = selectableSlots.length === selectedCourseSlots.value[val].length;
        }
      });
    }, { deep: true });

    const selectedSlotsForInvoice = computed(() => {
      const selectedIds = Object.values(selectedCourseSlots.value).flat();
      const allSlots = [
        ...coursesWithFormattedData.value.flatMap(course => course.rows),
        ...Object.values(trainerInfos.value.collectiveSlots.slots).flatMap(dayGroup => dayGroup.slots),
      ];

      return allSlots.filter(slot => selectedIds.includes(slot._id));
    });

    return {
      // Data
      isDashboard,
      areCourseDetailsVisible,
      selectedCourseSlots,
      courseSlotsToPay,
      invoice,
      courseSlotListValidationModal,
      courseSlotInvoiceModal,
      courseSlotInvoiceLoading,
      displayDetails,
      multipleSlotSelection,
      // Validation
      v$,
      // Computed
      singleSlotColumns,
      coursesWithFormattedData,
      collectiveSlotsColumns,
      formattedTrainerDurations,
      formattedCollectiveSlots,
      selectedSlotsForInvoice,
      // Methods
      formatIdentity,
      displayDuration,
      goToCourse,
      isSlotSelectable,
      openCourseSlotListValidationModal,
      resetSlotListValidationInfos,
      updateSlotList,
      openCourseSlotInvoiceModal,
      resetCourseSlotInvoiceModal,
      submitCourseSlotInvoice,
      selectSlotList,
      selectSlotGroupByDate,
    };
  },
};
</script>

<style lang="sass" scoped>
.trainerInfosContainer
  display: flex
  flex-direction: row
  flex-wrap: wrap
  justify-content: space-between
  align-items: center

  @media screen and (max-width: $breakpoint-md-max)
    flex-direction: column
    align-items: flex-start
</style>
