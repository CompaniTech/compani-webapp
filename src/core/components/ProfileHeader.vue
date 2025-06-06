<template>
  <div class="header">
    <div class="flex-row q-mb-md items-center">
      <ni-button class="on-left" icon="arrow_back" color="primary" @click="$router.go(-1)" />
      <span class="ellipsis page-title flex-1">{{ title }}</span>
      <slot name="title" />
    </div>
    <div v-if="formattedHeaderInfo" class="row profile-info header-info">
      <q-item v-for="info of formattedHeaderInfo" :key="info.icon">
        <q-item-section side>
          <q-icon size="xs" :name="info.icon" :class="info.iconClass" />
        </q-item-section>
        <q-item-section :class="info.labelClass">{{ info.label }}</q-item-section>
      </q-item>
    </div>
  </div>
</template>

<script>
import { toRefs, computed } from 'vue';
import Button from '@components/Button';

export default {
  name: 'ProfileHeader',
  props: {
    title: { type: String, default: '' },
    headerInfo: { type: Array, default: () => [] },
  },
  components: {
    'ni-button': Button,
  },
  setup (props) {
    const { headerInfo } = toRefs(props);

    const formattedHeaderInfo = computed(() => headerInfo.value
      .map(info => ({ labelClass: info.class, iconClass: info.class, ...info })));

    return {
      // Computed
      formattedHeaderInfo,
    };
  },
};
</script>

<style lang="sass" scoped>
.q-item
  min-height: 0
.header-info
  display: flex
  flex: 1
  justify-content: flex-start
</style>
