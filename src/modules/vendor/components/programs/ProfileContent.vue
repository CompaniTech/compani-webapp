<template>
  <div v-if="program">
    <div v-for="(subProgram, index) of program.subPrograms" class="q-mb-xl sub-program-container" :key="index">
      <div class="flex align-center justify-between">
        <div class="align-items-center">
          <span class="text-weight-bold">Sous-programme {{ index + 1 }}</span>
          <span class="published-sub-program bg-green-600" v-if="isPublished(subProgram)">Publié</span>
        </div>
        <div v-if="subProgram.status === PUBLISHED" class="row">
          <ni-secondary-button class="q-mr-md" label="Editer les tarifs"
            @click="openPriceVersionCreationModal(subProgram)" />
          <ni-bi-color-button class="button-history" icon="history" label="Historique"
            @click="openHistoryModal(subProgram)" />
        </div>
      </div>
      <ni-input v-model.trim="program.subPrograms[index].name" required-field caption="Nom" @focus="saveTmpName(index)"
        @blur="updateSubProgramName(index)" :error="getSubProgramError(index)"
        :disable="isPublished(subProgram)" />
      <draggable v-model="subProgram.steps" @change="dropStep(subProgram._id)" ghost-class="ghost"
        :disabled="$q.platform.is.mobile || isPublished(subProgram)" item-key="_id">
        <template #item="{element: step, index: stepIndex}">
          <q-card flat class="step q-mb-sm">
            <q-card-section :id="step._id" :class="{ 'step-lock': isLocked(step), 'step-head row': true,
              'cursor-pointer': step.type === E_LEARNING }">
              <div class="step-info" @click="showActivities(step._id, step.type)">
                <q-item-section side>
                  <q-icon :name="getStepTypeIcon(step.type)" size="sm" color="copper-grey-500" />
                </q-item-section>
                <q-item-section>
                  <div class="flex-direction row step-title">
                    <div class="text-weight-bold">
                      <span>{{ stepIndex + 1 }} - {{ step.name }}</span>
                      <ni-button v-if="isLocked(step)" icon="lock" class="q-ml-sm q-px-xs" size="sm"
                        @click="openValidateUnlockingEditionModal(step)" />
                    </div>
                    <published-dot :is-published="isPublished(step)" :status="isStepValid(step)" />
                  </div>
                  <div class="step-subtitle">{{ getStepSubTitle(step) }}</div>
                </q-item-section>
              </div>
              <div class="flex align-center">
                <ni-button icon="edit" @click="openStepEditionModal(step)" />
                <ni-button icon="close" @click="validateStepDetachment(subProgram._id, step._id)"
                  :disable="isPublished(subProgram)" />
              </div>
            </q-card-section>
            <div class="bg-peach-200 activity-container" v-if="areActivitiesVisible[step._id]">
              <draggable v-model="step.activities" :disabled="$q.platform.is.mobile || isPublishedOrLocked(step)"
                class="activity-draggable" ghost-class="ghost" @change="dropActivity(subProgram._id, step._id)"
                item-key="_id">
                <template #item="{element: activity }">
                  <q-card flat class="activity">
                    <q-card-section :class="{ 'step-lock': isLocked(step) }">
                      <div class="cursor-pointer row activity-info"
                        @click="goToActivityProfile(subProgram, step, activity)">
                        <div class="col-xs-8 col-sm-5">{{ activity.name }}</div>
                        <div class="gt-xs col-sm-2 activity-content">{{ getActivityTypeLabel(activity.type) }}</div>
                        <div class="gt-xs col-sm-2 activity-content">
                          {{ formatQuantity('carte', activity.cards.length) }}
                        </div>
                        <published-dot :is-published="isPublished(activity)"
                          :status="activity.areCardsValid ? PUBLISHED_DOT_ACTIVE : PUBLISHED_DOT_WARNING" />
                      </div>
                      <div class="row no-wrap">
                        <ni-button class="q-px-sm" icon="close" :disable="isPublished(step)"
                          @click="validateActivityDeletion(step, activity._id)" />
                      </div>
                    </q-card-section>
                  </q-card>
                </template>
              </draggable>
              <div v-if="!isPublished(step)" class="q-mt-md" align="right">
                <ni-button color="primary" icon="add" label="Réutiliser une activité" :disable="isLocked(step)"
                  @click="openActivityReuseModal(step)" />
                <ni-button color="primary" icon="add" label="Créer une activité" :disable="isLocked(step)"
                  @click="openActivityCreationModal(step._id)" />
              </div>
              <div class="no-activity" v-if="isPublished(step) && !step.activities.length">
                Il n'y a pas d'activité
              </div>
            </div>
          </q-card>
        </template>
      </draggable>
      <div class="q-my-md sub-program-footer">
        <ni-button v-if="!isPublished(subProgram)" color="primary" label="Publier" icon="vertical_align_top"
          @click="checkPublicationAndOpenModal(subProgram)" :flat="false" />
        <ni-button v-if="!isPublished(subProgram)" class="add-step-button" color="primary" icon="add"
          @click="openStepAdditionModal(subProgram._id)" label="Ajouter une étape" />
      </div>
      <q-separator v-if="index !== program.subPrograms.length-1" class="q-mt-lg" />
    </div>

    <q-btn class="fixed fab-custom" no-caps rounded color="primary" icon="add" label="Ajouter un sous programme"
      @click="subProgramCreationModal = true" />

    <sub-program-creation-modal v-model="subProgramCreationModal" :loading="modalLoading" @submit="createSubProgram"
      :validations="newSubProgramValidations" @hide="resetSubProgramCreationModal"
      v-model:new-sub-program="newSubProgram" />

    <step-addition-modal v-model="stepAdditionModal" v-model:new-step="newStep" v-model:reused-step="reusedStep"
      @hide="resetStepAdditionModal" @submit="addStep" :loading="modalLoading" v-model:addition-type="additionType"
      :program="program" :validations="newStepValidations" :sub-program-id="currentSubProgramId" />

    <step-edition-modal v-model="stepEditionModal" v-model:edited-step="editedStep" :validations="editedStepValidations"
      @hide="resetStepEditionModal" @submit="editStep" :loading="modalLoading" />

    <activity-creation-modal v-model="activityCreationModal" v-model:new-activity="newActivity" :loading="modalLoading"
      @hide="resetActivityCreationModal" @submit="createActivity" :validations="newActivityValidations" />

    <activity-reuse-modal v-model="activityReuseModal" @submit-reuse="reuseActivity" :program-options="programOptions"
      :loading="modalLoading" :validations="reusedActivityValidations" :same-step-activities="sameStepActivities"
      v-model:reused-activity="reusedActivity" @hide="resetActivityReuseModal"
      @submit-duplication="duplicateActivity" />

    <sub-program-publication-modal v-model="subProgramPublicationModal" @submit="validateSubProgramPublication"
      :company-options="companyOptions" @hide="resetPublication" />

    <validate-unlocking-step-modal :model-value="validateUnlockingEditionModal" @cancel="cancelUnlocking"
      :sub-programs-grouped-by-program="subProgramsReusingStepToBeUnlocked" @hide="resetValidateUnlockingEditionModal"
      @confirm="confirmUnlocking" :is-step-published="stepToBeUnlocked.status === PUBLISHED" />

    <sub-program-price-version-creation-modal v-model="subProgramPriceVersionCreationModal"
      :validations="v$.newSubProgramPriceVersion" v-model:new-sub-program-price-version="newSubProgramPriceVersion"
      @submit="addSubProgramPriceVersion" @hide="resetSubProgramPriceVersionCreationModal" :loading="modalLoading" />

    <sub-program-price-version-history-modal v-model="subProgramPriceVersionHistoryModal"
      :sub-program="selectedSubProgram" />
  </div>
