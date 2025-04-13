import axios from 'axios';
import { Customer } from '../types/customer';

const BASE_URL = 'http://localhost:5001/api';
axios.defaults.baseURL = BASE_URL;

export const customerApi = {
  // Get all customers
  getAllCustomers: async () => {
    try {
      const response = await axios.get('/customers/');
      return response.data;
    } catch (error) {
      console.error('Error fetching customers:', error);
      throw error;
    }
  },

  // Add a new customer
  addCustomer: async (customer: Omit<Customer, '_id'>) => {
    try {
      const response = await axios.post('/customers/add', customer);
      if (response.status === 201) {
        return response.data.customer;
      }
      throw new Error('Failed to add customer');
    } catch (error) {
      console.error('Error adding customer:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'An error occurred while adding the customer');
      } else {
        throw new Error('An unexpected error occurred');
      }
    }
  },

  // Update customer details
  updateCustomer: async (id: string, updatedData: Partial<Customer>) => {
    try {
      const response = await axios.put(`/customers/update/${id}`, updatedData);
      return response.data;
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
  },

  // Delete a customer
  deleteCustomer: async (id: string) => {
    try {
      const response = await axios.delete(`/customers/delete/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting customer:', error);
      throw error;
    }
  },

  // Search for a customer
  searchCustomer: async (query: string) => {
    try {
      const response = await axios.get(`/customers/search?q=${query}`);
      return response.data;
    } catch (error) {
      console.error('Error searching customers:', error);
      throw error;
    }
  }
};

