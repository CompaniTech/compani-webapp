<template>
  <div class="row">
    <div v-if="caption" class="caption input-caption">
      <p :class="[{ required: requiredField }]">{{ caption }}</p>
    </div>
    <q-icon v-if="error" name="error_outline" color="secondary" class="col-1" />
  </div>
  <div borderless class="container">
    <q-rating :model-value="modelValue" @update:model-value="update" :icon="icon" :max="maxLabel" :color="color"
      size="lg" class="q-my-md" :readonly="readonly">
      <template v-for="[tipKey, label] in formattedTipAndLabels" #[tipKey] :key="label">
        <q-tooltip v-if="label">{{ label }}</q-tooltip>
      </template>
    </q-rating>
  </div>
  <div class="error-message" v-if="error">{{ errorMessage }}</div>
  <ni-labels-details v-if="Object.keys(labels).length" :labels="labels" are-details-visible />
</template>

<script>
import { toRefs, ref } from 'vue';
import { REQUIRED_LABEL } from '@data/constants';
import LabelsDetails from '@components/LabelsDetails';

export default {
  name: 'Rating',
  props: {
    modelValue: { type: Number, default: 0 },
    labels: { type: Object, default: () => ({}) },
    icon: { type: [String, Array], default: 'circle' },
    caption: { type: String, default: '' },
    error: { type: Boolean, default: false },
    errorMessage: { type: String, default: REQUIRED_LABEL },
    requiredField: { type: Boolean, default: false },
    color: { type: String, default: 'primary' },
    readonly: { type: Boolean, default: false },
  },
  emits: ['update:model-value'],
  components: {
    'ni-labels-details': LabelsDetails,
  },
  setup (props, { emit }) {
    const { labels } = toRefs(props);
    const maxLabel = ref(Math.max(...Object.keys(labels.value).map(Number)));

    const update = (value) => {
      emit('update:model-value', value);
    };

    const formattedTipAndLabels = Object.entries(labels.value).map(([key, label]) => [`tip-${key}`, label]);

    return {
      // Data
      formattedTipAndLabels,
      maxLabel,
      // Methods
      update,
    };
  },
};
</script>
<style lang="sass" scoped>
.caption
  flex: 1
.container
  display: flex
  justify-content: center
.error-message
  color: $secondary
  line-height: 1
  font-size: 11px
  padding: 8px 0px
</style>
