<template>
  <div v-if="program">
    <div class="filters-container q-mb-md">
      <ni-select :options="SUBPROGRAM_STATUS_OPTIONS" v-model="selectedSubProgramStatus" />
    </div>
    <span v-if="!visibleSubPrograms.length" class="text-italic">Aucun sous-programme à afficher.</span>
    <div v-for="(subProgram, index) of program.subPrograms" class="q-mb-xl sub-program-container" :key="index"
      v-show="visibleSubPrograms.includes(subProgram)">
      <div class="align-items-center">
        <span class="text-weight-bold">Sous-programme {{ index + 1 }}</span>
        <span class="published-sub-program bg-green-600" v-if="isPublished(subProgram)">Publié</span>
        <span class="archived-sub-program bg-copper-grey-300" v-if="!!subProgram.archivedAt">Archivé</span>
        <ni-button class="q-ml-sm" :flat="false" :label="!!subProgram.archivedAt ? 'Désarchiver' : 'Archiver'"
          :disable="isArchived || modalLoading || !isPublished(subProgram)"
          @click="validateSubProgramArchive(subProgram)" />
        <ni-button class="q-ml-sm" icon="delete" @click="validateSubProgramDeletion(subProgram)"
          :disable="isPublished(subProgram) || isArchived || !!subProgram.archivedAt" />
      </div>
      <q-card v-if="subProgram.status === PUBLISHED && !subProgram.isStrictlyELearning"
        flat class="pricing-card q-my-md q-px-md bg-peach-200">
        <q-item-section @click="togglePricing(subProgram._id)" class="pricing-toggle cursor-pointer copper-grey-700">
          <span>{{ showPricing[subProgram._id] ? 'Masquer' : 'Afficher' }} les tarifs et la facturation</span>
          <q-icon size="xs" :name="showPricing[subProgram._id] ? 'expand_less' : 'expand_more'"
            color="copper-grey-700" />
        </q-item-section>
        <q-slide-transition>
          <div v-show="showPricing[subProgram._id]" class="q-pb-md" :class="$q.screen.gt.md ? 'row' : 'column'">
            <div class="col">
              <span class="text-bold">Tarification intervenants</span>
              <div class="row no-wrap q-mt-sm">
                <ni-secondary-button class="q-mr-md pricing-btn" label="Éditer les tarifs des intervenants"
                  :disable="!!subProgram.archivedAt" @click="openTrainerPriceVersionCreationModal(subProgram)" />
                <ni-bi-color-button v-if="subProgram.trainerPriceVersions?.length" class="button-history"
                  icon="history" @click="openHistoryModal(subProgram)" />
              </div>
            </div>
            <q-separator :vertical="$q.screen.gt.md" :class="$q.screen.gt.md ? 'q-mx-md' : 'q-my-md'" />
            <div class="col">
              <span class="text-bold">Facturation client</span>
              <div class="row no-wrap q-mt-sm">
                <ni-secondary-button class="q-mr-md pricing-btn" label="Ajouter un échéancier"
                  :disable="!!subProgram.archivedAt || !!(subProgram.hourlyPaymentPlans || []).length"
                  @click="openPaymentPlanAdditionModal(subProgram)" />
                <ni-bi-color-button v-if="subProgram.paymentPlans?.length" class="button-history" icon="visibility"
                  @click="openPaymentPlanListModal(subProgram)" />
              </div>
              <div class="row no-wrap q-mt-sm">
                <ni-secondary-button class="q-mr-md pricing-btn" label="Ajouter une tarification au réel"
                  :disable="!!subProgram.archivedAt || !!(subProgram.paymentPlans || []).length"
                  @click="openHourlyPaymentPlanAdditionModal(subProgram)" />
                <ni-bi-color-button v-if="subProgram.hourlyPaymentPlans?.length" class="button-history"
                  icon="visibility" @click="openHourlyPaymentPlanListModal(subProgram)" />
              </div>
            </div>
          </div>
        </q-slide-transition>
      </q-card>
      <q-checkbox :model-value="!!program.subPrograms[index].subjectToVat"
        label="La TVA s'applique à ce sous-programme" :disable="!!subProgram.archivedAt"
        @update:model-value="updateSubProgramSubjectToVat(index, $event)" />
      <ni-input v-model.trim="program.subPrograms[index].name" required-field caption="Nom" @focus="saveTmpName(index)"
        @blur="updateSubProgramName(index)" :error="getSubProgramError(index)" :disable="!!subProgram.archivedAt" />
      <draggable v-model="subProgram.steps" @change="dropStep(subProgram._id)" ghost-class="ghost"
        :disabled="$q.platform.is.mobile || isPublished(subProgram) || !!subProgram.archivedAt" item-key="_id">
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
                <ni-button icon="edit" :disable="!!subProgram.archivedAt" @click="openStepEditionModal(step)" />
                <ni-button icon="close" @click="validateStepDetachment(subProgram._id, step._id)"
                  :disable="isPublished(subProgram) || !!subProgram.archivedAt" />
              </div>
            </q-card-section>
            <div class="bg-peach-200 activity-container" v-if="areActivitiesVisible[step._id]">
              <draggable v-model="step.activities"
                :disabled="$q.platform.is.mobile || isPublishedOrLocked(step) || !!subProgram.archivedAt"
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
                        <ni-button class="q-px-sm" icon="close" :disable="isPublished(step) || !!subProgram.archivedAt"
                          @click="validateActivityDeletion(step, activity._id)" />
                      </div>
                    </q-card-section>
                  </q-card>
                </template>
              </draggable>
              <div v-if="!isPublished(step)" class="q-mt-md" align="right">
                <ni-button color="primary" icon="add" label="Réutiliser une activité"
                  :disable="isLocked(step) || !!subProgram.archivedAt" @click="openActivityReuseModal(step)" />
                <ni-button color="primary" icon="add" label="Créer une activité"
                  :disable="isLocked(step) || !!subProgram.archivedAt" @click="openActivityCreationModal(step._id)" />
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
          @click="checkPublicationAndOpenModal(subProgram)" :flat="false" :disable="!!subProgram.archivedAt" />
        <ni-button v-if="!isPublished(subProgram)" class="add-step-button" color="primary" icon="add"
          @click="openStepAdditionModal(subProgram._id)" label="Ajouter une étape" :disable="!!subProgram.archivedAt" />
      </div>
      <q-separator v-if="subProgram !== visibleSubPrograms[visibleSubPrograms.length-1]" class="q-mt-lg" />
    </div>

    <q-btn class="fixed fab-custom" no-caps rounded color="primary" icon="add" label="Ajouter un sous programme"
      @click="subProgramCreationModal = true" :disable="isArchived" />

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

    <sub-program-trainer-price-version-creation-modal v-model="subProgramTrainerPriceVersionCreationModal"
      :validations="v$.newSubProgramTrainerPriceVersion" :loading="modalLoading"
      v-model:new-sub-program-trainer-price-version="newSubProgramTrainerPriceVersion"
      @submit="addSubProgramTrainerPriceVersion" @hide="resetSubProgramTrainerPriceVersionCreationModal" />

    <sub-program-trainer-price-version-history-modal v-model="subProgramTrainerPriceVersionHistoryModal"
      :sub-program="selectedSubProgram" />

    <payment-plan-addition-modal v-model="paymentPlanAdditionModal" :loading="modalLoading"
      v-model:new-payment-plan="newPaymentPlan" :validations="paymentPlanValidations.newPaymentPlan"
      @hide="resetPaymentPlanAdditionModal" @submit="addPaymentPlan" />

    <payment-plan-edition-modal v-model="paymentPlanEditionModal" :loading="modalLoading"
      v-model:edited-payment-plan="editedPaymentPlan" :validations="paymentPlanValidations.editedPaymentPlan"
      @hide="resetPaymentPlanEditionModal" @submit="editPaymentPlan" />

    <payment-plan-list-modal v-model="paymentPlanListModal" :sub-program="selectedSubProgramForPlan"
      @edit="openPaymentPlanEditionModal" @delete="deletePaymentPlan" />

    <hourly-payment-plan-modal v-model="hourlyPaymentPlanAdditionModal" :loading="modalLoading"
      v-model:plan="newHourlyPaymentPlan" :validations="hourlyPaymentPlanValidations.newHourlyPaymentPlan"
      @hide="resetHourlyPaymentPlanAdditionModal" @submit="addHourlyPaymentPlan" />

    <hourly-payment-plan-modal v-model="hourlyPaymentPlanEditionModal" :loading="modalLoading" is-edition
      v-model:plan="editedHourlyPaymentPlan" :validations="hourlyPaymentPlanValidations.editedHourlyPaymentPlan"
      @hide="resetHourlyPaymentPlanEditionModal" @submit="editHourlyPaymentPlan" />

    <hourly-payment-plan-list-modal v-model="hourlyPaymentPlanListModal" :sub-program="selectedSubProgramForHourlyPlan"
      @edit="openHourlyPaymentPlanEditionModal" @delete="deleteHourlyPaymentPlan" />
  </div>
