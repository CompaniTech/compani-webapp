<template>
  <div class="column">
    <div class="q-mb-lg">
      <ni-button v-if="isEditionLocked" label="Déverrouiller" color="primary" icon="mdi-lock"
        @click="validateUnlockEdition" />
    </div>
    <div class="row justify-between">
      <div class="row body">
        <ni-input v-model.trim="questionnaire.name" required-field caption="Nom" @blur="updateQuestionnaire"
          @focus="saveTmpName" :error="v$.questionnaire.name.$error" :disable="nameLock" />
        <ni-button v-if="isQuestionnairePublishedOrArchived" color="copper-grey-500" :icon="lockIcon"
          @click="nameLock = !nameLock" />
      </div>
      <div class="publish-button">
        <ni-button v-if="!isQuestionnairePublishedOrArchived" color="primary" label="Publier" icon="vertical_align_top"
          @click="validateQuestionnairePublication" :flat="false" />
      </div>
    </div>
    <div class="row body">
      <card-container ref="cardContainer" class="col-md-3 col-sm-4 col-xs-6" @add="openCardCreationModal"
        @delete-card="validateCardDeletion" :card-parent="questionnaire" @update="updateQuestionnaire"
        :disable-edition="isEditionLocked" />
      <card-edition :card-parent="questionnaire" @refresh="refreshCard" :disable-edition="isEditionLocked" />
    </div>

    <card-creation-modal v-model="cardCreationModal" @submit="createCard" is-questionnaire />
  </div>
</template>

<script>
import get from 'lodash/get';
import { ref, computed, toRefs, useTemplateRef, onBeforeUnmount } from 'vue';
import { useStore } from 'vuex';
import { useQuasar } from 'quasar';
import useVuelidate from '@vuelidate/core';
import { required } from '@vuelidate/validators';
import Questionnaires from '@api/Questionnaires';
import { NotifyNegative, NotifyWarning, NotifyPositive } from '@components/popup/notify';
import Input from '@components/form/Input';
import Button from '@components/Button';
import { useCards } from '@composables/cards';
import { PUBLISHED, DRAFT } from '@data/constants';
import CardContainer from 'src/modules/vendor/components/programs/cards/CardContainer';
import CardEdition from 'src/modules/vendor/components/programs/cards/CardEdition';
import CardCreationModal from 'src/modules/vendor/components/programs/cards/CardCreationModal';

