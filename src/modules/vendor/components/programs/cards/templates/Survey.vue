<template>
  <div class="container">
    <ni-input caption="Question" v-model="card.question" required-field @focus="saveTmp('question')"
      @blur="updateCard('question')" :error="v$.card.question.$error" :error-message="errorMsg('question')"
      :disable="disableEdition" type="textarea" />
      <div class="max-label">
        <ni-input :model-value="maxLabel" @update:model-value="updateMaxLabel" caption="Nombre de niveau"
          type="number" required-field error-message="La valeur doit être comprise entre 5 et 10"
          :error="v$.maxLabel.$error" :disable="displayAllLabels || disableEdition || isCardParentPublished" />
      </div>
    <div class="checkbox-container">
      <q-checkbox v-model="card.isMandatory" @update:model-value="updateCard('isMandatory')" label="Réponse obligatoire"
        class="q-mb-lg" dense :disable="disableEdition" />
      <q-checkbox :model-value="displayAllLabels" @update:model-value="validateInitialization"
        label="Définir les légendes de chaque niveau" class="q-mb-lg" dense
        :disable="disableEdition || isCardParentPublished" />
    </div>
    <div class="input-container" v-for="label in Object.keys(card.labels)" :key="label">
      <ni-input :caption="`Légende niveau ${label}`" v-model="card.labels[label]"
        @focus="saveTmp(`labels.${label}`)" @blur="updateCardLabels(label)" :error="v$.card.labels[label].$error"
        :error-message="labelErrorMessage(label)" :disable="disableEdition" required-field />
    </div>
  </div>
</template>

<script>
import { computed, ref, toRefs } from 'vue';
import { useStore } from 'vuex';
import { useQuasar } from 'quasar';
import get from 'lodash/get';
import useVuelidate from '@vuelidate/core';
import { required, maxLength, requiredIf, minValue, maxValue } from '@vuelidate/validators';
import { strictPositiveNumber, integerNumber } from '@helpers/vuelidateCustomVal';
import Cards from '@api/Cards';
import { NotifyPositive, NotifyNegative, NotifyWarning } from '@components/popup/notify';
import Input from '@components/form/Input';
import { QUESTION_OR_TITLE_MAX_LENGTH, PUBLISHED } from '@data/constants';
import { useCardTemplate } from 'src/modules/vendor/composables/CardTemplate';

