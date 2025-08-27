import { alenviAxios } from '@api/ressources/alenviAxios';
import { downloadFile, getExtension } from '@helpers/file';

export default {
  async downloadFileById (driveId, name) {
    const file = await alenviAxios({
      url: `${process.env.API_HOSTNAME}/gdrive/file/${driveId}/download`,
      method: 'GET',
      responseType: 'blob',
    });

    const extension = getExtension(file.data.type);

    const fileName = `${name}.${extension}`;
    return downloadFile(file, fileName, 'application/octet-stream');
  },
};
