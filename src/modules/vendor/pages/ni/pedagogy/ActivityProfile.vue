<template>
  <q-page padding class="vendor-background">
    <template v-if="activity">
      <ni-profile-header :title="activity.name" :header-info="headerInfo" />
      <div class="q-mb-lg">
        <ni-button v-if="isEditionLocked" label="Déverrouiller" color="primary" icon="mdi-lock"
          @click="validateUnlockEdition" />
      </div>
      <div class="row gutter-profile">
        <ni-input v-model.trim="editedActivity.name" required-field caption="Nom" :error="v$.editedActivity.name.$error"
          @blur="updateActivity(editedActivity.name, 'name')" :disable="isEditionLocked" />
        <ni-select v-model.trim="editedActivity.type" @update:model-value="updateActivity(editedActivity.type, 'type')"
          :options="ACTIVITY_TYPES" caption="Type" :disable="isActivityPublished || isEditionLocked" required-field
          :error="v$.editedActivity.type.$error" />
      </div>
      <div class="row body">
        <card-container ref="cardContainer" class="col-md-3 col-sm-4 col-xs-6" @add="openCardCreationModal"
          @delete-card="validateCardDeletion" :disable-edition="isEditionLocked" :card-parent="activity"
          @update="updateActivity($event, 'cards')" />
        <card-edition :disable-edition="isEditionLocked" :card-parent="activity" @refresh="refreshCard" />
      </div>
    </template>

    <card-creation-modal v-model="cardCreationModal" @submit="createCard" />
  </q-page>
</template>

<script>
import { ref, computed, toRefs, useTemplateRef, onBeforeUnmount } from 'vue';
import { useStore } from 'vuex';
import { useMeta, useQuasar } from 'quasar';
import { useRoute } from 'vue-router';
import useVuelidate from '@vuelidate/core';
import { required } from '@vuelidate/validators';
import get from 'lodash/get';
import uniqBy from 'lodash/uniqBy';
import Activities from '@api/Activities';
import { NotifyNegative, NotifyPositive, NotifyWarning } from '@components/popup/notify';
import { ACTIVITY_TYPES, PUBLISHED } from '@data/constants';
import ProfileHeader from '@components/ProfileHeader';
import Button from '@components/Button';
import Input from '@components/form/Input';
import Select from '@components/form/Select';
import CardContainer from 'src/modules/vendor/components/programs/cards/CardContainer';
import CardEdition from 'src/modules/vendor/components/programs/cards/CardEdition';
import CardCreationModal from 'src/modules/vendor/components/programs/cards/CardCreationModal';
import { useCards } from '@composables/cards';

