<template>
  <q-btn :flat="flat" small no-caps :color="color" :icon="icon" :disable="disable" :type="type"
    :target="target" :label="label" :dense="!label" :loading="loading" :size="size" unelevated :padding="padding"
    @click.stop="click" :href="innerHref" />
</template>

<script>
import { toRefs, computed } from 'vue';

export default {
  name: 'NiButton',
  props: {
    color: { type: String, default: 'copper-500' },
    disable: { type: Boolean, default: false },
    flat: { type: Boolean, default: true },
    href: { type: String, default: undefined },
    icon: { type: String, default: undefined },
    label: { type: String, default: '' },
    loading: { type: Boolean, default: false },
    size: { type: String, default: 'md' }, // determine the font-size for label, icon is 1.715em of that
    type: { type: String, default: '' },
    unelevated: { type: Boolean, default: false },
  },
  emits: ['click'],
  setup (props, { emit }) {
    const { type, label, disable, href } = toRefs(props);

    const target = computed(() => (type.value === 'a' ? '_blank' : ''));

    const padding = computed(() => {
      if (type.value === 'a') return 'xs 0px';

      return label.value ? 'xs md' : 'xs';
    });

    const innerHref = computed(() => (disable.value ? undefined : href.value));

    const click = event => emit('click', event);

    return {
      // Computed
      target,
      padding,
      innerHref,
      // Methods
      click,
    };
  },
};
</script>

<style lang="sass" scoped>
:deep(.q-btn__wrapper)
  min-height: 2.572em !important
</style>
