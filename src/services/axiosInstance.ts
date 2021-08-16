import Axios from 'axios';

import { COINGECKO_API_BASE } from '../utils/constants';

export const axiosInstance = Axios.create({
  baseURL: COINGECKO_API_BASE,
});

// Add a response interceptor
axiosInstance.interceptors.response.use(
  response =>
    // Do something with response data
    response,
  error => {
    if (error?.response?.data?.error) {
      return Promise.reject(new Error(error.response.data.error));
    }

    return Promise.reject(new Error(error.message));
  },
);
