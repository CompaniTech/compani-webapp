<template>
  <ni-modal :model-value="modelValue" @update:model-value="input" @hide="hide">
    <template #title>
        Créer une nouvelle <span class="text-weight-bold">formation</span>
      </template>
      <ni-option-group :model-value="newCourse.type" @update:model-value="updateType($event)" type="radio"
        caption="Type" required-field inline :error="validations.type.$error" :options="courseTypes" />
      <ni-select in-modal :model-value="newCourse.operationsRepresentative" caption="Chargé(e) des opérations"
        @update:model-value="update($event, 'operationsRepresentative')" :options="adminUserOptions"
        @blur="validations.operationsRepresentative.$touch" :error="validations.operationsRepresentative.$error"
        required-field />
      <ni-select in-modal :model-value="newCourse.program" @update:model-value="update($event, 'program')"
        @blur="validations.program.$touch" required-field caption="Programme" :error="validations.program.$error"
        :options="programOptions" />
      <ni-select in-modal :model-value="newCourse.subProgram" @update:model-value="update($event, 'subProgram')"
        @blur="validations.subProgram.$touch" required-field caption="Sous-programme" :options="subProgramOptions"
        :disable="disableSubProgram" :error="validations.subProgram.$error" />
      <company-select v-if="isIntraCourse || isSingleCourse" in-modal :company="newCourse.company"
        :validation="validations.company" required-field :company-options="companyOptions"
        @update="update($event, 'company')" />
      <ni-select in-modal :model-value="newCourse.salesRepresentative" caption="Chargé(e) d'accompagnement"
        @update:model-value="update($event, 'salesRepresentative')" :options="adminUserOptions" clearable />
      <ni-select v-if="isIntraHoldingCourse" in-modal :model-value="newCourse.holding"
        @blur="validations.holding.$touch" required-field caption="Société mère" :options="holdingOptions"
        :error="validations.holding.$error" @update:model-value="update($event, 'holding')" />
      <ni-date-input caption="Date de démarrage souhaitée" :model-value="newCourse.estimatedStartDate" in-modal
        @update:model-value="update($event, 'estimatedStartDate')" />
      <ni-input v-if="isIntraCourse || isIntraHoldingCourse" in-modal required-field type="number"
        caption="Nombre d'inscrits max" :model-value="newCourse.maxTrainees" @blur="validations.maxTrainees.$touch"
        :error="validations.maxTrainees.$error" :error-message="maxTraineesErrorMessage"
        @update:model-value="update($event, 'maxTrainees')" />
      <ni-select v-if="isSingleCourse" in-modal caption="Apprenant" :model-value="newCourse.trainee"
        @update:model-value="update($event, 'trainee')" required-field :options="traineeOptions" />
      <ni-input v-if="isIntraCourse || isSingleCourse" :model-value="newCourse.expectedBillsCount" type="number"
        @update:model-value="update($event, 'expectedBillsCount')" caption="Nombre de factures" in-modal
        :error="validations.expectedBillsCount.$error" :error-message="expectedBillsCountErrorMessage"
        @blur="validations.expectedBillsCount.$touch" required-field />
      <ni-select :model-value="newCourse.certificateGenerationMode" caption="Mode de génération des certificats"
        @update:model-value="update($event, 'certificateGenerationMode')" :options="CERTIFICATE_GENERATION_MODE"
        :error="validations.certificateGenerationMode.$error" required-field />
      <ni-input in-modal :model-value="newCourse.misc" @update:model-value="update($event.trim(), 'misc')"
        caption="Informations Complémentaires" />
      <q-checkbox in-modal :model-value="newCourse.hasCertifyingTest" label="La formation est certifiante" dense
        @update:model-value="update($event, 'hasCertifyingTest')" class="q-mb-lg" />
      <template #footer>
        <q-btn no-caps class="full-width modal-btn" label="Créer la formation" color="primary" :loading="loading"
          icon-right="add" @click="submit" />
      </template>
    </ni-modal>
</template>

<script>
import { ref, computed, toRefs, watch } from 'vue';
import get from 'lodash/get';
import omit from 'lodash/omit';
import Modal from '@components/modal/Modal';
import Select from '@components/form/Select';
import CompanySelect from '@components/form/CompanySelect';
import DateInput from '@components/form/DateInput';
import OptionGroup from '@components/form/OptionGroup';
import Input from '@components/form/Input';
<<<<<<< HEAD
import {
  COURSE_TYPES,
  REQUIRED_LABEL,
  INTRA,
  INTRA_HOLDING,
  PUBLISHED,
  CERTIFICATE_GENERATION_MODE,
} from '@data/constants';
=======
import { COURSE_TYPES, REQUIRED_LABEL, INTRA, INTRA_HOLDING, PUBLISHED, SINGLE } from '@data/constants';
>>>>>>> 98dccf67c (COM-3917: wip)
import { formatAndSortOptions, formatAndSortCompanyOptions } from '@helpers/utils';

