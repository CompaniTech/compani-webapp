import { ref } from 'vue';
import CompletionCertificates from '@api/CompletionCertificates';
import { NotifyNegative } from '@components/popup/notify';

export const useCompletionCertificates = (completionCertificates, monthOptions = []) => {
  const tableLoading = ref(false);
  const pagination = ref({ page: 1, rowsPerPage: 15 });

  const getCompletionCertificates = async (query) => {
    try {
      tableLoading.value = true;
      const certificates = await CompletionCertificates.list(query);

      completionCertificates.value = certificates;
    } catch (error) {
      console.error(error);
      NotifyNegative('Erreur lors de la récupération des certificats.');
    } finally {
      tableLoading.value = false;
    }
  };

  return {
    // Data
    tableLoading,
    pagination,
    // Methods
    getCompletionCertificates,
  };
};
