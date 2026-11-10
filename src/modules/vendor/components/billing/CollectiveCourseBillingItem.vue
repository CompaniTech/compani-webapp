<template>
  <q-card flat class="q-pa-md q-mb-sm">
    <div class="row items-center justify-between">
      <div class="col-md-8 col-xs-12">
        <router-link :to="goToCourse" @click.stop>
          <span class="text-weight-bold text-copper-500 clickable-name">{{ courseName }}</span>
        </router-link>
        <div v-if="hasPlannedSalary">Honoraires prévus : {{ formatPrice(course.plannedSalary) }}</div>
        <div>Montant déjà facturé : {{ formatPrice(course.invoicedAmount) }}</div>
        <div>Montant réglé : {{ formatPrice(course.paidAmount) }}</div>
        <div :class="['text-weight-bold', TRAINER_COURSE_BILLING_STATUS_COLORS[course.status]]">
          <span v-if="formattedBillingDates">
            {{ TRAINER_COURSE_BILLING_STATUS[course.status] }} le {{ formattedBillingDates }}
          </span>
          <span v-else>{{ TRAINER_COURSE_BILLING_STATUS[course.status] }}</span>
        </div>
      </div>
      <ni-primary-button v-if="isTrainer" label="Facturer le groupe" :disabled="isBilled"
        @click="$emit('bill', course)" />
    </div>
  </q-card>
</template>

<script>
import { computed, toRefs } from 'vue';
import PrimaryButton from '@components/PrimaryButton';
import { composeCourseName } from '@helpers/courses';
import { formatPrice } from '@helpers/utils';
import CompaniDate from '@helpers/dates/companiDates';
import {
  TRAINER_COURSE_BILLING_STATUS,
  INVOICED,
  PAID,
  NOT_INVOICED,
  PARTIALLY_INVOICED,
  DD_MM_YYYY,
} from '@data/constants';

export default {
  name: 'CollectiveCourseBillingItem',
  components: { 'ni-primary-button': PrimaryButton },
  props: {
    course: { type: Object, required: true },
    isTrainer: { type: Boolean, default: false },
  },
  emits: ['bill'],
  setup (props) {
    const { course, isTrainer } = toRefs(props);

    const TRAINER_COURSE_BILLING_STATUS_COLORS = {
      [NOT_INVOICED]: 'text-orange-500',
      [PARTIALLY_INVOICED]: 'text-orange-500',
      [INVOICED]: 'text-copper-500',
      [PAID]: 'text-green-600',
    };

    const courseName = computed(() => composeCourseName(course.value));

    const hasPlannedSalary = computed(() => !!course.value.plannedSalary);

    const isBilled = computed(() => hasPlannedSalary.value && [INVOICED, PAID].includes(course.value.status));

    const goToCourse = computed(() => ({
      name: isTrainer.value ? 'trainers courses info' : 'ni management blended courses info',
      params: { courseId: course.value._id },
      query: { defaultTab: 'traineeFollowUp' },
    }));

    const formattedBillingDates = computed(() => {
      if (!course.value.billsSubmissionDates || !course.value.billsSubmissionDates.length) return '';
      const formattedDates = course.value.billsSubmissionDates.map(date => CompaniDate(date).format(DD_MM_YYYY));
      return formattedDates.join(', ');
    });

    return {
      // Data
      TRAINER_COURSE_BILLING_STATUS,
      TRAINER_COURSE_BILLING_STATUS_COLORS,
      // Computed
      courseName,
      hasPlannedSalary,
      isBilled,
      goToCourse,
      formattedBillingDates,
      // Methods
      formatPrice,
    };
  },
};
</script>
