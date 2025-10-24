<template>
  <div v-if="isVendorInterface || !!trainingContracts.length"
    class="q-mb-xl">
    <p class="text-weight-bold">Convention de formation</p>
    <div class="q-mb-sm">
      <div v-if="isVendorInterface">
        <ni-banner v-if="missingInfos.length && !areAllTrainingContractsUploaded">
          <template #message>
            Il manque {{ formatQuantity('information', missingInfos.length ) }} pour générer la convention de
            formation : {{ missingInfos.join(', ') }}.
          </template>
        </ni-banner>
        <template v-if="isIntraCourse">
          <ni-bi-color-button v-if="!trainingContracts.length" icon="file_download" :disable="disableGenerationButton"
            label="Générer la convention de formation" @click="trainingContractGenerationModal = true" size="16px" />
        </template>
      </div>
      <template v-if="!isIntraCourse && (isVendorInterface || hasHoldingRole)">
        <q-card>
          <training-contract-table v-if="trainingContracts.length" @delete="validateDocumentDeletion"
            :is-archived="!!course.archivedAt" :training-contracts="trainingContracts" :company-options="companyOptions"
            :show-delete-button="isVendorInterface" :loading="trainingContractTableLoading" />
          <div v-else class="text-center text-italic text-14 q-pa-sm">Aucune convention de formation téléversées</div>
          <q-card-actions v-if="isVendorInterface" align="right" class="q-pa-sm">
            <ni-button color="primary" icon="file_download" :disable="disableGenerationButton"
              label="Générer une convention" @click="trainingContractGenerationModal = true" />
            <ni-button label="Téléverser une convention" @click="trainingContractCreationModal = true" color="primary"
              icon="add" :disable="disableUploadButton" />
          </q-card-actions>
        </q-card>
      </template>
      <div v-else class="q-mt-md row">
        <ni-file-uploader caption="Convention de formation signée" :extensions="extensions" :url="url"
          :custom-fields="customFields" :entity="trainingContracts[0]" path="file" :disable="!!course.archivedAt"
          @uploaded="uploaded" hide-image :can-delete="isVendorInterface"
          :no-link-in-file="trainingContracts[0] && !get(trainingContracts[0], 'file.link')"
          @delete="validateDocumentDeletion(trainingContracts[0]._id)" />
      </div>
    </div>
  </div>

  <training-contract-generation-modal v-model="trainingContractGenerationModal" :company-options="companyOptions"
    v-model:new-generated-training-contract-infos="newGeneratedTrainingContractInfos" :is-intra-course="isIntraCourse"
    @submit="openTrainingContractInfosModal" @hide="resetGeneratedTrainingContractInfos" :error-message="errorMessage"
    :validations="validations.newGeneratedTrainingContractInfos" :is-inter-course="isInterCourse"
    :course="course" />

  <training-contract-infos-modal v-model="trainingContractInfosModal" :course="course"
    @submit="generateTrainingContract" :loading="pdfLoading" @hide="resetGeneratedTrainingContractInfos"
    :new-generated-training-contract-infos="newGeneratedTrainingContractInfos" :is-inter-course="isInterCourse" />

  <training-contract-creation-modal v-model="trainingContractCreationModal" :company-options="companyOptions"
    v-model:new-training-contract="newTrainingContract" @submit="createTrainingContract" :loading="pdfLoading"
    @hide="resetNewTrainingContract" :validations="validations.newTrainingContract" />
</template>

<script>
import { useQuasar } from 'quasar';
import { computed, ref, toRefs } from 'vue';
import get from 'lodash/get';
import { required } from '@vuelidate/validators';
import useVuelidate from '@vuelidate/core';
import Courses from '@api/Courses';
import TrainingContracts from '@api/TrainingContracts';
import BiColorButton from '@components/BiColorButton';
import Button from '@components/Button';
import Banner from '@components/Banner';
import FileUploader from '@components/form/FileUploader';
import TrainingContractGenerationModal from '@components/courses/TrainingContractGenerationModal';
import TrainingContractInfosModal from '@components/courses/TrainingContractInfosModal';
import TrainingContractCreationModal from '@components/courses/TrainingContractCreationModal';
import TrainingContractTable from '@components/courses/TrainingContractTable';
import { NotifyWarning, NotifyNegative, NotifyPositive } from '@components/popup/notify';
import { useCourses } from '@composables/courses';
import { REQUIRED_LABEL, ON_SITE, DOC_EXTENSIONS, E_LEARNING, IMAGE_EXTENSIONS } from '@data/constants';
import { strictPositiveNumber } from '@helpers/vuelidateCustomVal';
import { downloadFile } from '@helpers/file';
import { formatQuantity, formatDownloadName, formatAndSortOptions } from '@helpers/utils';
import { composeCourseName } from '@helpers/courses';