export default {
  name: 'CourseCreationModal',
  props: {
    modelValue: { type: Boolean, default: false },
    newCourse: { type: Object, default: () => ({}) },
    programs: { type: Array, default: () => [] },
    companies: { type: Array, default: () => [] },
    holdingOptions: { type: Array, default: () => [] },
    adminUserOptions: { type: Array, default: () => [] },
    validations: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
    traineeOptions: { type: Array, default: () => [] },
  },
  components: {
    'ni-option-group': OptionGroup,
    'ni-modal': Modal,
    'ni-select': Select,
    'company-select': CompanySelect,
    'ni-input': Input,
    'ni-date-input': DateInput,
  },
  emits: ['hide', 'update:model-value', 'submit', 'update:new-course'],
  setup (props, { emit }) {
    const { programs, validations, newCourse, companies } = toRefs(props);

    const courseTypes = COURSE_TYPES;
    const subProgramOptions = ref([]);
    const disableSubProgram = ref(false);

    const programOptions = computed(() => programs.value
      .map((p) => {
        const blendedPublishedSubPrograms = p.subPrograms
          .filter(sp => !sp.isStrictlyELearning && sp.status === PUBLISHED);

        return {
          label: p.name,
          value: p._id,
          disable: !blendedPublishedSubPrograms.length,
          blendedPublishedSubPrograms,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label)));

    const maxTraineesErrorMessage = computed(() => {
      if (get(validations.value, 'maxTrainees.required.$response') === false) return REQUIRED_LABEL;
      if (get(validations.value, 'maxTrainees.strictPositiveNumber.$response') === false ||
        get(validations.value, 'maxTrainees.integerNumber.$response') === false) {
        return 'Nombre non valide';
      }
      return '';
    });

    const expectedBillsCountErrorMessage = computed(() => {
      if (validations.value.expectedBillsCount.required.$response === false) return REQUIRED_LABEL;
      return 'Nombre non valide';
    });

    const isIntraCourse = computed(() => newCourse.value.type === INTRA);

    const isIntraHoldingCourse = computed(() => newCourse.value.type === INTRA_HOLDING);

    const isSingleCourse = computed(() => newCourse.value.type === SINGLE);

    const companyOptions = computed(() => formatAndSortCompanyOptions(companies.value));

    const hide = () => emit('hide');

    const input = event => emit('update:model-value', event);

    const submit = () => emit('submit');

    const updateType = (event) => {
      emit(
        'update:new-course',
        {
          ...omit(newCourse.value, ['company', 'holding', 'maxTrainees', 'expectedBillsCount']),
          ...(event === INTRA && { maxTrainees: '8', expectedBillsCount: '0' }),
          ...(event === INTRA_HOLDING && { maxTrainees: '8' }),
          ...(event === SINGLE && { maxTrainees: '1', expectedBillCount: '0' }),
          type: event,
        }
      );
    };

    const update = (event, prop) => emit('update:new-course', { ...newCourse.value, [prop]: event });

    watch(
      () => newCourse.value.program,
      (value) => {
        const selectedProgram = programOptions.value.find(p => p.value === value);
        if (selectedProgram) {
          const { blendedPublishedSubPrograms } = selectedProgram;

          subProgramOptions.value = formatAndSortOptions(blendedPublishedSubPrograms, 'name');
          disableSubProgram.value = !subProgramOptions.value.length;

          if (subProgramOptions.value.length === 1) update(subProgramOptions.value[0].value, 'subProgram');
          else update('', 'subProgram');
        }
      }
    );

    watch(
      () => newCourse.value.company,
      (companyId) => {
        const selectedCompany = companies.value.find(c => c._id === companyId);

        const value = get(selectedCompany, 'salesRepresentative') || '';
        update(value, 'salesRepresentative');
      }
    );

    // watch(
    //   () => newCourse.value.trainee,
    //   (traineeId) => {
    //     const selectedTrainee = traineeOptions.value.find(t => t._id === traineeId);

    //     const value = get(selectedTrainee, 'company') || '';
    //     update(value, 'company');
    //   }
    // );

    return {
      // Data
      courseTypes,
      CERTIFICATE_GENERATION_MODE,
      subProgramOptions,
      disableSubProgram,
      // Computed
      programOptions,
      maxTraineesErrorMessage,
      expectedBillsCountErrorMessage,
      isIntraCourse,
      isIntraHoldingCourse,
      companyOptions,
      isSingleCourse,
      // Methods
      hide,
      input,
      submit,
      updateType,
      update,
    };
  },
};
</script>
