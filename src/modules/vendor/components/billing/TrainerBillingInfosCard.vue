<template>
  <q-card class="container clickable cursor-pointer" flat>
    <q-expansion-item @click="showDetails()" class="q-my-md">
      <template #header>
        <div class="row items-center full-width">
          <span class="text-copper-500">{{ formatIdentity(trainerInfos.identity, 'FL') }}</span>
          <span v-if="displayDuration(formattedTrainerDurations.notPaid)" class="text-weight-bold text-orange-400">
            &nbsp;- À régler : {{ formattedTrainerDurations.notPaid }} (dont
            &nbsp;{{ formattedTrainerDurations.notPaidAbsence }} d'absence)
          </span>
          <span v-if="displayDuration(formattedTrainerDurations.paid)" class="text-copper-500">
            &nbsp;/ réglé : {{ formattedTrainerDurations.paid }} (dont {{ formattedTrainerDurations.paidAbsence }}
            &nbsp;d'absence)
          </span>
        </div>
      </template>
      <div v-if="displayDetails" class="q-pa-sm bg-peach-200">
        <q-expansion-item v-for="course of coursesWithFormattedData" :key="course._id" class="q-ma-sm bg-white"
          @click="showCourseDetails(course._id)">
          <template #header>
            <div class="full-width">
              <span class="text-weight-bold text-copper-600">{{ course.name }}</span>
              <span v-if="displayDuration(course.notPaidSingleSlotsDuration)"
                class="text-weight-bold text-orange-400">
                  <br> À régler : {{ course.notPaidSingleSlotsDuration }} (dont
                  &nbsp;{{ course.notPaidSingleSlotsAbsenceDuration }} d'absence)
                </span>
                <span class="text-copper-500" v-if="displayDuration(course.paidSingleSlotsDuration)">
                  &nbsp;/&nbsp;réglé : {{ course.paidSingleSlotsDuration }} (dont
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
            <ni-expanding-table :data="course.rows" :columns="singleSlotColumns"
              v-model:pagination="coursePaginations[course._id]" :rows-per-page="[10, 20]" />
          </div>
        </q-expansion-item>
        <q-expansion-item class="q-ma-sm bg-white" v-if="Object.keys(trainerInfos.collectiveSlots.slots).length">
          <template #header>
            <div class="full-width align-center">
              <span class="text-weight-bold text-copper-600"> Sessions collectives</span>
              <span v-if="displayDuration(formattedCollectiveSlotsDurations.notPaid)"
                class="text-weight-bold text-orange-400 q-ma-md">
                <br> À régler : {{ formattedCollectiveSlotsDurations.notPaid }} (dont
                &nbsp;{{ formattedCollectiveSlotsDurations.notPaidAbsence }} d'absence)
              </span>
              <span class="text-copper-500" v-if="displayDuration(formattedCollectiveSlotsDurations.paid)">
                &nbsp;/ réglé : {{ formattedCollectiveSlotsDurations.paid }} (dont
                &nbsp;{{ formattedCollectiveSlotsDurations.paidAbsence }} d'absence)
              </span>
            </div>
          </template>
          <ni-banner class="bg-copper-grey-100 q-pa-lg" icon="info_outline">
              <template #message>
                <span>Attention, les créneaux qui n'ont pas les mêmes horaires de début et de fin sont comptés
                    séparément.</span>
              </template>
            </ni-banner>
          <div v-for="day of Object.keys(trainerInfos.collectiveSlots.slots)" :key="day">
            <q-item-label class="q-pl-lg text-weight-bold q-pt-lg">Session du {{ day }}</q-item-label>
            <ni-expanding-table :data="trainerInfos.collectiveSlots.slots[day]" :columns="collectiveSlotsColumns"
              v-model:pagination="collectiveSlotsPaginations[day]" :rows-per-page="[10, 20]" />
          </div>
        </q-expansion-item>
      </div>
  </q-expansion-item>
</q-card>
</template>

<script>

import { ref, toRefs, computed } from 'vue';
import { LONG_DURATION_H_MM, DD_MM_YYYY, HHhMM } from '@data/constants';
import { formatIdentity, formatStringToPrice } from '@helpers/utils';
import CompaniDuration from '@helpers/dates/companiDurations';
import CompaniDate from '@helpers/dates/companiDates';
import ExpandingTable from '@components/table/ExpandingTable';
import Banner from '@components/Banner';
import { SLOT_STATUS } from '../../../../core/data/constants';

export default {
  name: 'TrainerBillingInfosCard',
  props: {
    trainerInfos: { type: Object, default: () => ({}) },
  },
  components: {
    'ni-expanding-table': ExpandingTable,
    'ni-banner': Banner,
  },
  setup (props) {
    const { trainerInfos } = toRefs(props);
    const displayDetails = ref(false);
    const areCourseDetailsVisible = ref(
      Object.fromEntries(trainerInfos.value.courses.map(course => [course._id, false]))
    );
    const coursePaginations = ref(
      Object.fromEntries(trainerInfos.value.courses.map(course => [course._id, { page: 1, rowsPerPage: 10 }]))
    );
    const collectiveSlotsPaginations = ref(
      Object.fromEntries(
        Object.keys(trainerInfos.value.collectiveSlots.slots).map(day => [day, { page: 1, rowsPerPage: 10 }])
      )
    );

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
    ]);

    const collectiveSlotsColumns = computed(() => [
      { name: 'traineeName', label: 'Apprenant', field: 'traineeName', align: 'left' },
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
        rows,
      };
    }));

    const formattedTrainerDurations = computed(() => ({
      notPaid: CompaniDuration(trainerInfos.value.totalNotPaidSlotsDuration).format(LONG_DURATION_H_MM),
      notPaidAbsence: CompaniDuration(trainerInfos.value.totalNotPaidSlotsAbsenceDuration).format(LONG_DURATION_H_MM),
      paid: CompaniDuration(trainerInfos.value.totalPaidSlotsDuration).format(LONG_DURATION_H_MM),
      paidAbsence: CompaniDuration(trainerInfos.value.totalPaidSlotsAbsenceDuration).format(LONG_DURATION_H_MM),
    }));

    const formattedCollectiveSlotsDurations = computed(() => {
      const {
        notPaidCollectiveSlotsDuration,
        notPaidCollectiveSlotsAbsenceDuration,
        paidCollectiveSlotsDuration,
        paidCollectiveSlotsAbsenceDuration,
      } = trainerInfos.value.collectiveSlots.globalInfos;

      return {
        notPaid: CompaniDuration(notPaidCollectiveSlotsDuration).format(LONG_DURATION_H_MM),
        notPaidAbsence: CompaniDuration(notPaidCollectiveSlotsAbsenceDuration).format(LONG_DURATION_H_MM),
        paid: CompaniDuration(paidCollectiveSlotsDuration).format(LONG_DURATION_H_MM),
        paidAbsence: CompaniDuration(paidCollectiveSlotsAbsenceDuration).format(LONG_DURATION_H_MM),
      };
    });

    const showDetails = () => { displayDetails.value = !displayDetails.value; };

    const showCourseDetails = (courseId) => {
      areCourseDetailsVisible.value[courseId] = !areCourseDetailsVisible.value[courseId];
    };

    const displayDuration = value => value !== '0min';

    return {
      // Data
      displayDetails,
      areCourseDetailsVisible,
      coursePaginations,
      collectiveSlotsPaginations,
      // Computed
      singleSlotColumns,
      coursesWithFormattedData,
      collectiveSlotsColumns,
      formattedTrainerDurations,
      formattedCollectiveSlotsDurations,
      // Methods
      formatIdentity,
      showDetails,
      showCourseDetails,
      displayDuration,
    };
  },
};
</script>

<style lang="sass" scoped>
</style>
