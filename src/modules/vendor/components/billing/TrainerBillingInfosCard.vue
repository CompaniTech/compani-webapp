<template>
  <q-card v-if="trainerInfos.courses.length || Object.keys(trainerInfos.collectiveSlots.slots).length"
    class="container clickable cursor-pointer" flat>
    <q-expansion-item class="q-my-md" v-model="displayDetails">
      <template #header>
        <div class="row items-center justify-between full-width">
          <div>
            <span v-if="isDashboard" class="text-copper-500">{{ formatIdentity(trainerInfos.identity, 'FL') }}</span>
            <span v-if="displayDuration(formattedTrainerDurations.notPaid)" class="text-weight-bold text-orange-400">
              <span v-if="isDashboard">&nbsp;- </span>À régler : {{ formattedTrainerDurations.notPaid }} -
              &nbsp;{{ formattedTrainerDurations.notPaidAmount }} (dont {{ formattedTrainerDurations.notPaidAbsence }}
              &nbsp;d'absence)
            </span>
            <span v-if="displayDuration(formattedTrainerDurations.paid)" class="text-copper-500">
              <span v-if="isDashboard || displayDuration(formattedTrainerDurations.notPaid)">&nbsp;/ </span>réglé :
              {{ formattedTrainerDurations.paid }} - {{ formattedTrainerDurations.paidAmount }} (dont
              &nbsp;{{ formattedTrainerDurations.paidAbsence }} d'absence)
            </span>
          </div>
          <ni-primary-button v-if="!isTrainer" class="q-ma-md" label="Régler les créneaux sélectionnés"
            @click.stop="openCourseSlotListValidationModal"
            :disabled="Object.values(selectedCourseSlots).flat().length === 0" />
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
              <span v-if="displayDuration(course.notPaidSingleSlotsDuration)"
                class="text-weight-bold text-orange-400">
                  <br> À régler : {{ course.notPaidSingleSlotsDuration }} - {{ course.notPaidSingleSlotsAmount }} (dont
                  &nbsp;{{ course.notPaidSingleSlotsAbsenceDuration }} d'absence)
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
              <span class="text-orange-400" v-if="displayDuration(course.singleTraineeSlots[stepName].toPayDuration)">
                {{ course.singleTraineeSlots[stepName].toPayDuration }} à régler
                &nbsp;({{ course.singleTraineeSlots[stepName].toPayAmount }})
              </span>
              <span v-if="displayDuration(course.singleTraineeSlots[stepName].paidDuration)">
                <span v-if="displayDuration(course.singleTraineeSlots[stepName].toPayDuration)"> , </span>
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
                      :disable="course.rows.every(s => s.status === PAID)" />
                  </template>
                  <template v-else>{{ col.label }}</template>
                </q-th>
              </template>
              <template #row="{ props }">
                <q-td v-for="col in props.cols" :key="col.name" :props="props">
                  <template v-if="col.name === 'actions' && !isTrainer">
                    <q-checkbox class="q-mr-md" v-model="selectedCourseSlots[course._id]" :val="props.row._id" dense
                      :disable="props.row.status === PAID" />
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
              <span v-if="displayDuration(formattedCollectiveSlots.notPaid)"
                class="text-weight-bold text-orange-400 q-ma-md">
                <br> À régler : {{ formattedCollectiveSlots.notPaid }} -
                &nbsp;{{ formattedCollectiveSlots.notPaidCollectiveSlotsAmount }} (dont
                &nbsp;{{ formattedCollectiveSlots.notPaidAbsence }} d'absence)
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
              <span v-if="displayDuration(formattedCollectiveSlots.slots[day].toPayDuration)"
                class="text-weight-bold text-orange-400 q-ma-md">
                &nbsp;À régler : {{ formattedCollectiveSlots.slots[day].toPayDuration }}
                ({{ formattedCollectiveSlots.slots[day].toPayAmount }})
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
                      :disable="trainerInfos.collectiveSlots.slots[day].slots.every(s => s.status === PAID)" />
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
                  <template v-else-if="col.name === 'actions' && !isTrainer">
                    <q-checkbox class="q-mr-md"
                      :model-value="selectedCourseSlots[day]?.includes(props.row._id)" dense
                      @update:model-value="val =>
                        selectSlotGroupByDate(val, props.row, day, trainerInfos.collectiveSlots.slots[day].slots)"
                      :disable="props.row.status === PAID" />
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
</template>

<script>

import { ref, toRefs, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import get from 'lodash/get';
import { required } from '@vuelidate/validators';
import useVuelidate from '@vuelidate/core';
import { LONG_DURATION_H_MM, DD_MM_YYYY, HHhMM, SLOT_STATUS, PAID, NOT_PAID } from '@data/constants';
import { formatIdentity, formatStringToPrice } from '@helpers/utils';
import CompaniDuration from '@helpers/dates/companiDurations';
import CompaniDate from '@helpers/dates/companiDates';
import ExpandingTable from '@components/table/ExpandingTable';
import Banner from '@components/Banner';
import Button from '@components/PrimaryButton';
import { NotifyNegative, NotifyWarning, NotifyPositive } from '@components/popup/notify';
import CourseSlotListValidationModal from 'src/modules/vendor/components/billing/CourseSlotListValidationModal';
import CourseSlots from '@api/CourseSlots';

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
  },
  emits: ['refresh'],
  setup (props, { emit }) {
    const { trainerInfos, trainerId, isTrainer } = toRefs(props);
    const $route = useRoute();
    const isDashboard = /\/trainers-follow-up/.test($route.path);
    const displayDetails = ref(!isDashboard);

    const areCourseDetailsVisible = ref({});
    const selectedCourseSlots = ref({});
    const courseSlotsToPay = ref({ _ids: [], billNumber: '' });
    const courseSlotListValidationModal = ref(false);
    const multipleSlotSelection = ref({});

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

    const coursesWithFormattedData = computed(() => trainerInfos.value.courses.map((course) => {
      const singleSlots = Object.entries(course.singleTraineeSlots || {});

      const rows = singleSlots.flatMap(([stepName, obj]) => obj.slots.map(slot => ({ stepName, ...slot })));

      const {
        paidSingleSlotsDuration,
        paidSingleSlotsAbsenceDuration,
        notPaidSingleSlotsDuration,
        notPaidSingleSlotsAbsenceDuration,
      } = course;

      const formattedSingleTraineeSlots = Object.fromEntries(
        singleSlots.map(([stepName, obj]) => [
          stepName,
          {
            ...obj,
            toPayDuration: CompaniDuration(obj.toPayDuration).format(LONG_DURATION_H_MM),
            paidDuration: CompaniDuration(obj.paidDuration).format(LONG_DURATION_H_MM),
            toPayAmount: formatStringToPrice(obj.toPayAmount),
            paidAmount: formatStringToPrice(obj.paidAmount),
          },
        ])
      );

      return {
        ...course,
        singleTraineeSlots: formattedSingleTraineeSlots,
        paidSingleSlotsDuration: CompaniDuration(paidSingleSlotsDuration).format(LONG_DURATION_H_MM),
        paidSingleSlotsAbsenceDuration: CompaniDuration(paidSingleSlotsAbsenceDuration).format(LONG_DURATION_H_MM),
        notPaidSingleSlotsDuration: CompaniDuration(notPaidSingleSlotsDuration).format(LONG_DURATION_H_MM),
        notPaidSingleSlotsAbsenceDuration: CompaniDuration(notPaidSingleSlotsAbsenceDuration)
          .format(LONG_DURATION_H_MM),
        ...(course.notPaidSingleSlotsAmount &&
          { notPaidSingleSlotsAmount: formatStringToPrice(course.notPaidSingleSlotsAmount) }),
        ...(course.paidSingleSlotsAmount &&
          { paidSingleSlotsAmount: formatStringToPrice(course.paidSingleSlotsAmount) }),
        rows,
      };
    }));

    const formattedTrainerDurations = computed(() => ({
      notPaid: CompaniDuration(trainerInfos.value.totalNotPaidSlotsDuration).format(LONG_DURATION_H_MM),
      notPaidAbsence: CompaniDuration(trainerInfos.value.totalNotPaidSlotsAbsenceDuration).format(LONG_DURATION_H_MM),
      paid: CompaniDuration(trainerInfos.value.totalPaidSlotsDuration).format(LONG_DURATION_H_MM),
      paidAbsence: CompaniDuration(trainerInfos.value.totalPaidSlotsAbsenceDuration).format(LONG_DURATION_H_MM),
      ...(trainerInfos.value.totalPaidSlotsAmount &&
        { paidAmount: formatStringToPrice(trainerInfos.value.totalPaidSlotsAmount) }),
      ...(trainerInfos.value.totalNotPaidSlotsAmount &&
        { notPaidAmount: formatStringToPrice(trainerInfos.value.totalNotPaidSlotsAmount) }),
    }));

    const formattedCollectiveSlots = computed(() => {
      const { slots, totals } = trainerInfos.value.collectiveSlots;

      const formattedSlots = Object.fromEntries(
        Object.entries(slots).map(([day, slotGroup]) => [
          day,
          {
            ...slotGroup,
            toPayDuration: CompaniDuration(slotGroup.toPayDuration).format(LONG_DURATION_H_MM),
            paidDuration: CompaniDuration(slotGroup.paidDuration).format(LONG_DURATION_H_MM),
            ...(slotGroup.toPayAmount && { toPayAmount: formatStringToPrice(slotGroup.toPayAmount) }),
            ...(slotGroup.paidAmount && { paidAmount: formatStringToPrice(slotGroup.paidAmount) }),
          },
        ])
      );

      return {
        slots: formattedSlots,
        notPaid: CompaniDuration(totals.notPaidCollectiveSlotsDuration).format(LONG_DURATION_H_MM),
        notPaidAbsence: CompaniDuration(totals.notPaidCollectiveSlotsAbsenceDuration).format(LONG_DURATION_H_MM),
        paid: CompaniDuration(totals.paidCollectiveSlotsDuration).format(LONG_DURATION_H_MM),
        paidAbsence: CompaniDuration(totals.paidCollectiveSlotsAbsenceDuration).format(LONG_DURATION_H_MM),
        ...(totals.notPaidCollectiveSlotsAmount &&
          { notPaidCollectiveSlotsAmount: formatStringToPrice(totals.notPaidCollectiveSlotsAmount) }),
        ...(totals.paidCollectiveSlotsAmount &&
          { paidCollectiveSlotsAmount: formatStringToPrice(totals.paidCollectiveSlotsAmount) }),
      };
    });

    const rules = computed(() => ({
      courseSlotsToPay: { billNumber: { required } },
    }));

    const v$ = useVuelidate(rules, { courseSlotsToPay });

    const displayDuration = value => value !== '0min';

    const goToCourse = courseId => ({
      name: isTrainer.value ? 'trainers courses info' : 'ni management blended courses info',
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

    const selectSlotList = (event, obj) => {
      const selectableSlots = obj.slots.filter(s => s.status === NOT_PAID).map(s => s._id);

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
          CompaniDate(s.endDate).isSame(row.endDate) && s.status !== PAID)
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
        const selectableSlots = slots.filter(s => s.status !== PAID).map(s => s._id);

        if (selectableSlots.length) {
          multipleSlotSelection.value[val] = selectableSlots.length === selectedCourseSlots.value[val].length;
        }
      });
    }, { deep: true });

    return {
      // Data
      isDashboard,
      areCourseDetailsVisible,
      selectedCourseSlots,
      courseSlotsToPay,
      courseSlotListValidationModal,
      PAID,
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
      // Methods
      formatIdentity,
      displayDuration,
      goToCourse,
      openCourseSlotListValidationModal,
      resetSlotListValidationInfos,
      updateSlotList,
      selectSlotList,
      selectSlotGroupByDate,
    };
  },
};
</script>

<style lang="sass" scoped>
</style>