export default {
  name: 'ProfileEdition',
  props: {
    profileId: { type: String, required: true },
    otherPublishedQuestionnaire: { type: String, default: '' },
  },
  components: {
    'ni-input': Input,
    'card-container': CardContainer,
    'card-edition': CardEdition,
    'card-creation-modal': CardCreationModal,
    'ni-button': Button,
  },
  setup (props) {
    const { profileId, otherPublishedQuestionnaire } = toRefs(props);

    const $store = useStore();
    const $q = useQuasar();

    const tmpInput = ref('');
    const cardCreationModal = ref(false);
    const nameLock = ref(false);
    const isEditionLocked = ref(false);
    const cardContainer = useTemplateRef('cardContainer');

    const questionnaire = computed(() => $store.state.questionnaire.questionnaire);

    const card = computed(() => $store.state.card.card);

    const rules = computed(() => ({ questionnaire: { name: { required } } }));

    const v$ = useVuelidate(rules, { questionnaire });

    const isQuestionnairePublishedOrArchived = computed(() => questionnaire.value.status !== DRAFT);

    const isQuestionnaireValid = computed(() => questionnaire.value.areCardsValid &&
      !!questionnaire.value.cards.length);

    const lockIcon = computed(() => (nameLock.value ? 'lock' : 'lock_open'));

    const deleteCard = async (cardId) => {
      try {
        await Questionnaires.deleteCard(cardId);
        await refreshQuestionnaire();
        $store.dispatch('card/resetCard');
        NotifyPositive('Carte supprimée');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la suppression de la carte.');
      }
    };

    const { validateCardDeletion, openCardCreationModal } = useCards(cardCreationModal, deleteCard);

    const refreshQuestionnaire = async () => {
      try {
        await $store.dispatch('questionnaire/fetchQuestionnaire', { questionnaireId: profileId.value });
      } catch (e) {
        console.error(e);
      }
    };

    const refreshCard = async () => {
      try {
        await $store.dispatch('questionnaire/fetchQuestionnaire', { questionnaireId: questionnaire.value._id });
        const focusedCard = questionnaire.value.cards.find(c => c._id === card.value._id);
        $store.dispatch('card/fetchCard', focusedCard);
      } catch (e) {
        console.error(e);
      }
    };

    const validateUnlockEdition = () => {
      const status = questionnaire.value.status === PUBLISHED ? 'publié' : 'archivé';
      const message = `Ce questionnaire est ${status}, vous ne pourrez pas ajouter, supprimer ou changer l'ordre des `
        + 'cartes.<br /><br /> Êtes-vous sûr(e) de vouloir déverrouiller ce questionnaire&nbsp;?';

      $q.dialog({
        title: 'Confirmation',
        message,
        html: true,
        ok: true,
        cancel: 'Annuler',
      }).onOk(() => { isEditionLocked.value = false; NotifyPositive('Questionnaire déverrouillé.'); })
        .onCancel(() => NotifyPositive('Déverrouillage annulé.'));
    };

    const saveTmpName = () => { tmpInput.value = get(questionnaire.value, 'name') || ''; };

    const createCard = async (template) => {
      try {
        $q.loading.show();
        await Questionnaires.addCard(questionnaire.value._id, { template });

        NotifyPositive('Carte créée.');
        cardCreationModal.value = false;

        cardContainer.value.scrollDown();

        await refreshQuestionnaire();
        const cardCreated = questionnaire.value.cards[questionnaire.value.cards.length - 1];
        await $store.dispatch('card/fetchCard', cardCreated);
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la création de la carte.');
      } finally {
        $q.loading.hide();
      }
    };

    const updateQuestionnaire = async (event) => {
      try {
        if (event) await Questionnaires.update(questionnaire.value._id, { cards: event });
        else {
          const name = get(questionnaire.value, 'name');
          if (tmpInput.value === name) return;

          v$.value.questionnaire.$touch();
          if (v$.value.questionnaire.$error) return NotifyWarning('Champ(s) invalide(s)');

          await Questionnaires.update(questionnaire.value._id, { name });
        }

        NotifyPositive('Modification enregistrée.');
      } catch (e) {
        console.error(e);
        if (event) NotifyNegative('Erreur lors de la modification des cartes.');
        else NotifyNegative('Erreur lors de la modification du questionnaire.');
      } finally {
        await refreshQuestionnaire();
      }
    };

    const validateQuestionnairePublication = async () => {
      if (!questionnaire.value.cards.length) return NotifyWarning('Il n\'y a aucune carte dans ce questionnaire.');
      if (!questionnaire.value.areCardsValid) return NotifyWarning('Carte(s) invalide(s).');

      const warningMessage = otherPublishedQuestionnaire.value
        ? `</br></br>Un questionnaire "${otherPublishedQuestionnaire.value}" existe déjà pour ce type de questionnaire `
        + 'et sera archivé.'
        : '';
      $q.dialog({
        title: 'Confirmation',
        message: `Êtes-vous sûr(e) de vouloir publier ce questionnaire&nbsp;?${warningMessage}`,
        html: true,
        ok: true,
        cancel: 'Annuler',
      }).onOk(() => publishQuestionnaire())
        .onCancel(() => NotifyPositive('Publication annulée.'));
    };

    const publishQuestionnaire = async () => {
      try {
        if (isQuestionnaireValid.value) {
          await Questionnaires.update(questionnaire.value._id, { status: PUBLISHED });
          nameLock.value = true;
          isEditionLocked.value = true;
          NotifyPositive('Questionnaire publié.');
        }
      } catch (e) {
        console.error(e);
        if (e.status === 409) return NotifyWarning(e.data.message);
        NotifyNegative('Erreur lors de la publication du questionnaire.');
      } finally {
        await refreshQuestionnaire();
      }
    };

    const created = async () => {
      await refreshQuestionnaire();
      nameLock.value = isQuestionnairePublishedOrArchived.value;
      isEditionLocked.value = isQuestionnairePublishedOrArchived.value;
    };

    created();

    onBeforeUnmount(() => $store.dispatch('card/resetCard'));

    return {
      // Validation
      v$,
      // Data
      cardCreationModal,
      nameLock,
      isEditionLocked,
      // Computed
      questionnaire,
      isQuestionnairePublishedOrArchived,
      lockIcon,
      // Methods
      refreshCard,
      validateUnlockEdition,
      saveTmpName,
      createCard,
      updateQuestionnaire,
      validateQuestionnairePublication,
      validateCardDeletion,
      openCardCreationModal,
    };
  },
};
</script>

<style lang="sass" scoped>
.body
  flex: 1
.publish-button
  display: flex
  height: 40px
  align-self: center
</style>
