<template>
  <ni-modal :model-value="modelValue" @hide="hide" @update:model-value="input" container-class="modal-container-md">
    <template #title>
      <span class="text-weight-bold">Informations de l'ordre de mission</span>
    </template>
    <div>
      <span class="text-weight-bold">Prénom et NOM :</span> {{ formatIdentity(trainer.identity, 'FL') }}
    </div>
    <div>
      <span class="text-weight-bold">Fonction : </span>
      <span v-if="trainer.identity.title">{{ trainerGender }}</span>
      <span v-else>
        <q-icon size="14px" name="mdi-alert-circle-outline" color="bright-orange" class="q-mr-xs" />Civilité manquante
      </span>
    </div>
    <div><span class="text-weight-bold">Nom du programme :</span> {{ courses[0].subProgram.program.name }}</div>
    <div>
      <span class="text-weight-bold">Durée :</span> {{ formatQuantity('session', slotsCount) }} - {{ liveDuration }}
    </div>
    <div><span class="text-weight-bold">Nombre de groupes :</span> {{ courses.length }}</div>
    <div><span class="text-weight-bold">Structure(s) :</span> {{ companies }}</div>
    <div><span class="text-weight-bold">Lieux :</span> {{ addressList }}</div>
    <div><span class="text-weight-bold">Dates :</span> {{ formattedDates }}</div>
    <div><span class="text-weight-bold">Formation certifiante :</span> {{ formattedCertifications }}</div>
    <div class="q-mb-md"><span class="text-weight-bold">Frais de formateur :</span> {{ fee }} €</div>
    <template #footer>
      <ni-button class="full-width modal-btn bg-primary" label="Générer la convention" icon-right="add" color="white"
        @click="submit" :loading="loading" />
    </template>
  </ni-modal>
</template>

<script>
import { computed, toRefs } from 'vue';
import get from 'lodash/get';
import Modal from '@components/modal/Modal';
import Button from '@components/Button';
import { NotifyWarning } from '@components/popup/notify';
import { formatIdentity, formatQuantity, formatName } from '@helpers/utils';
import { composeCourseName } from '@helpers/courses';
import { CIVILITY_OPTIONS, MR } from '@data/constants';
import { useCourseDocumentInfosModal } from '@composables/courseDocumentInfosModal';

export default {
  name: 'TrainerMissionInfosModal',
  props: {
    modelValue: { type: Boolean, default: false },
    courses: { type: Array, default: () => [] },
    fee: { type: Number, default: 0 },
    loading: { type: Boolean, default: false },
    trainer: { type: Object, default: () => ({}) },
  },
  components: {
    'ni-modal': Modal,
    'ni-button': Button,
  },
  emits: ['hide', 'update:model-value', 'submit'],
  setup (props, { emit }) {
    const { courses, trainer } = toRefs(props);

    const course = computed(() => courses.value[0]);

    const trainerGender = computed(() => {
      const civility = get(CIVILITY_OPTIONS.find(opt => trainer.value.identity.title === opt.value), 'value');
      return civility === MR ? 'Formateur' : 'Formatrice';
    });

    const slotsCount = computed(() => course.value.slots.length + course.value.slotsToPlan.length);

    const companies = computed(() => [...new Set(courses.value.map(c => formatName(c.companies)))].join(', '));

    const slots = computed(() => courses.value.map(c => c.slots).flat());
    const slotsToPlan = computed(() => courses.value.map(c => c.slotsToPlan).flat());

    const { liveDuration, dates, addressList } = useCourseDocumentInfosModal(course, slots);

    const formattedDates = computed(() => {
      if (dates.value.length) {
        if (slotsToPlan.value.length) {
          return `${dates.value}, ${formatQuantity('créneau', slotsToPlan.value.length, 'x')} encore à définir`;
        }
        return dates.value;
      }
      return `${formatQuantity('créneau', slotsToPlan.value.length, 'x')} encore à définir`;
    });

    const formattedCertifications = computed(() => {
      const courseNames = courses.value
        .filter(c => c.hasCertifyingTest)
        .map(c => composeCourseName(c, true)).join(', ');
      return courseNames ? `au moins un(e) stagiaire de ${courseNames}` : 'Non';
    });

    const hide = () => emit('hide');
    const input = event => emit('update:model-value', event);
    const submit = () => {
      if (!trainer.value.identity.title) {
        NotifyWarning('Civilité manquante, veuillez l\'ajouter dans l\'onglet "Infos personnelles"');
      } else emit('submit');
    };

    return {
      // Data
      CIVILITY_OPTIONS,
      // Computed
      slotsCount,
      liveDuration,
      companies,
      formattedDates,
      addressList,
      formattedCertifications,
      course,
      trainerGender,
      // Methods
      hide,
      input,
      submit,
      formatIdentity,
      formatQuantity,
      get,
    };
  },
};
</script>

<style lang="sass" scoped>
.learning-goals
  white-space: pre-wrap
</style>
