<template>
  <div class="row q-mb-md justify-between">
    <div :class="[titleContainerClass, 'page-title']">{{ title }}</div>
    <div v-if="displaySearchBar" :class="searchBarContainerClass">
      <q-input class="no-border" :model-value="search" :placeholder="searchPlaceholder" dense borderless
        @update:model-value="input" debounce="0" type="search" bg-color="white">
        <template #prepend>
          <q-icon size="xs" name="search" />
        </template>
      </q-input>
    </div>
    <div v-if="displayToggle" class="col-xs-12 col-md-2 row justify-end">
      <q-toggle dense :model-value="toggleValue" color="primary" :label="toggleLabel" @update:model-value="toggle" />
    </div>
  </div>
</template>

<script>
import { toRefs, computed } from 'vue';
import { useQuasar } from 'quasar';

export default {
  name: 'DirectoryHeader',
  props: {
    title: { type: String, default: '' },
    searchPlaceholder: { type: String, default: 'Rechercher un profil' },
    toggleLabel: { type: String, default: '' },
    toggleValue: { type: Boolean, default: false },
    displayToggle: { type: Boolean, default: false },
    displaySearchBar: { type: Boolean, default: true },
    search: { type: String, default: '' },
  },
  emits: ['update-search', 'toggle'],
  setup (props, { emit }) {
    const { displayToggle } = toRefs(props);
    const $q = useQuasar();

    const titleContainerClass = computed(() => [
      'col-xs-12', displayToggle.value ? 'col-md-5' : 'col-md-6', { 'q-mb-sm': $q.platform.is.mobile },
    ]);

    const searchBarContainerClass = computed(() => ['col-xs-12', displayToggle.value ? 'col-md-5' : 'col-md-6']);

    const input = (value) => { emit('update-search', value); };

    const toggle = (value) => { emit('toggle', value); };

    return {
      // Computed
      titleContainerClass,
      searchBarContainerClass,
      // Methods
      input,
      toggle,
    };
  },
};
</script>

<style lang="sass" scoped>
.q-option
  font-size: 14px
.q-input
  :deep(.q-field__control)
    font-size: 14px
</style>