</template>

<script>
import { useStore } from 'vuex';
import { ref, computed, toRefs, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import draggable from 'vuedraggable';
import useVuelidate from '@vuelidate/core';
import { required, helpers } from '@vuelidate/validators';
import { strictPositiveNumber } from '@helpers/vuelidateCustomVal';
import get from 'lodash/get';
import omit from 'lodash/omit';
import groupBy from 'lodash/groupBy';
import SubPrograms from '@api/SubPrograms';
import Steps from '@api/Steps';
import Input from '@components/form/Input';
import Select from '@components/form/Select';
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
  DAY,
  ARCHIVED_SUBPROGRAMS,
  UNARCHIVED_SUBPROGRAMS,
  SUBPROGRAM_STATUS_OPTIONS,
} from '@data/constants';
import { getStepTypeLabel, getStepTypeIcon } from '@helpers/courses';
import { formatQuantity, getLastVersion } from '@helpers/utils';
import CompaniDuration from '@helpers/dates/companiDurations';
import CompaniDate from '@helpers/dates/companiDates';
import SubProgramCreationModal from 'src/modules/vendor/components/programs/SubProgramCreationModal';
import SubProgramTrainerPriceVersionCreationModal from
  'src/modules/vendor/components/programs/SubProgramTrainerPriceVersionCreationModal';