export default {
  name: 'TrainingContractContainer',
  props: {
    course: { type: Object, default: () => {} },
    isRofOrVendorAdmin: { type: Boolean, default: false },
    hasHoldingRole: { type: Boolean, default: false },
    trainingContractTableLoading: { type: Boolean, default: false },
    trainingContracts: { type: Array, default: () => [] },
  },
  components: {
    'ni-bi-color-button': BiColorButton,
    'ni-button': Button,
    'ni-banner': Banner,
    'training-contract-generation-modal': TrainingContractGenerationModal,
    'training-contract-infos-modal': TrainingContractInfosModal,
    'training-contract-creation-modal': TrainingContractCreationModal,
    'training-contract-table': TrainingContractTable,
    'ni-file-uploader': FileUploader,
  },
  emits: ['refresh'],
  setup (props, { emit }) {
    const { course, trainingContracts } = toRefs(props);
    const $q = useQuasar();

    const { pdfLoading, isIntraCourse, isInterCourse, isVendorInterface } = useCourses(course);

    const newGeneratedTrainingContractInfos = ref({
      price: isIntraCourse.value && get(course.value, 'prices[0].global')
        ? get(course.value, 'prices[0].global', 0) + get(course.value, 'prices[0].trainerFees', 0)
        : 0,
      company: isIntraCourse.value ? course.value.companies[0]._id : '',
    });
    const newTrainingContract = ref({ company: '' });
    const trainingContractGenerationModal = ref(false);
    const trainingContractInfosModal = ref(false);
    const trainingContractCreationModal = ref(false);
    const url = TrainingContracts.getTrainingContractUploadURL();
    const extensions = [DOC_EXTENSIONS, IMAGE_EXTENSIONS].join();

    const rules = computed(() => ({
      newGeneratedTrainingContractInfos: { price: { required, strictPositiveNumber }, company: { required } },
      newTrainingContract: { file: { required }, company: { required } },
    }));
    const validations = useVuelidate(rules, { newGeneratedTrainingContractInfos, newTrainingContract });

    const missingInfos = computed(() => {
      const infos = [];
      const onSiteSteps = course.value.subProgram.steps.filter(step => step.type === ON_SITE).map(step => step._id);
      const onSiteSlots = [...course.value.slots, ...course.value.slotsToPlan]
        .filter(slot => onSiteSteps.includes(slot.step));
      if (!get(course.value, 'trainers', []).some(t => t._id)) infos.push('l\'intervenant(e)');
      if (!course.value.slots || !course.value.slots.length) infos.push('minimum 1 créneau');
      else if (onSiteSlots.length && !onSiteSlots.some(slot => slot.address)) infos.push('mininum 1 adresse');
      if (course.value.slotsToPlan.length) {
        const theoreticalDurationList = course.value.subProgram.steps
          .filter(step => step.type !== E_LEARNING)
          .map(step => step.theoreticalDuration);
        if (theoreticalDurationList.some(duration => !duration)) infos.push('la durée théorique dans certaines étapes');
      }
      if (!course.value.companies.length) infos.push('minimum une structure');

      return infos;
    });

    const areAllTrainingContractsUploaded = computed(() => !!course.value.companies.length &&
      trainingContracts.value.length === course.value.companies.length);

    const errorMessage = computed(() => {
      const message = '';
      if (get(validations, 'value.newGeneratedTrainingContractInfos.price.required.$response') === false) {
        return REQUIRED_LABEL;
      }
      if (get(validations, 'value.newGeneratedTrainingContractInfos.price.strictPositiveNumber.$response') === false) {
        return 'Prix non valide';
      }

      return message;
    });

    const customFields = computed(() => [
      { name: 'course', value: course.value._id },
      { name: 'company', value: course.value.companies[0]._id },
    ]);

    const companyOptions = computed(() => formatAndSortOptions(course.value.companies, 'name'));

    const disableGenerationButton = computed(() => !!missingInfos.value.length || pdfLoading.value ||
      !!course.value.archivedAt);

    const disableUploadButton = computed(() => pdfLoading.value || !!course.value.archivedAt ||
      trainingContracts.value.length === course.value.companies.length);

    const resetGeneratedTrainingContractInfos = () => {
      if (!trainingContractInfosModal.value) {
        newGeneratedTrainingContractInfos.value = {
          price: isIntraCourse.value && get(course.value, 'prices[0].global')
            ? get(course.value, 'prices[0].global', 0) + get(course.value, 'prices[0].trainerFees', 0)
            : 0,
          company: isIntraCourse.value ? course.value.companies[0]._id : '',
        };
      }
      validations.value.newGeneratedTrainingContractInfos.$reset();
    };

    const resetNewTrainingContract = () => {
      newTrainingContract.value = { company: '' };
      validations.value.newTrainingContract.$reset();
    };

    const openTrainingContractInfosModal = () => {
      validations.value.newGeneratedTrainingContractInfos.$touch();
      if (validations.value.newGeneratedTrainingContractInfos.$error) return NotifyWarning('Champ(s) invalide(s)');

      const noTraineeFromCompany = !course.value.trainees
        .some(t => t.registrationCompany === newGeneratedTrainingContractInfos.value.company);
      if (!isIntraCourse.value && noTraineeFromCompany) {
        return NotifyWarning('Il n\'y a aucun(e) stagiaire rattaché(e) à la formation pour cette structure.');
      }

      trainingContractGenerationModal.value = false;
      trainingContractInfosModal.value = true;
    };

    const generateTrainingContract = async () => {
      try {
        pdfLoading.value = true;
        const pdf = await Courses.downloadTrainingContract(course.value._id, newGeneratedTrainingContractInfos.value);
        const company = course.value.companies.find(c => c._id === newGeneratedTrainingContractInfos.value.company);
        const formattedName = formatDownloadName(`convention ${company.name} ${composeCourseName(course.value)}`);
        const pdfName = `${formattedName}.pdf`;
        downloadFile(pdf, pdfName, 'application/octet-stream');
        trainingContractInfosModal.value = false;
      } catch (e) {
        console.error(e);
        if ([403, 422].includes(e.status)) {
          const { message } = JSON.parse(Buffer.from(e.data, 'utf8').toString('utf8'));
          return NotifyNegative(message);
        }
        NotifyNegative('Erreur lors de la génération de la convention.');
      } finally {
        pdfLoading.value = false;
      }
    };

    const formatPayload = () => {
      const { company, file } = newTrainingContract.value;
      const form = new FormData();
      form.append('course', course.value._id);
      form.append('file', file);
      form.append('company', company);

      return form;
    };

    const createTrainingContract = async () => {
      try {
        validations.value.newTrainingContract.$touch();
        if (validations.value.newTrainingContract.$error) return NotifyWarning('Champ(s) invalide(s)');
        pdfLoading.value = true;

        await TrainingContracts.create(formatPayload());

        trainingContractCreationModal.value = false;
        NotifyPositive('Convention de formation ajoutée.');
        emit('refresh');
      } catch (e) {
        console.error(e);
        if (e.data.statusCode === 403) return NotifyNegative(e.data.message);
        NotifyNegative('Erreur lors de l\'ajout de la convention.');
      } finally {
        pdfLoading.value = false;
      }
    };

    const validateDocumentDeletion = (trainingContractId) => {
      $q.dialog({
        title: 'Confirmation',
        message: 'Êtes-vous sûr(e) de vouloir supprimer ce document&nbsp;?',
        html: true,
        ok: true,
        cancel: 'Annuler',
      }).onOk(() => deleteDocument(trainingContractId))
        .onCancel(() => NotifyPositive('Suppression annulée.'));
    };

    const deleteDocument = async (trainingContractId) => {
      try {
        await TrainingContracts.delete(trainingContractId);

        emit('refresh');
        NotifyPositive('Document supprimé.');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la suppression du document.');
      }
    };

    const uploaded = async () => {
      try {
        NotifyPositive('Convention de formation ajoutée.');
        emit('refresh');
      } catch (error) {
        console.error(error);
      }
    };

    return {
      // Data
      newGeneratedTrainingContractInfos,
      trainingContractGenerationModal,
      trainingContractInfosModal,
      pdfLoading,
      url,
      extensions,
      newTrainingContract,
      trainingContractCreationModal,
      // Computed
      missingInfos,
      errorMessage,
      validations,
      customFields,
      companyOptions,
      isIntraCourse,
      isInterCourse,
      isVendorInterface,
      areAllTrainingContractsUploaded,
      disableGenerationButton,
      disableUploadButton,
      // Methods
      openTrainingContractInfosModal,
      resetGeneratedTrainingContractInfos,
      generateTrainingContract,
      formatQuantity,
      uploaded,
      validateDocumentDeletion,
      createTrainingContract,
      resetNewTrainingContract,
      get,
    };
  },
};
</script>
