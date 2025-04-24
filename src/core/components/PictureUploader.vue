<template>
  <div class="row" style="background: white">
    <div class="row justify-center col-xs-12" style="padding: 12px 0px;">
      <cropper v-if="displayCropper" ref="cropper" :src="image" class="cropper" :stencil-props="{ aspectRatio: 1/1 }" />
      <ni-custom-img v-if="!displayCropper && hasPicture" :image-source="pictureLink" alt="Photo de profil" />
      <ni-custom-img v-if="!displayCropper && !hasPicture" :image-source="DEFAULT_AVATAR" alt="Photo par défaut" />
    </div>
    <div class="row justify-center col-xs-12">
      <div v-if="!displayCropper && hasPicture">
        <ni-button icon="mdi-square-edit-outline" size="1rem" @click="displayCropper = true" />
        <ni-button icon="delete" size="1rem" @click="validateImageDeletion" />
        <ni-button icon="save_alt" size="1rem" type="a" :href="pictureDlLink(pictureLink)" />
      </div>
      <div v-if="displayCropper">
        <ni-button size="1rem" icon="close" @click="displayCropper = false" />
        <ni-button size="1rem" icon="rotate_left" @click="() => rotate(-90)" />
        <ni-button size="1rem" icon="rotate_right" @click="() => rotate(90)" />
        <ni-button size="1rem" icon="done" @click="uploadImage" :loading="loadingImage" />
      </div>
      <div v-if="!displayCropper && !hasPicture" class="row input-file-container" @click="openFileSelection">
        <span class="input-file-empty">Ajouter une photo</span>
        <i aria-hidden="true" class="q-icon on-right material-icons self-center relative-position">
          add
          <input ref="file" type="file" class="input-file absolute-full cursor-pointer" accept="image/*"
            @change="loadImage($event)">
        </i>
      </div>
    </div>
  </div>
</template>

<script>
import { Cropper } from 'vue-advanced-cropper';
import 'vue-advanced-cropper/dist/style.css';
import get from 'lodash/get';
import Users from '@api/Users';
import Button from '@components/Button';
import { NotifyPositive, NotifyNegative } from '@components/popup/notify';
import CustomImg from '@components/form/CustomImg';
import { DEFAULT_AVATAR } from '@data/constants';
import { removeDiacritics } from '@helpers/utils';
import { computed, toRefs, ref, useTemplateRef } from 'vue';
import { useQuasar } from 'quasar';

export default {
  name: 'PictureUploader',
  props: {
    user: { type: Object, default: () => ({}) },
    refreshPicture: { type: Function, default: () => {} },
  },
  components: {
    cropper: Cropper,
    'ni-custom-img': CustomImg,
    'ni-button': Button,
  },
  setup (props) {
    const { user, refreshPicture } = toRefs(props);
    const $q = useQuasar();
    const file = useTemplateRef('file');
    const cropper = useTemplateRef('cropper');
    const image = ref('');
    const displayCropper = ref(false);
    const loadingImage = ref(false);

    const hasPicture = computed(() => !!pictureLink.value);

    const pictureLink = computed(() => get(user.value, 'picture.link') || null);

    const noDiacriticLastname = computed(() => removeDiacritics(get(user.value, 'identity.lastname') || ''));

    const noDiacriticFirstname = computed(() => removeDiacritics(get(user.value, 'identity.firstname') || ''));

    const openFileSelection = () => { if (file.value) file.value.click(); };

    const loadImage = (event) => {
      const { files } = event.target;

      if (files && files[0]) {
        if (image.value) URL.revokeObjectURL(image.value);

        const blob = URL.createObjectURL(files[0]);

        const reader = new FileReader();
        reader.onload = (e) => { image.value = blob; };
        reader.readAsArrayBuffer(files[0]);
        displayCropper.value = true;
      }
    };

    const rotate = angle => cropper.value.rotate(angle);

    const uploadImage = async () => {
      const { canvas } = cropper.value.getResult();
      if (canvas) {
        await canvas.toBlob(async (blob) => {
          loadingImage.value = true;

          const data = new FormData();
          data.append(
            'fileName',
            `photo_${noDiacriticFirstname.value}_${noDiacriticLastname.value}`
          );
          data.append('file', blob);

          await Users.uploadImage(user.value._id, data);
          await refreshPicture.value();

          displayCropper.value = false;
          loadingImage.value = false;
        }, 'image/jpeg');
      }
    };

    const validateImageDeletion = () => {
      $q.dialog({
        title: 'Confirmation',
        message: 'Êtes-vous sûr(e) de vouloir supprimer votre photo&nbsp;?',
        html: true,
        ok: true,
        cancel: 'Annuler',
      })
        .onOk(deleteImage)
        .onCancel(() => NotifyPositive('Suppression annulée.'));
    };

    const deleteImage = async () => {
      try {
        if (get(user.value, 'picture.publicId')) {
          await Users.deleteImage(user.value._id);
          image.value = '';

          await refreshPicture.value();

          NotifyPositive('Photo supprimée');
        } else NotifyNegative('Erreur lors de la suppression de la photo.');
      } catch (e) {
        console.error(e);
        NotifyNegative('Erreur lors de la suppression de la photo.');
      }
    };

    const pictureDlLink = link => (link
      ? link.replace(/(\/upload)/i, `$1/fl_attachment:photo_${noDiacriticFirstname.value}_${noDiacriticLastname.value}`)
      : '');

    const created = () => {
      image.value = get(user.value, 'picture.link') || '';
    };

    created();

    return {
      DEFAULT_AVATAR,
      pictureLink,
      hasPicture,
      openFileSelection,
      loadImage,
      rotate,
      uploadImage,
      validateImageDeletion,
      pictureDlLink,
      image,
      file,
      cropper,
      displayCropper,
      loadingImage,
    };
  },
};
</script>

<style lang="sass" scoped>
.cropper
  height: 150px
  width: 150px

.input-file-container
  padding: 6px 10px
  color: $copper-500
  cursor: pointer
  .input-file-empty
    font-size: 14px
  .input-file
    opacity: 0
    max-width: 100%
    height: 100%
    width: 100%
    font-size: 0
</style>
