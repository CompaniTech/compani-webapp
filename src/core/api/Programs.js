import { alenviAxios } from '@api/ressources/alenviAxios';

export default {
  async list () {
    const programs = await alenviAxios.get(`${process.env.API_HOSTNAME}/programs`);
    return programs.data.data.programs;
  },
  async create (payload) {
    await alenviAxios.post(`${process.env.API_HOSTNAME}/programs`, payload);
  },
  async getById (programId) {
    const program = await alenviAxios.get(`${process.env.API_HOSTNAME}/programs/${programId}`);
    return program.data.data.program;
  },
  async update (programId, payload) {
    await alenviAxios.put(`${process.env.API_HOSTNAME}/programs/${programId}`, payload);
  },
  async addSubProgram (programId, payload) {
    await alenviAxios.post(`${process.env.API_HOSTNAME}/programs/${programId}/subprograms`, payload);
  },
  async deleteImage (programId) {
    await alenviAxios.delete(`${process.env.API_HOSTNAME}/programs/${programId}/upload`);
  },
  async addCategory (programId, payload) {
    await alenviAxios.post(`${process.env.API_HOSTNAME}/programs/${programId}/categories`, payload);
  },
  async removeCategory (programId, categoryId) {
    await alenviAxios.delete(`${process.env.API_HOSTNAME}/programs/${programId}/categories/${categoryId}`);
  },
  async addTester (programId, payload) {
    await alenviAxios.post(`${process.env.API_HOSTNAME}/programs/${programId}/testers`, payload);
  },
  async removeTester (programId, testerId) {
    await alenviAxios.delete(`${process.env.API_HOSTNAME}/programs/${programId}/testers/${testerId}`);
  },
  async addTradeName (programId, payload) {
    await alenviAxios.post(`${process.env.API_HOSTNAME}/programs/${programId}/trade-names`, payload);
  },
  async removeTradeName (programId, tradeNameId) {
    await alenviAxios.delete(`${process.env.API_HOSTNAME}/programs/${programId}/trade-names/${tradeNameId}`);
  },
};