import SubProgramTrainerPriceVersionHistoryModal from
  'src/modules/vendor/components/programs/SubProgramTrainerPriceVersionHistoryModal';
import PaymentPlanAdditionModal from 'src/modules/vendor/components/programs/PaymentPlanAdditionModal';
import PaymentPlanEditionModal from 'src/modules/vendor/components/programs/PaymentPlanEditionModal';
import PaymentPlanListModal from 'src/modules/vendor/components/programs/PaymentPlanListModal';
import HourlyPaymentPlanModal from 'src/modules/vendor/components/programs/HourlyPaymentPlanModal';
import HourlyPaymentPlanListModal from 'src/modules/vendor/components/programs/HourlyPaymentPlanListModal';
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
import { usePaymentPlan } from 'src/modules/vendor/composables/PaymentPlan';
import { useHourlyPaymentPlan } from 'src/modules/vendor/composables/HourlyPaymentPlan';

export default {
  name: 'ProfileContent',
  props: {
    profileId: { type: String, required: true },
  },
  components: {
    'ni-input': Input,
    'ni-select': Select,
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
    'sub-program-trainer-price-version-creation-modal': SubProgramTrainerPriceVersionCreationModal,
    'sub-program-trainer-price-version-history-modal': SubProgramTrainerPriceVersionHistoryModal,
    'payment-plan-addition-modal': PaymentPlanAdditionModal,
    'payment-plan-edition-modal': PaymentPlanEditionModal,
    'payment-plan-list-modal': PaymentPlanListModal,
    'hourly-payment-plan-modal': HourlyPaymentPlanModal,
    'hourly-payment-plan-list-modal': HourlyPaymentPlanListModal,
  },
  setup (props) {
    const { profileId } = toRefs(props);
    const $router = useRouter();
    const $store = useStore();
    const $q = useQuasar();

    const areActivitiesVisible = ref({});
    const tmpInput = ref('');
    const modalLoading = ref(false);
    const showPricing = ref({});
    const areStepsLocked = ref({});
    const currentStepId = ref('');
    const newSubProgramTrainerPriceVersion = ref({ prices: [], subProgram: {}, effectiveDate: '' });
    const subProgramTrainerPriceVersionCreationModal = ref(false);
    const subProgramTrainerPriceVersionHistoryModal = ref(false);
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

    const isArchived = computed(() => !!get(program.value, 'archivedAt'));

    const selectedSubProgramStatus = ref(UNARCHIVED_SUBPROGRAMS);

    const visibleSubPrograms = computed(() => {
      const subPrograms = get(program.value, 'subPrograms') || [];
      if (selectedSubProgramStatus.value === UNARCHIVED_SUBPROGRAMS) {
        return subPrograms.filter(sp => !sp.archivedAt);
      }
      if (selectedSubProgramStatus.value === ARCHIVED_SUBPROGRAMS) {
        return subPrograms.filter(sp => sp.archivedAt);
      }

      return subPrograms;
    });

    const updateSubProgramArchivedAt = async (subProgram) => {
      try {
        modalLoading.value = true;
        await SubPrograms.update(subProgram._id, { archivedAt: subProgram.archivedAt ? '' : CompaniDate().toISO() });

        NotifyPositive(subProgram.archivedAt ? 'Sous-programme désarchivé.' : 'Sous-programme archivé.');
        await refreshProgram();
      } catch (e) {
        console.error(e);
        NotifyNegative(subProgram.archivedAt
          ? 'Erreur lors du désarchivage du sous-programme.'
          : 'Erreur lors de l\'archivage du sous-programme.');
      } finally {
        modalLoading.value = false;
      }
    };

    const validateSubProgramArchive = (subProgram) => {
      const message = subProgram.archivedAt
        ? 'Êtes-vous sûr(e) de vouloir désarchiver ce sous-programme&nbsp;? <br /><br /> Il sera de nouveau possible'
          + ' de le modifier.'
        : 'Êtes-vous sûr(e) de vouloir archiver ce sous-programme&nbsp;? <br /><br /> Vous ne pourrez plus le'
          + ' modifier.';

      $q.dialog({ title: 'Confirmation', message, html: true, ok: 'Oui', cancel: 'Non' })
        .onOk(() => updateSubProgramArchivedAt(subProgram))
        .onCancel(() => NotifyPositive(subProgram.archivedAt ? 'Désarchivage annulé.' : 'Archivage annulé.'));
    };

    const {
      subProgramPublicationModal,
      companyOptions,
      validateSubProgramPublication,
      checkPublicationAndOpenModal,
      resetPublication,
    } = useSubProgramPublicationModal(program, refreshProgram);

    const {
      paymentPlanAdditionModal,
      paymentPlanEditionModal,
      paymentPlanListModal,
      newPaymentPlan,
      editedPaymentPlan,
      v$: paymentPlanValidations,
      selectedSubProgramForPlan,
      openPaymentPlanAdditionModal,
      resetPaymentPlanAdditionModal,
      openPaymentPlanListModal,
      openPaymentPlanEditionModal,
      resetPaymentPlanEditionModal,
      addPaymentPlan,
      editPaymentPlan,
      deletePaymentPlan,
    } = usePaymentPlan(modalLoading, refreshProgram, program);

    const {
      hourlyPaymentPlanAdditionModal,
      hourlyPaymentPlanEditionModal,
      hourlyPaymentPlanListModal,
      selectedSubProgramForHourlyPlan,
      newHourlyPaymentPlan,
      editedHourlyPaymentPlan,
      v$: hourlyPaymentPlanValidations,
      openHourlyPaymentPlanAdditionModal,
      resetHourlyPaymentPlanAdditionModal,
      openHourlyPaymentPlanListModal,
      openHourlyPaymentPlanEditionModal,
      resetHourlyPaymentPlanEditionModal,
      addHourlyPaymentPlan,
      editHourlyPaymentPlan,
      deleteHourlyPaymentPlan,
    } = useHourlyPaymentPlan(modalLoading, refreshProgram, program);

    const hasConsistentRoles = (prices) => {
      const pricesByStep = groupBy(prices, 'step');
      return Object.values(pricesByStep).every(stepPrices => stepPrices.length === 1 || stepPrices.every(p => p.role));
    };

    const rules = computed(() => ({
      program: { subPrograms: { $each: helpers.forEach({ name: { required } }) } },
      newSubProgramTrainerPriceVersion: {
        prices: {
          $each: helpers.forEach({ step: { required }, hourlyAmount: { required, strictPositiveNumber } }),
          hasConsistentRoles,
        },
        effectiveDate: { required },
      },
    }));

    const v$ = useVuelidate(rules, { program, newSubProgramTrainerPriceVersion });

    // SubProgram price version creation
    const openTrainerPriceVersionCreationModal = (subProgram) => {
      const steps = subProgram.steps.filter(s => s.type !== E_LEARNING);
      const lastSubProgramTrainerPriceVersion = getLastVersion(subProgram.trainerPriceVersions || [], 'effectiveDate');

      newSubProgramTrainerPriceVersion.value = {
        subProgram: { _id: subProgram._id, steps, trainerPriceVersionsCount: subProgram.trainerPriceVersions?.length },
        prices: lastSubProgramTrainerPriceVersion
          ? lastSubProgramTrainerPriceVersion.prices
          : steps.map(s => ({ step: s._id, hourlyAmount: 100 })),
        effectiveDate: CompaniDate().startOf(DAY).toISO(),
        minEffectiveDate: lastSubProgramTrainerPriceVersion
          ? CompaniDate(lastSubProgramTrainerPriceVersion.effectiveDate).add('P1D').toISO()
          : '',
      };
      subProgramTrainerPriceVersionCreationModal.value = true;
    };

    const resetSubProgramTrainerPriceVersionCreationModal = () => {
      newSubProgramTrainerPriceVersion.value = { prices: [], subProgram: {}, effectiveDate: '' };
      v$.value.newSubProgramTrainerPriceVersion.$reset();
    };

    const addSubProgramTrainerPriceVersion = async (subProgramId) => {
      try {
        modalLoading.value = true;
        v$.value.newSubProgramTrainerPriceVersion.$touch();
        if (v$.value.newSubProgramTrainerPriceVersion.$error) return NotifyWarning('Champ(s) invalide(s).');

        await SubPrograms.update(
          subProgramId,
          { ...omit(newSubProgramTrainerPriceVersion.value, ['subProgram', 'minEffectiveDate']) }
        );
        subProgramTrainerPriceVersionCreationModal.value = false;
      } catch (e) {
        console.error(e);
        if (e.data.statusCode === 403 && e.data.message) return NotifyWarning(e.data.message);
        NotifyNegative('Erreur lors de l\'édition des tarifs horaires du sous-programme.');
      } finally {
        await refreshProgram();
        modalLoading.value = false;
      }
    };

    // SubProgram price version history
    const openHistoryModal = (subProgram) => {
      selectedSubProgram.value = subProgram;
      subProgramTrainerPriceVersionHistoryModal.value = true;
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

    const updateSubProgramSubjectToVat = async (index, value) => {
      try {
        const subProgram = program.value.subPrograms[index];
        await SubPrograms.update(subProgram._id, { subjectToVat: value });
        NotifyPositive('Modification enregistrée.');
        await refreshProgram();
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la modification du sous-programme.');
      }
    };

    const validateSubProgramDeletion = (subProgram) => {
      $q.dialog({
        title: 'Confirmation',
        message: 'Êtes-vous sûr(e) de vouloir supprimer ce sous-programme&nbsp;?',
        html: true,
        ok: true,
        cancel: 'Annuler',
      }).onOk(() => deleteSubProgram(subProgram._id))
        .onCancel(() => NotifyPositive('Suppression annulée.'));
    };

    const deleteSubProgram = async (subProgramId) => {
      try {
        await SubPrograms.delete(subProgramId);
        await refreshProgram();
        NotifyPositive('Sous-programme supprimé.');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la suppression du sous-programme.');
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

    watch(isArchived, (value) => {
      selectedSubProgramStatus.value = value ? ARCHIVED_SUBPROGRAMS : UNARCHIVED_SUBPROGRAMS;
    }, { immediate: true });

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

    const togglePricing = (subProgramId) => {
      showPricing.value = { ...showPricing.value, [subProgramId]: !showPricing.value[subProgramId] };
    };

    return {
      // Data
      PUBLISHED,
      PUBLISHED_DOT_ACTIVE,
      PUBLISHED_DOT_WARNING,
      E_LEARNING,
      LONG_DURATION_H_MM,
      PT0S,
      SUBPROGRAM_STATUS_OPTIONS,
      selectedSubProgramStatus,
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
      subProgramTrainerPriceVersionCreationModal,
      newSubProgramTrainerPriceVersion,
      subProgramTrainerPriceVersionHistoryModal,
      selectedSubProgram,
      // Computed
      v$,
      newStepValidations,
      newSubProgramValidations,
      newActivityValidations,
      editedStepValidations,
      reusedActivityValidations,
      program,
      isArchived,
      visibleSubPrograms,
      // Methods
      validateSubProgramArchive,
      formatQuantity,
      getSubProgramError,
      dropStep,
      dropActivity,
      saveTmpName,
      getActivityTypeLabel,
      showActivities,
      updateSubProgramName,
      updateSubProgramSubjectToVat,
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
      validateSubProgramDeletion,
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
      openTrainerPriceVersionCreationModal,
      resetSubProgramTrainerPriceVersionCreationModal,
      addSubProgramTrainerPriceVersion,
      openHistoryModal,
      paymentPlanAdditionModal,
      paymentPlanEditionModal,
      paymentPlanListModal,
      newPaymentPlan,
      editedPaymentPlan,
      paymentPlanValidations,
      selectedSubProgramForPlan,
      showPricing,
      togglePricing,
      selectedSubProgramForHourlyPlan,
      hourlyPaymentPlanAdditionModal,
      hourlyPaymentPlanEditionModal,
      hourlyPaymentPlanListModal,
      newHourlyPaymentPlan,
      editedHourlyPaymentPlan,
      hourlyPaymentPlanValidations,
      openHourlyPaymentPlanAdditionModal,
      resetHourlyPaymentPlanAdditionModal,
      openHourlyPaymentPlanListModal,
      openHourlyPaymentPlanEditionModal,
      resetHourlyPaymentPlanEditionModal,
      addHourlyPaymentPlan,
      editHourlyPaymentPlan,
      deleteHourlyPaymentPlan,
      openPaymentPlanAdditionModal,
      resetPaymentPlanAdditionModal,
      openPaymentPlanListModal,
      openPaymentPlanEditionModal,
      resetPaymentPlanEditionModal,
      addPaymentPlan,
      editPaymentPlan,
      deletePaymentPlan,
    };
  },
};
</script>

<style lang="sass" scoped>
.pricing-btn
  // flex: 0 0 320px
  // width: 320px
  min-width: 320px
  // max-width: 100%
  @media screen and (max-width: 767px)
    flex: 0 1 260px
    width: 260px
    min-width: 0
    font-size: 11px
    // margin-right: 8px
.pricing-toggle
  flex-direction: row
  align-items: center
  justify-content: space-between
  padding: 16px 0px
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

.archived-sub-program
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
