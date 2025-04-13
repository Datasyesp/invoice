import axios from "axios"

// API Configuration
const BASE_URL = "http://localhost:5001/api"
axios.defaults.baseURL = BASE_URL

// Product Type Definition
export type ProductType = {
  _id: string
  name: string
  itemCode: string
  description: string
  rate: number
  tax: number
  account: string
  unit: string
  salesPrice: number
  purchasePrice: number
  taxPreference: "taxable" | "non-taxable"
  category: string
  openingStock: number
  reorderLevel: number
  stockOnHand: number
  preferredVendor: string
  isActive: boolean
  hsnCode: string;
}

// API Functions
export const productApi = {
  getAllProducts: async (): Promise<ProductType[]> => {
    const response = await axios.get("/products/")
    return response.data
  },

  addProduct: async (product: Omit<ProductType, "_id" | "itemCode">): Promise<ProductType> => {
    try {
      const response = await axios.post("/products/addproduct", product)
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.error || "An error occurred while adding the product")
      }
      throw error
    }
  },

  updateProduct: async (id: string, updatedData: Partial<ProductType>): Promise<ProductType> => {
    const response = await axios.put(`/products/update/${id}`, updatedData)
    return response.data
  },

  deleteProduct: async (id: string): Promise<void> => {
    await axios.delete(`/products/delete/${id}`)
  },

  searchProduct: async (query: string): Promise<ProductType[]> => {
    const response = await axios.get(`/products/search?q=${query}`)
    return response.data
  },
}
