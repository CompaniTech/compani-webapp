import { alenviAxios } from '@api/ressources/alenviAxios';

export default {
  async get () {
    const vendorCompany = await alenviAxios.get(`${process.env.API_HOSTNAME}/vendorcompanies`);
    return vendorCompany.data.data.vendorCompany;
  },
  async update (payload) {
    await alenviAxios.put(`${process.env.API_HOSTNAME}/vendorcompanies`, payload);
  },
  async removeTemplate () {
    await alenviAxios.delete(`${process.env.API_HOSTNAME}/vendorcompanies/mandate/upload`);
  },
};
