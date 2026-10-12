<template>
  <q-btn no-caps color="petrol" :class="buttonClass" :label="label" :icon="buttonIcon" :icon-right="iconRight"
    @click="click" :rounded="floatingButton" :disable="disable" :loading="loading" :unelevated="!floatingButton" />
</template>

<script>
import { toRefs, computed } from 'vue';
import { FLOATING, MODAL } from '@data/constants';

export default {
  name: 'PrimaryButton',
  props: {
    disable: { type: Boolean, default: false },
    icon: { type: String, default: undefined },
    label: { type: String, default: '' },
    loading: { type: Boolean, default: false },
    mode: { type: String, default: '' },
  },
  emits: ['click'],
  setup (props, { emit }) {
    const { mode, icon } = toRefs(props);

    const click = (event) => { emit('click', event); };

    const buttonClass = computed(() => {
      if (mode.value === FLOATING) return 'fixed fab-custom';
      if (mode.value === MODAL) return 'full-width modal-btn';

      return '';
    });

    const floatingButton = computed(() => mode.value === FLOATING);

    const iconRight = computed(() => {
      if (mode.value === MODAL) return icon.value;

      return undefined;
    });

    const buttonIcon = computed(() => {
      if (!iconRight.value) return icon.value;

      return undefined;
    });

    return {
      // Data
      FLOATING,
      MODAL,
      // Computed
      buttonClass,
      buttonIcon,
      iconRight,
      floatingButton,
      // Methods
      click,
    };
  },
};

</script>