</template>

<script>
import { useStore } from 'vuex';
import { ref, computed, toRefs } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import draggable from 'vuedraggable';
import useVuelidate from '@vuelidate/core';
import { required, helpers } from '@vuelidate/validators';
import { strictPositiveNumber } from '@helpers/vuelidateCustomVal';
import get from 'lodash/get';
import omit from 'lodash/omit';
import SubPrograms from '@api/SubPrograms';
import Steps from '@api/Steps';
import Input from '@components/form/Input';
import { NotifyNegative, NotifyWarning, NotifyPositive } from '@components/popup/notify';
import Button from '@components/Button';
import SecondaryButton from '@components/SecondaryButton';
import BiColorButton from '@components/BiColorButton';
import {
  ACTIVITY_TYPES,
  PUBLISHED,
  PUBLISHED_DOT_ACTIVE,
  PUBLISHED_DOT_WARNING,
  E_LEARNING,
  LONG_DURATION_H_MM,
  PT0S,
} from '@data/constants';
import { getStepTypeLabel, getStepTypeIcon } from '@helpers/courses';
import { formatQuantity } from '@helpers/utils';
import CompaniDuration from '@helpers/dates/companiDurations';
import SubProgramCreationModal from 'src/modules/vendor/components/programs/SubProgramCreationModal';
import SubProgramPriceVersionCreationModal from
  'src/modules/vendor/components/programs/SubProgramPriceVersionCreationModal';