export default {
  name: 'ActivityProfile',
  props: {
    activityId: { type: String, required: true },
    programId: { type: String, required: true },
    subProgramId: { type: String, required: true },
    stepId: { type: String, required: true },
  },
  components: {
    'ni-profile-header': ProfileHeader,
    'card-container': CardContainer,
    'card-edition': CardEdition,
    'card-creation-modal': CardCreationModal,
    'ni-button': Button,
    'ni-input': Input,
    'ni-select': Select,
  },
  setup (props) {
    const metaInfo = { title: 'Fiche activité' };
    useMeta(metaInfo);
    const { activityId, subProgramId, stepId, programId } = toRefs(props);
    const $store = useStore();
    const $q = useQuasar();
    const $route = useRoute();

    const programName = ref('');
    const stepName = ref('');
    const cardCreationModal = ref(false);
    const isEditionLocked = ref(false);
    const isActivityUsedInSeveralPlaces = ref(false);
    const editedActivity = ref({ name: '', type: '' });
    const cardContainer = useTemplateRef('cardContainer');

    const activity = computed(() => $store.state.program.activity);
    const program = computed(() => $store.state.program.program);
    const card = computed(() => $store.state.card.card);

    const deleteCard = async (cardId) => {
      try {
        await Activities.deleteCard(cardId);
        await refreshActivity();

        $store.dispatch('card/resetCard');
        NotifyPositive('Carte supprimée.');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la suppression de la carte.');
      }
    };

    const { validateCardDeletion, openCardCreationModal } = useCards(cardCreationModal, deleteCard);

    const rules = computed(() => ({
      editedActivity: {
        name: { required },
        type: { required },
      },
    }));

    const v$ = useVuelidate(rules, { editedActivity });

    const activityType = computed(() => ACTIVITY_TYPES.find(type => type.value === activity.value.type).label || '');

    const isActivityPublished = computed(() => activity.value.status === PUBLISHED);

    const isActivityValid = computed(() => activity.value.areCardsValid && activity.value.cards.length > 0);

    const headerInfo = computed(() => {
      const infos = [
        { icon: 'library_books', label: programName.value },
        { icon: 'book', label: stepName.value },
        { icon: 'bookmark_border', label: activityType.value },
      ];

      if (isActivityPublished.value) {
        infos.push({ icon: !isActivityValid.value ? 'circle' : 'check_circle',
          label: 'Publiée',
          class: isActivityValid.value ? 'info-active' : 'info-warning' });
      }

      return infos;
    });

    const refreshActivity = async () => {
      try {
        await $store.dispatch('program/fetchActivity', { activityId: activityId.value });
      } catch (e) {
        console.error(e);
      }
    };

    const refreshCard = async () => {
      try {
        await $store.dispatch('program/fetchActivity', { activityId: activity.value._id });
        const cardToRefresh = activity.value.cards.find(c => c._id === card.value._id);
        $store.dispatch('card/fetchCard', cardToRefresh);
      } catch (e) {
        console.error(e);
      }
    };

    const validateUnlockEdition = () => {
      const activityReusagesExceptCurrentUsage = activity.value.steps.map(step => step.subPrograms
        .map(sp => ({
          stepId: step._id,
          subProgramId: sp._id,
          programId: get(sp, 'program._id'),
          programName: get(sp, 'program.name'),
        })))
        .flat()
        .filter(
          activityItem => activityItem.subProgramId !== subProgramId.value || activityItem.stepId !== stepId.value
        );
      const programsReusingActivity = uniqBy(activityReusagesExceptCurrentUsage, 'programId').map(p => p.programName);

      const usedInOtherStepMessage = isActivityUsedInSeveralPlaces.value
        ? 'Cette activité est utilisée dans les étapes '
          + `${programsReusingActivity.length > 1 ? 'des programmes suivants' : 'du programme suivant'} : `
          + `${programsReusingActivity.join(', ')}. <br />Si vous la modifiez, elle sera modifiée dans toutes
          ces étapes.`
          + '<br /><br />'
        : '';
      const isPublishedMessage = isActivityPublished.value
        ? 'Cette activité est publiée, vous ne pourrez pas ajouter, supprimer ou changer l\'ordre des cartes'
          + '<br /><br />'
        : '';

      $q.dialog({
        title: 'Confirmation',
        message: `${usedInOtherStepMessage} ${isPublishedMessage}`
          + 'Êtes-vous sûr(e) de vouloir déverrouiller cette activité&nbsp;?',
        html: true,
        ok: true,
        cancel: 'Annuler',
      }).onOk(() => { isEditionLocked.value = false; NotifyPositive('Activité déverrouillée.'); })
        .onCancel(() => NotifyPositive('Déverrouillage annulé.'));
    };

    const createCard = async (template) => {
      $q.loading.show();
      try {
        await Activities.addCard(activityId.value, { template });

        NotifyPositive('Carte créée.');
        cardCreationModal.value = false;

        cardContainer.value.scrollDown();

        await refreshActivity();
        const cardCreated = activity.value.cards[activity.value.cards.length - 1];
        await $store.dispatch('card/fetchCard', cardCreated);
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la création de la carte.');
      } finally {
        $q.loading.hide();
      }
    };

    const updateActivity = async (event, path) => {
      try {
        v$.value.editedActivity.$touch();
        if (v$.value.editedActivity.$error) return NotifyWarning('Champ(s) invalide(s)');

        await Activities.updateById(activity.value._id, { [path]: event });

        NotifyPositive('Modification enregistrée.');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la modification des cartes.');
      } finally {
        await refreshActivity();
      }
    };

    const created = async () => {
      try {
        await refreshActivity();

        if (!program.value) await $store.dispatch('program/fetchProgram', { programId: programId.value });
        programName.value = get(program.value, 'name') || '';

        const subProgram = program.value.subPrograms.find(sp => sp._id === subProgramId.value);

        const step = subProgram ? subProgram.steps.find(s => s._id === stepId.value) : '';
        stepName.value = get(step, 'name') || '';

        const isActivityUsedInOtherSteps = activity.value.steps.length > 1;
        const isActivityUsedInOneStepButSeveralSubPrograms = activity.value.steps[0].subPrograms.length > 1;
        isActivityUsedInSeveralPlaces.value = isActivityUsedInOtherSteps ||
          isActivityUsedInOneStepButSeveralSubPrograms;

        isEditionLocked.value = isActivityUsedInSeveralPlaces.value || isActivityPublished.value;
        editedActivity.value = { name: activity.value.name, type: activity.value.type };
      } catch (e) {
        console.error(e);
      }
    };

    created();

    onBeforeUnmount(() => {
      $store.dispatch('program/resetActivity');
      $store.dispatch('card/resetCard');
      if ((new RegExp(`programs/${program.value._id}`)).test($route.path)) {
        $store.dispatch('program/fetchProgram', { programId: programId.value });
        $store.dispatch('program/setOpenedStep', { stepId: stepId.value });
      } else {
        $store.dispatch('program/resetProgram');
      }
    });

    return {
      // Validation
      v$,
      // Data
      ACTIVITY_TYPES,
      cardCreationModal,
      isEditionLocked,
      editedActivity,
      isActivityPublished,
      // Computed
      activity,
      headerInfo,
      // Method
      refreshCard,
      validateUnlockEdition,
      createCard,
      updateActivity,
      validateCardDeletion,
      openCardCreationModal,
    };
  },
};
</script>

<style lang="sass" scoped>
.q-page
  display: flex
  flex-direction: column

.body
  flex: 1

.q-item
  padding: 0
  min-height: 0
:deep(.q-btn__wrapper)
  padding: 0px !important
</style>
