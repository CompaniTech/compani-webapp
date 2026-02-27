<template>
  <q-card class="container clickable cursor-pointer" flat>
    <q-expansion-item @click="showDetails()" class="header" :label="formatIdentity(trainerIdentity, 'FL')">
      <div v-if="displayDetails" class="q-pa-sm bg-peach-200">
        <q-expansion-item v-for="course of coursesWithComputedData" :key="course._id" :label="course.name"
          @click="showCourseDetails(course._id)" class=" q-ma-sm bg-white">
          <div class="q-pt-sm" v-if="areCourseDetailsVisible[course._id]">
            <div v-for="stepName of Object.keys(course.singleTraineeSlots)" :key="stepName" class="q-pa-sm q-pl-md">
              <span class="text-italic">{{ stepName }}</span> : {{ course.totalsByStep[stepName].toPay }} à régler,
              {{ course.totalsByStep[stepName].paid }} réglées.
            </div>
            <ni-expanding-table :data="course.rows" :columns="singleSlotColumns" />
          </div>
        </q-expansion-item>
      </div>
  </q-expansion-item>
</q-card>
</template>

<script>

import { ref, toRefs, computed } from 'vue';
import { LONG_DURATION_H_MM, PAID, NOT_PAID, DD_MM_YYYY, HHhMM } from '@data/constants';
import { formatIdentity } from '@helpers/utils';
import CompaniDuration from '@helpers/dates/companiDurations';
import CompaniDate from '@helpers/dates/companiDates';
import ExpandingTable from '@components/table/ExpandingTable';
import { SLOT_STATUS } from '../../../../core/data/constants';

export default {
  name: 'TrainerBillingInfosCard',
  props: {
    trainerIdentity: { type: Object, default: () => ({}) },
    courses: { type: Array, default: () => ([]) },
    collectiveSlots: { type: Object, default: () => ({}) },
  },
  components: {
    'ni-expanding-table': ExpandingTable,
  },
  setup (props) {
    const { courses } = toRefs(props);
    const displayDetails = ref(false);
    const areCourseDetailsVisible = ref(Object.fromEntries(courses.value.map(course => [course._id, false])));

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
        label: 'Durée (h)',
        field: 'duration',
        align: 'center',
        format: value => CompaniDuration(value).format(LONG_DURATION_H_MM),
      },
      {
        name: 'isAbsence',
        label: 'Absence',
        field: 'isAbsence',
        format: value => (value ? 'Oui' : 'Non'),
      },
      {
        name: 'status',
        label: 'Statut',
        field: 'status',
        format: value => SLOT_STATUS[value],
      },
    ]);

    const coursesWithComputedData = computed(() => courses.value.map((course) => {
      const singleSlots = Object.entries(course.singleTraineeSlots || {});

      const rows = singleSlots.flatMap(([stepName, slots]) => slots.map(slot => ({ stepName, ...slot })));

      const totalsByStep = {};
      singleSlots.forEach(([stepName, slots]) => {
        const total = slots.reduce(
          (acc, slot) => {
            if (slot.status === NOT_PAID) acc.toPay = acc.toPay.add(CompaniDuration(slot.duration));
            if (slot.status === PAID) acc.paid = acc.paid.add(CompaniDuration(slot.duration));
            return acc;
          },
          { toPay: CompaniDuration('PT0S'), paid: CompaniDuration('PT0S') }
        );

        totalsByStep[stepName] = {
          toPay: total.toPay.format(LONG_DURATION_H_MM),
          paid: total.paid.format(LONG_DURATION_H_MM),
        };
      });

      return { ...course, rows, totalsByStep };
    }));

    const showDetails = () => { displayDetails.value = !displayDetails.value; };

    const showCourseDetails = (courseId) => {
      areCourseDetailsVisible.value[courseId] = !areCourseDetailsVisible.value[courseId];
    };

    return {
      // Data
      displayDetails,
      areCourseDetailsVisible,
      // Computed
      singleSlotColumns,
      coursesWithComputedData,
      // Methods
      formatIdentity,
      showDetails,
      showCourseDetails,
    };
  },
};
</script>

<style lang="sass" scoped>
</style>
