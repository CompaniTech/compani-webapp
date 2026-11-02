<template>
  <div class="col-xs-12 col-md-6 row items-center">
    <div class="col-xs-10">
      <ni-input ref="bankDetailInput" :name="name" :caption="caption" :model-value="modelValue" :disable="locked"
        :error="error" :error-message="errorMessage" :required-field="requiredField"
        @update:model-value="$emit('update:model-value', $event)" @focus="$emit('focus')" />
    </div>
    <div class="col-xs-2 row no-wrap justify-start">
      <ni-button :icon="lockIcon" color="copper-grey-500" @click="toggleLock" />
      <ni-button v-if="deletable && locked && modelValue" icon="delete" color="primary"
        @click="$emit('delete')" />
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, nextTick, toRefs } from 'vue';
import Input from '@components/form/Input';
import Button from '@components/Button';
import { isMaskedBankDetail } from '@helpers/utils';

export default {
  name: 'NiBankDetailInput',
  components: {
    'ni-input': Input,
    'ni-button': Button,
  },
  props: {
    modelValue: { type: String, default: '' },
    name: { type: String, required: true },
    caption: { type: String, default: '' },
    error: { type: Boolean, default: false },
    errorMessage: { type: String, default: '' },
    requiredField: { type: Boolean, default: false },
    deletable: { type: Boolean, default: false },
  },
  emits: ['update:model-value', 'update:locked', 'focus', 'save', 'delete'],
  setup (props, { emit }) {
    const { modelValue, name } = toRefs(props);
    const bankDetailInput = ref(null);
    const locked = ref(true);
    const lockIcon = computed(() => (locked.value ? 'lock' : 'lock_open'));

    const unlock = async () => {
      locked.value = false;
      emit('update:model-value', '');
      await nextTick();
      bankDetailInput.value.$refs[name.value].focus();
    };

    const toggleLock = async () => {
      if (locked.value) return unlock();

      emit('save');
    };

    watch(locked, value => emit('update:locked', value), { immediate: true });

    watch(() => modelValue.value, (value) => {
      if (isMaskedBankDetail(value)) locked.value = true;
    });

    return {
      // Data
      bankDetailInput,
      locked,
      // Computed
      lockIcon,
      // Methods
      toggleLock,
    };
  },
};
</script>
