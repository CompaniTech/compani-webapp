<template>
  <ni-modal>
    <template #title>
      Ajouter un nouveau certificat de réalisation
    </template>
    <ni-select in-modal :model-value="newCompletionCertificate.trainee" @update:model-value="update($event, 'trainee')"
      :options="traineeOptions" :error="validations.trainee.$error" :disable="course.trainees.length < 2"
      required-field @blur="validations.trainee.$touch" caption="Stagiaire" />
    <ni-select in-modal :model-value="newCompletionCertificate.month" @update:model-value="update($event, 'month')"
      :options="monthOptions" :error="validations.month.$error" required-field @blur="validations.month.$touch"
      caption="Mois" />
    <template #footer>
      <q-btn no-caps class="full-width modal-btn" color="primary" :loading="loading" icon-right="add" @click="submit"
        label="Ajouter le certificat de réalisation" />
    </template>
  </ni-modal>
</template>

<script>
import { computed, toRefs } from 'vue';
import Select from '@components/form/Select';
import Modal from '@components/modal/Modal';
import { formatAndSortIdentityOptions } from '@helpers/utils';

export default {
  name: 'CompletionCertificateAdditionModal',
  components: {
    'ni-modal': Modal,
    'ni-select': Select,
  },
  props: {
    newCompletionCertificate: { type: Object, default: () => ({}) },
    course: { type: Object, default: () => ({}) },
    validations: { type: Object, default: () => ({}) },
    monthOptions: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
  },
  emits: ['update:new-completion-certificate', 'submit'],
  setup (props, { emit }) {
    const { newCompletionCertificate, course } = toRefs(props);

    const traineeOptions = computed(() => formatAndSortIdentityOptions(course.value.trainees));

    const update = (event, prop) => emit(
      'update:new-completion-certificate',
      { ...newCompletionCertificate.value, [prop]: event }
    );

    const submit = () => emit('submit');

    return {
      // Computed
      traineeOptions,
      // Methods
      update,
      submit,
    };
  },
};
</script>
