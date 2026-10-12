<template>
  <div class="profile-tabs flex-column">
    <q-tabs align="justify" color="transparent" v-model="selectedTab" no-caps>
      <q-tab v-for="(tab, index) in tabsContent" :key="index" :label="tab.label" :name="tab.name" :alert="alert(tab)" />
    </q-tabs>
    <q-tab-panels v-model="selectedTab" class="no-border" flat>
      <q-tab-panel v-for="(tab, index) in tabsContent" :name="tab.name" :key="index">
        <component :is="tab.component" :profile-id="profileId" />
      </q-tab-panel>
    </q-tab-panels>
  </div>
</template>

<script>
import { ref, watch, toRefs } from 'vue';

export default {
  name: 'ProfileTabs',
  props: {
    tabsContent: { type: Array, default: () => [] },
    profileId: { type: String, default: '' },
    notifications: { type: Object, default: () => ({}) },
  },
  emits: ['refresh'],
  setup (props, { emit }) {
    const { notifications, profileId, tabsContent } = toRefs(props);

    const selectedTab = ref(null);

    watch(selectedTab, (_, oldValue) => {
      if (oldValue) emit('refresh');
    });

    const alert = tab => (tab.notification && notifications.value && notifications.value[tab.notification]
      ? notifications.value[tab.notification][profileId.value]
      : false);

    const created = () => {
      selectedTab.value = tabsContent.value.find(tab => tab.default).name;
    };

    created();

    return {
      // Data
      selectedTab,
      // Methods
      alert,
    };
  },
};
</script>

<style lang="sass" scoped>
.profile-tabs
  :deep(.q-tab--active)
    & > .q-tab__indicator
      color: $primary
  :deep(.q-tab__indicator)
    color: $navy-20
    opacity: 1
  .q-tab-panels
    background-color: inherit
    flex: 1
    display: flex
    flex-direction: column
    .scroll
      overflow: initial
    :deep(.q-panel)
      flex: 1
      display: flex
      flex-direction: column
      .q-tab-panel
        flex: 1
        display: flex
        flex-direction: column
        > div
          flex: 1
  & :deep(.q-tabs)
    & .q-tabs__content
      & .q-tab
        flex: 1 1 0
        padding-left: 0px
        justify-content: start
        margin-right: 24px
        @media screen and (max-width: 767px)
          max-width: 66%
        @media screen and (min-width: 768px)
          max-width: 33%
        & .q-tab__content
          & .q-tab__label
            font-size: 24px
          & .q-tab__alert
            background: $secondary
        &:before
          background: none
      & :not(.q-tab--active)
        & .q-tab__content
          & .q-tab__label
            color: $navy
      & .q-tab--active
        & .q-tab__content
          & .q-tab__label
            color: $primary
</style>