import SubProgramPriceVersionHistoryModal from
  'src/modules/vendor/components/programs/SubProgramPriceVersionHistoryModal';
import StepAdditionModal from 'src/modules/vendor/components/programs/StepAdditionModal';
import StepEditionModal from 'src/modules/vendor/components/programs/StepEditionModal';
import ActivityCreationModal from 'src/modules/vendor/components/programs/ActivityCreationModal';
import ActivityReuseModal from 'src/modules/vendor/components/programs/ActivityReuseModal';
import SubProgramPublicationModal from 'src/modules/vendor/components/programs/SubProgramPublicationModal';
import ValidateUnlockingStepModal from 'src/modules/vendor/components/programs/ValidateUnlockingStepModal';
import PublishedDot from 'src/modules/vendor/components/programs/PublishedDot';
import { useSubProgramCreationModal } from 'src/modules/vendor/composables/SubProgramCreationModal';
import { useSubProgramPublicationModal } from 'src/modules/vendor/composables/SubProgramPublicationModal';
import { useStepAdditionModal } from 'src/modules/vendor/composables/StepAdditionModal';
import { useStepEditionModal } from 'src/modules/vendor/composables/StepEditionModal';
import { useActivityCreationModal } from 'src/modules/vendor/composables/ActivityCreationModal';
import { useActivityReuseModal } from 'src/modules/vendor/composables/ActivityReuseModal';
import { useValidateUnlockingStepModal } from 'src/modules/vendor/composables/ValidateUnlockingStepModal';

