<template>
  <ni-modal :model-value="modelValue" @hide="hide" @update:model-value="input" container-class="modal-container-md">
    <template #title>
      <span class="text-weight-bold">Informations de la convention</span>
    </template>
     <div><span class="text-weight-bold">Structure :</span> {{ companyName }}</div>
     <div><span class="text-weight-bold">Nom du programme :</span> {{ course.subProgram.program.name }}</div>
     <div class="learning-goals">
      <div class="text-weight-bold">Objectifs :</div>
      {{ course.subProgram.program.learningGoals }}
    </div>
     <div>
      <span class="text-weight-bold">Créneaux :</span>
      {{ formatQuantity('créneau', course.slots.length + course.slotsToPlan.length, 'x') }}
    </div>
    <div><span class="text-weight-bold">Durée :</span> {{ totalDuration }}</div>
    <div><span class="text-weight-bold">Effectif :</span> {{ learnersName }}</div>
    <div><span class="text-weight-bold">Dates :</span> {{ dates }}</div>
    <div><span class="text-weight-bold">Lieux :</span> {{ addressList }}</div>
    <div>
      <span class="text-weight-bold">{{ formatQuantity('Intervenant·e', course.trainers.length, 's', false) }} :</span>
      {{ trainersName }}
    </div>
    <div v-if="!isInterCourse" class="q-mb-md">
      <span class="text-weight-bold">Prix du programme :</span>
      {{ Number(newGeneratedTrainingContractInfos.price) }} €
    </div>
    <div v-else class="q-mb-md">
      <div>
        <span class="text-weight-bold">Prix par stagiaire :</span>
        {{ Number(newGeneratedTrainingContractInfos.price) }} €
      </div>
      <div>
        <span class="text-weight-bold">Prix total :</span>
        {{ toFixedToFloat(Number(newGeneratedTrainingContractInfos.price) * learnersCount, 1) }} €
      </div>
    </div>
    <template #footer>
      <ni-button class="full-width modal-btn bg-primary" label="Générer la convention" icon-right="add" color="white"
        @click="submit" :loading="loading" />
    </template>
  </ni-modal>
</template>

<script>
import { computed, toRefs } from 'vue';
import Modal from '@components/modal/Modal';
import Button from '@components/Button';
import { formatIdentity, formatQuantity } from '@helpers/utils';
import CompaniDuration from '@helpers/dates/companiDurations';
import { SHORT_DURATION_H_MM, E_LEARNING } from '@data/constants';
import { useCourseDocumentInfosModal } from '@composables/courseDocumentInfosModal';
import { toFixedToFloat } from '@helpers/numbers';

export default {
  name: 'TrainingContractInfosModal',
  props: {
    modelValue: { type: Boolean, default: false },
    course: { type: Object, default: () => ({}) },
    newGeneratedTrainingContractInfos: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
    isInterCourse: { type: Boolean, default: true },
  },
  components: {
    'ni-modal': Modal,
    'ni-button': Button,
  },
  emits: ['hide', 'update:model-value', 'submit'],
  setup (props, { emit }) {
    const { course, newGeneratedTrainingContractInfos, isInterCourse } = toRefs(props);

    const slots = computed(() => course.value.slots);
    const { liveDuration, dates, addressList } = useCourseDocumentInfosModal(course, slots);

    const elearnigDuration = computed(() => {
      if (!course.value.subProgram.steps.some(step => step.type === E_LEARNING)) return '';

      return course.value.subProgram.steps
        .filter(step => step.type === E_LEARNING)
        .reduce((acc, step) => acc.add(step.theoreticalDuration), CompaniDuration())
        .format(SHORT_DURATION_H_MM);
    });

    const totalDuration = computed(() => {
      const elearningDuration = elearnigDuration.value
        ? ` (+ ${elearnigDuration.value} de e-learning)`
        : '';
      return liveDuration.value + elearningDuration;
    });

    const learnersCount = computed(() => {
      if (!isInterCourse.value) return course.value.maxTrainees;

      return course.value.trainees
        .filter(t => t.registrationCompany === newGeneratedTrainingContractInfos.value.company).length;
    });

    const learnersName = computed(() => course.value.trainees
      .filter(trainee => trainee.registrationCompany === newGeneratedTrainingContractInfos.value.company)
      .map(trainee => formatIdentity(trainee.identity, 'FL'))
      .join(', '));

    const companyName = computed(() => course.value.companies
      .find(c => c._id === newGeneratedTrainingContractInfos.value.company).name);

    const trainersName = computed(() => course.value.trainers
      .map(trainer => formatIdentity(trainer.identity, 'FL'))
      .join(', '));

    const hide = () => emit('hide');
    const input = event => emit('update:model-value', event);
    const submit = () => emit('submit');

    return {
      // Computed
      totalDuration,
      dates,
      addressList,
      learnersCount,
      companyName,
      trainersName,
      learnersName,
      // Methods
      hide,
      input,
      submit,
      formatIdentity,
      formatQuantity,
      toFixedToFloat,
    };
  },
};
</script>

<style lang="sass" scoped>
.learning-goals
  white-space: pre-wrap
</style>
