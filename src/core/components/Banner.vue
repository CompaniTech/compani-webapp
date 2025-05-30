<template>
  <q-banner :class="`full-width warning q-mb-md ${customClass}`" dense>
    <q-icon size="sm" :name="icon" :color="iconColor" class="q-pr-xs" />
    <div><slot name="message" /></div>
  </q-banner>
</template>

<script>
import { computed, toRefs } from 'vue';
import { useRoute } from 'vue-router';
import { CLIENT, VENDOR } from '@data/constants';

export default {
  name: 'Banner',
  props: {
    icon: { type: String, default: 'warning' },
    contentClass: { type: String, default: '' },
    iconColor: { type: String, default: '' },
  },
  setup (props) {
    const { contentClass } = toRefs(props);
    const $route = useRoute();

    const interfaceType = /\/ad\//.test($route.path) ? VENDOR : CLIENT;

    const customClass = computed(() => contentClass.value ||
    (interfaceType === CLIENT ? 'bg-copper-grey-200' : 'bg-peach-200'));

    return {
      // Computed
      customClass,
    };
  },
};
</script>

<style lang="sass" scoped>
.q-banner
  :deep(.q-banner__content)
    display: flex
    align-items: center
    .q-icon
      margin-right: 4px
</style>
