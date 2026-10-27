<template>
  <q-page padding class="vendor-background">
    <ni-title-header title="Historique de facturation" class="q-mb-xl" />
  </q-page>
</template>

<script>
import { useMeta } from 'quasar';
import TitleHeader from '@components/TitleHeader';

export default {
  name: 'TrainerBillsHistory',
  components: {
    'ni-title-header': TitleHeader,
  },
  setup () {
    const metaInfo = { title: 'Historique de facturation' };
    useMeta(metaInfo);
  },
};
</script>
