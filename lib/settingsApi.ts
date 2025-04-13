import axios from 'axios';

const BASE_URL = 'http://localhost:5001/api';
axios.defaults.baseURL = BASE_URL;

export const settingsApi = {
    // Get user settings
    getUserSettings: async () => {
      try {
        const response = await axios.get('/user-settings');
        return response.data;
      } catch (error) {
        console.error('Error fetching settings:', error);
        throw error;
      }
    },
  
    // Update user settings
    updateUserSettings: async (updatedSettings: Partial<Settings>) => {
      try {
        const response = await axios.post('/user-settings', updatedSettings);
        return response.data;
      } catch (error) {
        console.error('Error updating settings:', error);
        if (axios.isAxiosError(error)) {
          throw new Error(error.response?.data?.message || 'An error occurred while updating the settings');
        } else {
          throw new Error('An unexpected error occurred');
        }
      }
    }
  };
  