export default {
  name: 'Survey',
  props: {
    disableEdition: { type: Boolean, default: false },
    cardParent: { type: Object, default: () => ({}) },
  },
  components: {
    'ni-input': Input,
  },
  emits: ['refresh'],
  setup (props, { emit }) {
    const $store = useStore();
    const $q = useQuasar();

    const { cardParent } = toRefs(props);

    const card = computed(() => $store.state.card.card);

    const displayAllLabels = ref(Object.keys(card.value.labels).length > 2);

    const maxLabel = ref(Math.max(...Object.keys(card.value.labels).map(Number)));

    const rules = computed(() => ({
      card: {
        question: { required, maxLength: maxLength(QUESTION_OR_TITLE_MAX_LENGTH) },
        labels: {
          1: { required },
          2: { required: requiredIf(Object.keys(card.value.labels).includes('2')) },
          3: { required: requiredIf(Object.keys(card.value.labels).includes('3')) },
          4: { required: requiredIf(Object.keys(card.value.labels).includes('4')) },
          5: { required: requiredIf(Object.keys(card.value.labels).includes('5')) },
          6: { required: requiredIf(Object.keys(card.value.labels).includes('6')) },
          7: { required: requiredIf(Object.keys(card.value.labels).includes('7')) },
          8: { required: requiredIf(Object.keys(card.value.labels).includes('8')) },
          9: { required: requiredIf(Object.keys(card.value.labels).includes('9')) },
          10: { required: requiredIf(Object.keys(card.value.labels).includes('10')) },
        },
      },
      maxLabel: { required, minValue: minValue(5), maxValue: maxValue(10), strictPositiveNumber, integerNumber },
    }));
    const v$ = useVuelidate(rules, { card, maxLabel });

    const isCardParentPublished = computed(() => get(cardParent.value, 'status') === PUBLISHED);

    const refreshCard = () => {
      emit('refresh');
    };

    const { tmpInput, saveTmp, updateCard, errorMsg } = useCardTemplate(card, v$, refreshCard);

    const labelErrorMessage = (labelKey) => {
      if (get(v$.value, `card.labels[${labelKey}].required.$response`) === false) {
        return 'Toutes les légendes doivent être renseignées.';
      }

      return '';
    };

    const updateCardLabels = async (labelKey, changeCountLabelPayload = null) => {
      try {
        if (!changeCountLabelPayload && tmpInput.value === get(card.value, `labels.${labelKey}`)) return;

        v$.value.card.labels.$touch();
        if (get(v$.value, `card.labels.${labelKey}.$error`)) return NotifyWarning('Champ(s) invalide(s).');
        const payload = changeCountLabelPayload || { labels: card.value.labels };
        await Cards.updateById(card.value._id, payload);

        await refreshCard();
        NotifyPositive('Carte mise à jour.');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la mise à jour de la carte.');
      }
    };

    const initializeLabels = async (labels, displayAllLabelsValue) => {
      try {
        await Cards.updateById(card.value._id, { labels });

        v$.value.card.labels.$touch();

        await refreshCard();
        displayAllLabels.value = displayAllLabelsValue;
        NotifyPositive('Carte mise à jour.');
      } catch (e) {
        console.error(e);
      }
    };

    const validateInitialization = async (value) => {
      try {
        const labelKeys = Array.from({ length: Number(maxLabel.value) }, (_, i) => i + 1);
        const payload = labelKeys
          .filter(key => key !== 1 && key !== Number(maxLabel.value))
          .reduce((acc, key) => {
            if (!value) acc[key] = null;
            else acc[key] = '';
            return acc;
          }, {});
        if (!value) {
          $q.dialog({
            title: 'Confirmation',
            message: 'Êtes-vous sûr(e) de vouloir définir moins de légendes&nbsp;? '
              + `Les légendes des niveaux ${Object.keys(payload).join(', ')} seront perdues.`,
            ok: true,
            html: true,
            cancel: 'Annuler',
          }).onOk(() => initializeLabels(payload, value))
            .onCancel(() => NotifyPositive('Action annulée.'));
        } else {
          initializeLabels(payload, value);
        }
      } catch (e) {
        console.error(e);
      }
    };

    const updateMaxLabel = async (value) => {
      try {
        maxLabel.value = value;
        v$.value.maxLabel.$touch();
        if (get(v$.value, 'maxLabel.$error')) return NotifyWarning('Champ(s) invalide(s).');
        const labelKeys = Object.keys(card.value.labels);
        const changeCountLabelPayload = {
          labels: {
            [labelKeys[0]]: card.value.labels[labelKeys[0]] || '',
            [labelKeys[1]]: null,
            [maxLabel.value]: card.value.labels[labelKeys[1]] || '',
          },
        };
        await updateCardLabels(maxLabel.value, changeCountLabelPayload);
      } catch (error) {
        console.error(error);
      }
    };

    return {
      // Data
      displayAllLabels,
      maxLabel,
      // Validation
      v$,
      // Computed
      card,
      isCardParentPublished,
      // Methods
      labelErrorMessage,
      updateCardLabels,
      errorMsg,
      saveTmp,
      updateCard,
      get,
      validateInitialization,
      updateMaxLabel,
    };
  },
};
</script>
<style lang="sass" scoped>
.container
  display: flex
  flex-direction: column
.max-label
  margin-bottom: 8px
  @media screen and (min-width: 768px)
    width: 20%

.checkbox-container
  grid-auto-flow: row
  display: grid
  grid-template-rows: auto
  @media screen and (min-width: 768px)
    grid-auto-rows: 1fr
    grid-template-columns: repeat(2, 1fr)

.input-container
  width: 80%
</style>