export default {
  name: 'ProfileContent',
  props: {
    profileId: { type: String, required: true },
  },
  components: {
    'ni-input': Input,
    'ni-button': Button,
    'sub-program-creation-modal': SubProgramCreationModal,
    'step-addition-modal': StepAdditionModal,
    'step-edition-modal': StepEditionModal,
    'activity-creation-modal': ActivityCreationModal,
    'activity-reuse-modal': ActivityReuseModal,
    'sub-program-publication-modal': SubProgramPublicationModal,
    'validate-unlocking-step-modal': ValidateUnlockingStepModal,
    draggable,
    'published-dot': PublishedDot,
    'ni-secondary-button': SecondaryButton,
    'ni-bi-color-button': BiColorButton,
    'sub-program-price-version-creation-modal': SubProgramPriceVersionCreationModal,
    'sub-program-price-version-history-modal': SubProgramPriceVersionHistoryModal,
  },
  setup (props) {
    const { profileId } = toRefs(props);
    const $router = useRouter();
    const $store = useStore();
    const $q = useQuasar();

    const areActivitiesVisible = ref({});
    const tmpInput = ref('');
    const modalLoading = ref(false);
    const areStepsLocked = ref({});
    const currentStepId = ref('');
    const newSubProgramPriceVersion = ref({ prices: [], subProgram: {}, effectiveDate: '' });
    const subProgramPriceVersionCreationModal = ref(false);
    const subProgramPriceVersionHistoryModal = ref(false);
    const selectedSubProgram = ref({});

    // SubProgram Creation
    const refreshProgram = async () => {
      try {
        await $store.dispatch('program/fetchProgram', { programId: profileId.value });
      } catch (e) {
        console.error(e);
      }
    };

    const {
      newSubProgram,
      subProgramCreationModal,
      v$: newSubProgramValidations,
      createSubProgram,
      resetSubProgramCreationModal,
    } = useSubProgramCreationModal(profileId, modalLoading, refreshProgram);

    // SubProgram publication
    const program = computed(() => $store.state.program.program);

    const {
      subProgramPublicationModal,
      companyOptions,
      validateSubProgramPublication,
      checkPublicationAndOpenModal,
      resetPublication,
    } = useSubProgramPublicationModal(program, refreshProgram);

    const rules = computed(() => ({
      program: { subPrograms: { $each: helpers.forEach({ name: { required } }) } },
      newSubProgramPriceVersion: {
        prices: { $each: helpers.forEach({ step: { required }, hourlyAmount: { required, strictPositiveNumber } }) },
        effectiveDate: { required },
      },
    }));

    const v$ = useVuelidate(rules, { program, newSubProgramPriceVersion });

    // SubProgram price version creation
    const openPriceVersionCreationModal = (subProgram) => {
      const steps = subProgram.steps.filter(s => s.type !== E_LEARNING);

      newSubProgramPriceVersion.value = {
        ...newSubProgramPriceVersion.value,
        subProgram: { _id: subProgram._id, steps },
        prices: steps.map(s => ({ step: s._id, hourlyAmount: null })),
      };
      subProgramPriceVersionCreationModal.value = true;
    };

    const resetSubProgramPriceVersionCreationModal = () => {
      newSubProgramPriceVersion.value = { prices: [], subProgram: {}, effectiveDate: '' };
      v$.value.newSubProgramPriceVersion.$reset();
    };

    const addSubProgramPriceVersion = async (subProgramId) => {
      try {
        modalLoading.value = true;
        v$.value.newSubProgramPriceVersion.$touch();
        if (v$.value.newSubProgramPriceVersion.$error) return NotifyWarning('Champ(s) invalide(s).');

        await SubPrograms.update(subProgramId, { ...omit(newSubProgramPriceVersion.value, ['subProgram']) });
        subProgramPriceVersionCreationModal.value = false;
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de l\'édition des tarifs horaires du sous-programme.');
      } finally {
        await refreshProgram();
        modalLoading.value = false;
      }
    };

    // SubProgram price version history
    const openHistoryModal = (subProgram) => {
      selectedSubProgram.value = subProgram;
      subProgramPriceVersionHistoryModal.value = true;
    };

    // Unlocking step validation
    const isLocked = step => areStepsLocked.value[step._id];

    const setStepLocking = (step, value) => {
      Object.assign(areStepsLocked.value, { [step._id]: value });
    };

    const openNextModalAfterUnlocking = ref(() => ref(null));

    const {
      stepToBeUnlocked,
      subProgramsReusingStepToBeUnlocked,
      validateUnlockingEditionModal,
      resetValidateUnlockingEditionModal,
      openValidateUnlockingEditionModal,
      confirmUnlocking,
      cancelUnlocking,
    } = useValidateUnlockingStepModal(openNextModalAfterUnlocking, setStepLocking, isLocked);

    // Step edition
    const {
      editedStep,
      stepEditionModal,
      openStepEditionModal,
      editStep,
      resetStepEditionModal,
      v$: editedStepValidations,
    } = useStepEditionModal(
      isLocked,
      openValidateUnlockingEditionModal,
      refreshProgram,
      modalLoading,
      openNextModalAfterUnlocking
    );

    // Step addition
    const {
      currentSubProgramId,
      additionType,
      stepAdditionModal,
      newStep,
      reusedStep,
      openStepAdditionModal,
      addStep,
      resetStepAdditionModal,
      v$: newStepValidations,
    } = useStepAdditionModal(setStepLocking, modalLoading, refreshProgram);

    // Activity creation
    const {
      newActivity,
      activityCreationModal,
      v$: newActivityValidations,
      openActivityCreationModal,
      createActivity,
      resetActivityCreationModal,
    } = useActivityCreationModal(modalLoading, refreshProgram, currentStepId);

    // Activity reuse
    const {
      activityReuseModal,
      sameStepActivities,
      reusedActivity,
      programOptions,
      v$: reusedActivityValidations,
      openActivityReuseModal,
      refreshProgramList,
      reuseActivity,
      duplicateActivity,
      resetActivityReuseModal,
    } = useActivityReuseModal(modalLoading, refreshProgram, currentStepId);

    const openedStep = computed(() => $store.state.program.openedStep);

    const getSubProgramError = (index) => {
      const validation = v$.value.program.subPrograms.$each.$response.$errors[index];

      return get(validation, 'name.0.$response') === false;
    };

    const dropStep = async (subProgramId) => {
      try {
        const subProgram = program.value.subPrograms.find(sp => sp._id === subProgramId);
        const steps = subProgram.steps.map(s => s._id);
        await SubPrograms.update(subProgramId, { steps });

        NotifyPositive('Modification enregistrée.');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la modification des étapes.');
      } finally {
        await refreshProgram();
      }
    };

    const dropActivity = async (subProgramId, stepId) => {
      try {
        const subProgram = program.value.subPrograms.find(sp => sp._id === subProgramId);
        const step = subProgram.steps.find(s => s._id === stepId);
        const activities = step.activities.map(a => a._id);
        await Steps.updateById(stepId, { activities });

        NotifyPositive('Modification enregistrée.');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la modification des activités.');
      } finally {
        await refreshProgram();
      }
    };

    const saveTmpName = (index) => {
      tmpInput.value = program.value.subPrograms[index] ? program.value.subPrograms[index].name : '';
    };

    const getActivityTypeLabel = (value) => {
      const type = ACTIVITY_TYPES.find(t => t.value === value);
      return type ? type.label : '';
    };
    const showActivities = (stepId, stepType) => {
      if (stepType !== E_LEARNING) return null;
      areActivitiesVisible.value[stepId] = !areActivitiesVisible.value[stepId];
    };

    // SUB-PROGRAM
    const updateSubProgramName = async (index) => {
      try {
        const subProgramName = get(program.value.subPrograms[index], 'name');
        const subProgramId = get(program.value.subPrograms[index], '_id');

        if (tmpInput.value === subProgramName) return;
        v$.value.program.$touch();
        if (v$.value.program.$error) return NotifyWarning('Champ(s) invalide(s)');

        await SubPrograms.update(subProgramId, { name: subProgramName });
        NotifyPositive('Modification enregistrée.');

        await refreshProgram();
      } catch (e) {
        console.error(e);
        if (e.message === 'Champ(s) invalide(s)') return NotifyWarning(e.message);
        NotifyNegative('Erreur lors de la modification du sous-programme.');
      } finally {
        tmpInput.value = null;
      }
    };

    // ACTIVITY
    const goToActivityProfile = (subProgram, step, activity) => {
      $router.push({
        name: 'ni pedagogy activity info',
        params: {
          programId: program.value._id,
          subProgramId: subProgram._id,
          stepId: step._id,
          activityId: activity._id,
        },
      });
    };

    const validateStepDetachment = (subProgramId, stepId) => {
      $q.dialog({
        title: 'Confirmation',
        message: 'Êtes-vous sûr(e) de vouloir retirer cette étape de ce sous-programme&nbsp;?',
        html: true,
        ok: true,
        cancel: 'Annuler',
      }).onOk(() => detachStep(subProgramId, stepId))
        .onCancel(() => NotifyPositive('Retrait annulé.'));
    };

    const detachStep = async (subProgramId, stepId) => {
      try {
        await SubPrograms.detachStep(subProgramId, stepId);
        await refreshProgram();
        NotifyPositive('Étape retirée.');
      } catch (e) {
        console.error(e);
        if (e.status === 409) {
          return NotifyWarning('Certains créneaux de formation sont encore rattachés à cette étape.');
        }
        return NotifyNegative('Erreur lors du retrait de l\'étape.');
      }
    };

    const validateActivityDeletion = (step, activityId) => {
      if (isLocked(step)) {
        openNextModalAfterUnlocking.value = () => validateActivityDeletion(step, activityId);
        openValidateUnlockingEditionModal(step);
      } else {
        $q.dialog({
          title: 'Confirmation',
          message: 'Êtes-vous sûr(e) de vouloir retirer cette activité de cette étape&nbsp;?',
          html: true,
          ok: true,
          cancel: 'Annuler',
        }).onOk(() => detachActivity(step._id, activityId))
          .onCancel(() => NotifyPositive('Retrait annulé.'));
      }
    };

    const detachActivity = async (stepId, activityId) => {
      try {
        await Steps.detachActivity(stepId, activityId);
        await refreshProgram();
        NotifyPositive('Activité détachée');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors du retrait de l\'activité.');
      }
    };

    const scrollToOpenedStep = (step) => {
      const el = document.getElementById(step);
      el.scrollIntoView({ behavior: 'smooth' });
    };

    const isPublished = element => element.status === PUBLISHED;

    const isPublishedOrLocked = step => isPublished(step) || isLocked(step);

    const isReused = step => step.subPrograms && step.subPrograms.length > 1;

    const initAreStepsLocked = () => {
      const steps = program.value.subPrograms
        .map(sp => sp.steps.map(step => ({ [step._id]: isReused(step) })))
        .flat();
      areStepsLocked.value = steps.length ? Object.assign(...steps) : {};
    };

    const isStepValid = step => (
      step.areActivitiesValid && !!step.theoreticalDuration
        ? PUBLISHED_DOT_ACTIVE
        : PUBLISHED_DOT_WARNING
    );

    const getStepSubTitle = step => `${getStepTypeLabel(step.type)}
      ${step.type === E_LEARNING ? `- ${formatQuantity('activité', step.activities.length)}` : ''} - 
      ${CompaniDuration(step.theoreticalDuration || PT0S).format(LONG_DURATION_H_MM)}`;

    const created = async () => {
      if (!program.value) await refreshProgram();
      await refreshProgramList();
      await initAreStepsLocked();

      if (openedStep.value) {
        showActivities(openedStep.value, E_LEARNING);
        scrollToOpenedStep(openedStep.value);
        $store.dispatch('program/resetOpenedStep');
      }
    };

    created();

    return {
      // Data
      PUBLISHED,
      PUBLISHED_DOT_ACTIVE,
      PUBLISHED_DOT_WARNING,
      E_LEARNING,
      LONG_DURATION_H_MM,
      PT0S,
      modalLoading,
      subProgramCreationModal,
      newSubProgram,
      additionType,
      stepAdditionModal,
      newStep,
      reusedStep,
      stepEditionModal,
      editedStep,
      activityCreationModal,
      newActivity,
      activityReuseModal,
      sameStepActivities,
      reusedActivity,
      programOptions,
      areActivitiesVisible,
      currentSubProgramId,
      subProgramPublicationModal,
      companyOptions,
      validateUnlockingEditionModal,
      subProgramsReusingStepToBeUnlocked,
      stepToBeUnlocked,
      subProgramPriceVersionCreationModal,
      newSubProgramPriceVersion,
      subProgramPriceVersionHistoryModal,
      selectedSubProgram,
      // Computed
      v$,
      newStepValidations,
      newSubProgramValidations,
      newActivityValidations,
      editedStepValidations,
      reusedActivityValidations,
      program,
      // Methods
      formatQuantity,
      getSubProgramError,
      dropStep,
      dropActivity,
      saveTmpName,
      getActivityTypeLabel,
      showActivities,
      updateSubProgramName,
      createSubProgram,
      resetSubProgramCreationModal,
      openStepAdditionModal,
      addStep,
      resetStepAdditionModal,
      openStepEditionModal,
      editStep,
      resetStepEditionModal,
      goToActivityProfile,
      openActivityCreationModal,
      createActivity,
      resetActivityCreationModal,
      openActivityReuseModal,
      reuseActivity,
      duplicateActivity,
      resetActivityReuseModal,
      validateStepDetachment,
      validateActivityDeletion,
      checkPublicationAndOpenModal,
      validateSubProgramPublication,
      isPublished,
      isLocked,
      isPublishedOrLocked,
      resetPublication,
      resetValidateUnlockingEditionModal,
      openValidateUnlockingEditionModal,
      confirmUnlocking,
      cancelUnlocking,
      isStepValid,
      getStepTypeLabel,
      getStepTypeIcon,
      CompaniDuration,
      getStepSubTitle,
      openPriceVersionCreationModal,
      resetSubProgramPriceVersionCreationModal,
      addSubProgramPriceVersion,
      openHistoryModal,
    };
  },
};
</script>

