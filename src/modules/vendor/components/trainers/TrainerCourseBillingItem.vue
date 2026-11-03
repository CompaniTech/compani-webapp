<template>
  <q-card flat class="q-pa-md q-mb-sm">
    <div class="row items-center justify-between">
      <div class="col-md-8 col-xs-12">
        <router-link :to="goToCourse" @click.stop>
          <span class="text-weight-bold text-copper-500 clickable-name">{{ courseName }}</span>
        </router-link>
        <div>Honoraires prévus : {{ plannedSalary }}</div>
        <div>Montant déjà facturé : {{ formatPrice(course.invoicedAmount) }}</div>
        <div :class="['text-weight-bold', TRAINER_COURSE_BILLING_STATUS_COLORS[course.status]]">
          {{ TRAINER_COURSE_BILLING_STATUS[course.status] }}
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
import { TRAINER_COURSE_BILLING_STATUS, INVOICED, PAID, NOT_INVOICED, PARTIALLY_INVOICED } from '@data/constants';

export default {
  name: 'TrainerCourseBillingItem',
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

    const plannedSalary = computed(() => (course.value.plannedSalary ? formatPrice(course.value.plannedSalary) : '-'));

    const isBilled = computed(() => [INVOICED, PAID].includes(course.value.status));

    const goToCourse = computed(() => ({
      name: isTrainer.value ? 'trainers courses info' : 'ni management blended courses info',
      params: { courseId: course.value._id },
    }));

    return {
      // Data
      TRAINER_COURSE_BILLING_STATUS,
      TRAINER_COURSE_BILLING_STATUS_COLORS,
      // Computed
      courseName,
      plannedSalary,
      isBilled,
      goToCourse,
      // Methods
      formatPrice,
    };
  },
};
</script>