<style lang="sass" scoped>
.sub-program-container
  display: flex
  flex-direction: column

.sub-program-footer
  display: flex
  justify-content: space-between

.published-sub-program
  font-size: 14px
  border-radius: 15px
  padding: 1px 6px
  color: white
  margin-left: 10px

.step
  border-radius: 0
  &-head
    justify-content: space-between
    .step-info
      display: flex
      flex: 1
  &-subtitle
    font-size: 13px
  &-lock
    background-color: $copper-grey-100
  &-title
    min-height: 28px

.add-step-button
  align-self: flex-end

.activity-container
  display: flex
  flex-direction: column
  align-items: flex-end

.activity-draggable
  width: -moz-available
  width: -webkit-fill-available

.activity
  margin: 8px 8px 8px 48px
  border-radius: 0
  &-info
    flex: 1
    align-items: center
  .q-card__section
    display: flex
    justify-content: space-between
    align-items: center
  .q-card__section--vert
    padding: 3px 3px 3px 10px
  .activity-content
    font-size: 12px
.q-btn
    width: fit-content

.q-card
  .q-card__section
    .q-item__section--side
      padding-right: 10px

.no-activity
  color: $copper-grey-700
  font-size: 14px
  margin: 10px

.ghost
  opacity: 0.5
</style>
