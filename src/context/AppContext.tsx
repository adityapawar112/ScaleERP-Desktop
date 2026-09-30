import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { ElectronAPI } from '../types/electron';

// Ensure ElectronAPI types are available globally
declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

// Define types for our data
export interface ManufacturerStock {
  id: string; // Primary key from product_manufacturers table
  manufacturerId: string;
  manufacturerName: string;
  quantity: number;
  isArchived?: boolean;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
  manufacturerStocks: ManufacturerStock[];
  stockHistory: StockHistory[];
  isArchived?: boolean;
}

export interface StockHistory {
  id: string;
  date: string;
  time?: string;
  type: 'in' | 'out';
  quantity: number;
  notes: string;
  brokerId?: string;
  manufacturerId?: string;
  leisureCreated?: boolean;
}

export interface Broker {
  id: string;
  name: string;
  contact: string;
  address: string;
  totalPending: number;
  totalPaid: number;
}

export interface Customer {
  id: string;
  name: string;
  contact: string;
  address: string;
  totalPending: number;
  totalPaid: number;
}

export interface Leisure {
  id: string;
  brokerId: string;
  brokerName: string;
  type: 'purchase' | 'payable';
  amount: number;
  brokerage?: number;
  transactionId?: string;
  paymentMethod?: 'UPI' | 'Cash';
  date: string;
  time: string;
  notes: string;
}

export interface CustomerLeisure {
  id: string;
  customerId: string;
  customerName: string;
  type: 'receivable' | 'sale';
  amount: number;
  transactionId?: string;
  paymentMethod?: 'UPI' | 'Cash';
  date: string;
  time: string;
  notes: string;
}

export interface BrokerTransaction {
  id: string;
  brokerId: string;
  date: string;
  time: string;
  invoiceNumber?: string;
  totalBrokerage?: number;
  products: Array<{
    productId: string;
    manufacturerId: string;
    units: number;
    unitType: 'tonnes' | 'units';
    rate: number;
    brokeragePerUnit?: number;
    brokerage?: number;
    total: number;
  }>;
  previousBalance: number;
  totalAmount: number;
  paymentMethod: 'UPI' | 'cash';
}

export interface CustomerTransaction {
  id: string;
  customerId?: string;
  date: string;
  time: string;
  invoiceNumber?: string;
  labourCharge?: number;
  products: Array<{
    productId: string;
    manufacturerId: string;
    quantity: number;
    unitType: 'tonnes' | 'units';
    price: number;
    labour: number;
    total: number;
  }>;
  totalAmount: number;
  previousBalance?: number;
  paymentMethod: 'UPI' | 'cash';
}

export interface BusinessSettings {
  businessName: string;
  address: string;
  proprietorName: string;
  phoneNumbers: string[];
  invoiceWhatsappTemplate?: string;
  logoPath?: string | null;
  headerBannerPath?: string | null;
  qrCodePath?: string | null;
  defaultInvoiceTemplate?: string;
  invoiceAccentColor?: string;
  printCopies?: number;
  printLayoutMode?: 'single' | 'dual_compact' | 'thermal';
  customFooterText?: string;
}

export interface WhatsAppPreset {
  id: string;
  title: string;
  message: string;
}

interface AppContextType {
  products: Product[];
  brokers: Broker[];
  customers: Customer[];
  leisures: Leisure[];
  customerLeisures: CustomerLeisure[];
  brokerTransactions: BrokerTransaction[];
  customerTransactions: CustomerTransaction[];
  whatsappPresets: WhatsAppPreset[];
  fixedProducts: string[];
  businessSettings: BusinessSettings;
  addProduct: (product: Omit<Product, 'id' | 'stockHistory'>) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  addStockMovement: (productId: string, movement: Omit<StockHistory, 'id'>) => void;
  addBroker: (broker: Omit<Broker, 'id' | 'totalPending' | 'totalPaid'>) => void;
  updateBroker: (broker: Broker) => void;
  deleteBroker: (id: string) => void;
  addCustomer: (customer: Omit<Customer, 'id' | 'totalPending' | 'totalPaid'>) => void;
  updateCustomer: (customer: Customer) => void;
  deleteCustomer: (id: string) => void;
  addLeisure: (leisure: Omit<Leisure, 'id' | 'brokerName'>) => void;
  updateLeisure: (leisure: Leisure) => void;
  deleteLeisure: (id: string) => void;
  addCustomerLeisure: (leisure: Omit<CustomerLeisure, 'id' | 'customerName'>) => void;
  updateCustomerLeisure: (leisure: CustomerLeisure) => void;
  deleteCustomerLeisure: (id: string) => void;
  addBrokerTransaction: (transaction: Omit<BrokerTransaction, 'id'>) => void;
  updateBrokerTransaction: (transaction: BrokerTransaction) => void;
  deleteBrokerTransaction: (id: string) => void;
  addCustomerTransaction: (transaction: Omit<CustomerTransaction, 'id'>) => void;
  updateCustomerTransaction: (transaction: CustomerTransaction) => void;
  deleteCustomerTransaction: (id: string) => void;
  getDailySalesTotal: (date: string) => number;
  getMonthlySalesTotal: (year: number, month: number) => number;
  updateBusinessSettings: (settings: BusinessSettings) => void;
  reloadCompleteProductData: () => Promise<void>;
  archiveProduct: (id: string) => Promise<void>;
  unarchiveProduct: (id: string) => Promise<void>;
  archiveManufacturer: (id: string) => Promise<void>;
  unarchiveManufacturer: (manufacturerId: string) => Promise<void>;
  addManufacturer: (productId: string, manufacturerName: string) => Promise<void>;
  updateManufacturerName: (id: string, newName: string) => Promise<void>;
  addWhatsAppPreset: (preset: Omit<WhatsAppPreset, 'id'>) => Promise<void>;
  updateWhatsAppPreset: (preset: WhatsAppPreset) => Promise<void>;
  deleteWhatsAppPreset: (id: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);
// eslint-disable-next-line react-refresh/only-export-components
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

const transformBrokerTransaction = (transaction: any): BrokerTransaction => ({
  id: transaction.id,
  brokerId: transaction.broker_id,
  date: transaction.date,
  time: transaction.time || '12:00',
  invoiceNumber: transaction.invoice_number,
  totalBrokerage: transaction.total_brokerage || 0,
  products: transaction.products?.map((product: any) => ({
    productId: product.product_id,
    manufacturerId: product.manufacturer_id,
    units: product.units,
    unitType: product.unit_type,
    rate: product.rate,
    brokeragePerUnit: product.brokerage_per_unit || 0,
    brokerage: product.brokerage || 0,
    total: product.total
  })) || [],
  previousBalance: transaction.previous_balance || 0,
  totalAmount: transaction.total_amount,
  paymentMethod: transaction.payment_method as 'UPI' | 'cash'
});

const transformCustomerTransaction = (transaction: any): CustomerTransaction => ({
  id: transaction.id,
  customerId: transaction.customer_id,
  date: transaction.date,
  time: transaction.time || '12:00',
  invoiceNumber: transaction.invoice_number,
  labourCharge: transaction.labour_charge || 0,
  products: transaction.products?.map((product: any) => ({
    productId: product.product_id,
    manufacturerId: product.manufacturer_id,
    quantity: product.quantity,
    unitType: product.unit_type,
    price: product.price,
    labour: product.labour,
    total: product.total
  })) || [],
  totalAmount: transaction.total_amount,
  previousBalance: transaction.previous_balance || 0,
  paymentMethod: transaction.payment_method as 'UPI' | 'cash'
});

const transformBrokerLeisure = (leisure: any): Leisure => ({
  id: leisure.id,
  brokerId: leisure.broker_id,
  brokerName: leisure.broker_name,
  type: leisure.type,
  amount: leisure.amount,
  brokerage: leisure.brokerage || 0,
  transactionId: leisure.transaction_id,
  paymentMethod: leisure.payment_method as 'UPI' | 'Cash',
  date: leisure.date,
  time: leisure.time || '12:00',
  notes: leisure.notes || ''
});

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  // Fixed products array
  const fixedProducts = ['prod1', 'prod2', 'prod3', 'prod4', 'prod5', 'prod6', 'prod7'];

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [leisures, setLeisures] = useState<Leisure[]>([]);
  const [customerLeisures, setCustomerLeisures] = useState<CustomerLeisure[]>([]);
  const [brokerTransactions, setBrokerTransactions] = useState<BrokerTransaction[]>([]);
  const [customerTransactions, setCustomerTransactions] = useState<CustomerTransaction[]>([]);
  const [whatsappPresets, setWhatsappPresets] = useState<WhatsAppPreset[]>([]);

  // Settings state
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>({
    businessName: '',
    address: '',
    proprietorName: '',
    phoneNumbers: [''],
    invoiceWhatsappTemplate: 'Tax Invoice for {partyName} dated {dateStr}',
    logoPath: null,
    headerBannerPath: null,
    qrCodePath: null,
    defaultInvoiceTemplate: 'standard_a4',
    invoiceAccentColor: '#2563eb',
    printCopies: 1,
    printLayoutMode: 'single',
    customFooterText: '',
  });

  // Load data from database on mount
  useEffect(() => {
    const loadDataFromDatabase = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!window.electronAPI) {
          throw new Error('Electron API not available');
        }

        console.log('Loading data from database...');

        // Load all data using IPC calls
        const [
          productsData,
          brokersData,
          customersData,
          brokerTransactionsData,
          customerTransactionsData,
          brokerLeisuresData,
          customerLeisuresData,
          businessSettingsData,
          productManufacturersData,
          stockHistoryData
        ] = await Promise.all([
          window.electronAPI.invoke('db:products:getAll').catch(() => []),
          window.electronAPI.invoke('db:brokers:getAll').catch(() => []),
          window.electronAPI.invoke('db:customers:getAll').catch(() => []),
          window.electronAPI.invoke('db:brokerTransactions:getAll').catch(() => []),
          window.electronAPI.invoke('db:customerTransactions:getAll').catch(() => []),
          window.electronAPI.invoke('db:brokerLeisures:getAll').catch(() => []),
          window.electronAPI.invoke('db:customerLeisures:getAll').catch(() => []),
          window.electronAPI.invoke('db:businessSettings:getAll').catch(() => []),
          window.electronAPI.invoke('db:productManufacturers:getAll').catch(() => []),
          window.electronAPI.invoke('db:stockHistory:getAll').catch(() => [])
        ]);

        // Transform and set products with manufacturer stocks and stock history
        const transformedProducts = productsData.map((product: any) => {
          // Get stock history for this product
          const productStockHistory = stockHistoryData
            .filter((history: any) => history.product_id === product.id)
            .map((history: any) => ({
              id: history.id,
              date: history.date,
              time: history.time,
              type: history.type,
              quantity: history.quantity,
              notes: history.notes || '',
              brokerId: history.broker_id,
              manufacturerId: history.manufacturer_id,
              leisureCreated: history.leisure_created === 1
            }));

          // Get manufacturer stocks for this product (include all manufacturers)
          const manufacturerStocks = productManufacturersData
            .filter((pm: any) => pm.product_id === product.id)
            .map((pm: any) => ({
              id: pm.id,
              manufacturerId: pm.manufacturer_id,
              manufacturerName: pm.manufacturer_name,
              quantity: pm.quantity,
              isArchived: pm.is_archived === 1
            }));

          // If no manufacturer stocks found, add default "General Manufacturer"
          if (manufacturerStocks.length === 0) {
            manufacturerStocks.push({
              id: `pm_default_${product.id}`,
              manufacturerId: 'general',
              manufacturerName: 'General Manufacturer',
              quantity: product.stock_quantity || 0,
              isArchived: false
            });
          }

          return {
            id: product.id,
            name: product.name,
            description: product.description || '',
            price: product.price || 0,
            stockQuantity: product.stock_quantity || 0,
            manufacturerStocks: manufacturerStocks,
            stockHistory: productStockHistory,
            isArchived: product.is_archived === 1
          };
        });
        setProducts(transformedProducts);

        // Transform and set brokers
        const transformedBrokers = brokersData.map((broker: any) => ({
          id: broker.id,
          name: broker.name,
          contact: broker.contact || '',
          address: broker.address || '',
          totalPending: broker.total_pending || 0,
          totalPaid: broker.total_paid || 0
        }));
        setBrokers(transformedBrokers);

        // Transform and set customers
        const transformedCustomers = customersData.map((customer: any) => ({
          id: customer.id,
          name: customer.name,
          contact: customer.contact || '',
          address: customer.address || '',
          totalPending: customer.total_pending || 0,
          totalPaid: customer.total_paid || 0
        }));
        setCustomers(transformedCustomers);

        // Transform and set broker transactions
        const transformedBrokerTransactions = brokerTransactionsData.map((transaction: any) => ({
          id: transaction.id,
          brokerId: transaction.broker_id,
          date: transaction.date,
          time: transaction.time || '12:00',
          invoiceNumber: transaction.invoice_number,
          totalBrokerage: transaction.total_brokerage || 0,
          products: transaction.products?.map((product: any) => ({
            productId: product.product_id,
            manufacturerId: product.manufacturer_id,
            units: product.units,
            unitType: product.unit_type,
            rate: product.rate,
            brokeragePerUnit: product.brokerage_per_unit || 0,
            brokerage: product.brokerage || 0,
            total: product.total
          })) || [],
          previousBalance: transaction.previous_balance || 0,
          totalAmount: transaction.total_amount,
          paymentMethod: transaction.payment_method as 'UPI' | 'cash'
        }));
        setBrokerTransactions(transformedBrokerTransactions);

        // Transform and set customer transactions
        const transformedCustomerTransactions = customerTransactionsData.map((transaction: any) => ({
          id: transaction.id,
          customerId: transaction.customer_id,
          date: transaction.date,
          time: transaction.time || '12:00',
          invoiceNumber: transaction.invoice_number,
          labourCharge: transaction.labour_charge || 0,
          products: transaction.products?.map((product: any) => ({
            productId: product.product_id,
            manufacturerId: product.manufacturer_id,
            quantity: product.quantity,
            unitType: product.unit_type,
            price: product.price,
            labour: product.labour,
            total: product.total
          })) || [],
          totalAmount: transaction.total_amount,
          previousBalance: transaction.previous_balance || 0,
          paymentMethod: transaction.payment_method as 'UPI' | 'cash'
        }));
        setCustomerTransactions(transformedCustomerTransactions);

        // Transform and set broker leisures
        const transformedBrokerLeisures = brokerLeisuresData.map((leisure: any) => ({
          id: leisure.id,
          brokerId: leisure.broker_id,
          brokerName: leisure.broker_name,
          type: leisure.type,
          amount: leisure.amount,
          brokerage: leisure.brokerage || 0,
          transactionId: leisure.transaction_id,
          paymentMethod: leisure.payment_method as 'UPI' | 'Cash',
          date: leisure.date,
          time: leisure.time || '12:00',
          notes: leisure.notes || ''
        }));
        setLeisures(transformedBrokerLeisures);

        // Transform and set customer leisures
        const transformedCustomerLeisures = customerLeisuresData.map((leisure: any) => ({
          id: leisure.id,
          customerId: leisure.customer_id,
          customerName: leisure.customer_name,
          type: leisure.type,
          amount: leisure.amount,
          transactionId: leisure.transaction_id,
          paymentMethod: leisure.payment_method as 'UPI' | 'Cash',
          date: leisure.date,
          time: leisure.time || '12:00',
          notes: leisure.notes || ''
        }));
        setCustomerLeisures(transformedCustomerLeisures);

        // Load and set business settings
        if (businessSettingsData && businessSettingsData.length > 0) {
          const dbSettings = businessSettingsData[0];
          const loadedBusinessSettings: BusinessSettings = {
            businessName: dbSettings.business_name || '',
            address: dbSettings.address || '',
            proprietorName: dbSettings.proprietor_name || '',
            phoneNumbers: dbSettings.phone_numbers ? dbSettings.phone_numbers.split(', ').filter((p: string) => p.trim()) : [''],
            invoiceWhatsappTemplate: dbSettings.invoice_whatsapp_template || 'Tax Invoice for {partyName} dated {dateStr}',
            logoPath: dbSettings.logo_path || null,
            headerBannerPath: dbSettings.header_banner_path || null,
            qrCodePath: dbSettings.qr_code_path || null,
            defaultInvoiceTemplate: dbSettings.default_invoice_template || 'standard_a4',
            invoiceAccentColor: dbSettings.invoice_accent_color || '#2563eb',
            printCopies: Number.isFinite(Number(dbSettings.print_copies)) ? Number(dbSettings.print_copies) : 1,
            printLayoutMode: (dbSettings.print_layout_mode || 'single') as any,
            customFooterText: dbSettings.custom_footer_text || '',
          };
          setBusinessSettings(loadedBusinessSettings);
        }

        // Load WhatsApp presets
        const whatsappPresetsData = await window.electronAPI.invoke('db:whatsappPresets:getAll').catch(() => []);
        const transformedPresets = whatsappPresetsData.map((preset: any) => ({
          id: preset.id,
          title: preset.title,
          message: preset.message
        }));
        setWhatsappPresets(transformedPresets);

        console.log('Data loaded from database successfully');
      } catch (error) {
        console.error('Failed to load data from database:', error);
        setError(error instanceof Error ? error.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadDataFromDatabase();
  }, []);

  // Helper function to reload complete product data
  const reloadCompleteProductData = async () => {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }

    const productsData = await window.electronAPI.invoke('db:products:getAll');
    const productManufacturersData = await window.electronAPI.invoke('db:productManufacturers:getAll');
    const stockHistoryData = await window.electronAPI.invoke('db:stockHistory:getAll');

    const transformedProducts = productsData.map((product: any) => {
      // Get manufacturer stocks for this product (include all manufacturers)
      const manufacturerStocks = productManufacturersData
        .filter((pm: any) => pm.product_id === product.id)
        .map((pm: any) => ({
          id: pm.id,
          manufacturerId: pm.manufacturer_id,
          manufacturerName: pm.manufacturer_name,
          quantity: pm.quantity,
          isArchived: pm.is_archived === 1
        }));

      // If no manufacturer stocks found, add default "General Manufacturer"
      if (manufacturerStocks.length === 0) {
        manufacturerStocks.push({
          id: `pm_default_${product.id}`,
          manufacturerId: 'general',
          manufacturerName: 'General Manufacturer',
          quantity: product.stock_quantity || 0,
          isArchived: false
        });
      }

      // Get stock history for this product
      const productStockHistory = stockHistoryData
        .filter((history: any) => history.product_id === product.id)
        .map((history: any) => ({
          id: history.id,
          date: history.date,
          time: history.time,
          type: history.type,
          quantity: history.quantity,
          notes: history.notes || '',
          brokerId: history.broker_id,
          manufacturerId: history.manufacturer_id,
          leisureCreated: history.leisure_created === 1
        }));

      return {
        id: product.id,
        name: product.name,
        description: product.description || '',
        price: product.price || 0,
        stockQuantity: product.stock_quantity || 0,
        manufacturerStocks: manufacturerStocks,
        stockHistory: productStockHistory,
        isArchived: product.is_archived === 1
      };
    });

    setProducts(transformedProducts);
  };

  // Archive/Restore functions
  const archiveProduct = async (id: string) => {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }
      await window.electronAPI.invoke('db:products:archive', id);
      await reloadCompleteProductData();
    } catch (error) {
      console.error('Failed to archive product:', error);
      throw error;
    }
  };

  const unarchiveProduct = async (id: string) => {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }
      await window.electronAPI.invoke('db:products:unarchive', id);
      await reloadCompleteProductData();
    } catch (error) {
      console.error('Failed to unarchive product:', error);
      throw error;
    }
  };

  const archiveManufacturer = async (id: string) => {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      // Find the product that owns this manufacturer
      const product = products.find(p =>
        p.manufacturerStocks.some(m => m.id === id)
      );

      if (!product) {
        throw new Error('Product not found for manufacturer');
      }

      // Find the manufacturer by id
      const manufacturer = product.manufacturerStocks.find(m => m.id === id);
      if (!manufacturer) {
        throw new Error('Manufacturer not found');
      }

      // Check if this is the last active manufacturer BEFORE archiving
      const activeManufacturers = product.manufacturerStocks.filter(m => !m.isArchived);
      const isLastActiveManufacturer = activeManufacturers.length === 1 && activeManufacturers[0].id === id;

      // Archive the manufacturer using id (primary key)
      await window.electronAPI.invoke('db:productManufacturers:archive', id);

      // If this was the last active manufacturer, also archive the product
      if (isLastActiveManufacturer) {
        await window.electronAPI.invoke('db:products:archive', product.id);
      }

      await reloadCompleteProductData();
    } catch (error) {
      console.error('Failed to archive manufacturer:', error);
      throw error;
    }
  };

  const unarchiveManufacturer = async (manufacturerId: string) => {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }
      await window.electronAPI.invoke('db:productManufacturers:unarchive', manufacturerId);
      await reloadCompleteProductData();
    } catch (error) {
      console.error('Failed to unarchive manufacturer:', error);
      throw error;
    }
  };

  const addManufacturer = async (productId: string, manufacturerName: string) => {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substr(2, 9);
      const manufacturerId = `manuf_${timestamp}_${randomSuffix}`;
      const pmId = `pm_${timestamp}_${randomSuffix}`;

      await window.electronAPI.invoke('db:productManufacturers:insert', {
        id: pmId,
        product_id: productId,
        manufacturer_id: manufacturerId,
        manufacturer_name: manufacturerName,
        quantity: 0
      });

      await reloadCompleteProductData();
    } catch (error) {
      console.error('Failed to add manufacturer:', error);
      throw error;
    }
  };

  const updateManufacturerName = async (id: string, newName: string) => {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      await window.electronAPI.invoke('db:productManufacturers:update', id, {
        manufacturer_name: newName
      });

      await reloadCompleteProductData();
    } catch (error) {
      console.error('Failed to update manufacturer name:', error);
      throw error;
    }
  };

  // Product functions
  const addProduct = async (product: Omit<Product, 'id' | 'stockHistory'>) => {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      const newProduct = {
        id: Date.now().toString(),
        name: product.name,
        description: product.description,
        price: product.price,
        stock_quantity: product.stockQuantity || 0,
      };

      await window.electronAPI.invoke('db:products:insert', newProduct);

      // Add default "General Manufacturer" stock for the new product
      await window.electronAPI.invoke('db:productManufacturers:insert', {
        id: `pm_${Date.now()}`,
        product_id: newProduct.id,
        manufacturer_id: 'general',
        manufacturer_name: 'General Manufacturer',
        quantity: product.stockQuantity || 0
      });

      // Reload complete product data
      await reloadCompleteProductData();
    } catch (error) {
      console.error('Failed to add product:', error);
      throw error;
    }
  };

  const updateProduct = async (updatedProduct: Product) => {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      await window.electronAPI.invoke('db:products:update', updatedProduct.id, {
        name: updatedProduct.name,
        description: updatedProduct.description,
        price: updatedProduct.price,
        stock_quantity: updatedProduct.stockQuantity,
      });

      // Reload complete product data
      await reloadCompleteProductData();
    } catch (error) {
      console.error('Failed to update product:', error);
      throw error;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      await window.electronAPI.invoke('db:products:delete', id);

      // Reload complete product data
      await reloadCompleteProductData();
    } catch (error) {
      console.error('Failed to delete product:', error);
      throw error;
    }
  };

  const addStockMovement = async (productId: string, movement: Omit<StockHistory, 'id'>) => {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      const newMovement = {
        id: Date.now().toString(),
        product_id: productId,
        type: movement.type,
        quantity: movement.quantity,
        date: movement.date,
        time: movement.time || null,
        notes: movement.notes || '',
        broker_id: movement.brokerId || null,
        manufacturer_id: movement.manufacturerId || null,
        leisure_created: movement.leisureCreated || false
      };

      await window.electronAPI.invoke('db:stockHistory:insert', newMovement);

      // Reload complete product data
      await reloadCompleteProductData();

    } catch (error) {
      console.error('Failed to add stock movement:', error);
      throw error;
    }
  };

  // Broker functions
  const addBroker = async (broker: Omit<Broker, 'id' | 'totalPending' | 'totalPaid'>) => {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      const newBroker = {
        ...broker,
        id: Date.now().toString(),
        total_pending: 0,
        total_paid: 0
      };

      await window.electronAPI.invoke('db:brokers:insert', newBroker);

      // Calculate totals from existing leisures
      await window.electronAPI.invoke('db:updateBrokerTotals', newBroker.id);

      // Reload brokers from database
      const brokersData = await window.electronAPI.invoke('db:brokers:getAll');
      const transformedBrokers = brokersData.map((broker: any) => ({
        id: broker.id,
        name: broker.name,
        contact: broker.contact || '',
        address: broker.address || '',
        totalPending: broker.total_pending || 0,
        totalPaid: broker.total_paid || 0
      }));
      setBrokers(transformedBrokers);
    } catch (error) {
      console.error('Failed to add broker:', error);
      throw error;
    }
  };

  const updateBroker = async (updatedBroker: Broker) => {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      await window.electronAPI.invoke('db:brokers:update', updatedBroker.id, {
        name: updatedBroker.name,
        contact: updatedBroker.contact,
        address: updatedBroker.address,
        total_pending: updatedBroker.totalPending,
        total_paid: updatedBroker.totalPaid
      });

      // Reload brokers from database
      const brokersData = await window.electronAPI.invoke('db:brokers:getAll');
      const transformedBrokers = brokersData.map((broker: any) => ({
        id: broker.id,
        name: broker.name,
        contact: broker.contact || '',
        address: broker.address || '',
        totalPending: broker.total_pending || 0,
        totalPaid: broker.total_paid || 0
      }));
      setBrokers(transformedBrokers);
    } catch (error) {
      console.error('Failed to update broker:', error);
      throw error;
    }
  };

  const deleteBroker = async (id: string) => {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      await window.electronAPI.invoke('db:brokers:delete', id);

      // Reload brokers from database
      const brokersData = await window.electronAPI.invoke('db:brokers:getAll');
      const transformedBrokers = brokersData.map((broker: any) => ({
        id: broker.id,
        name: broker.name,
        contact: broker.contact || '',
        address: broker.address || '',
        totalPending: broker.total_pending || 0,
        totalPaid: broker.total_paid || 0
      }));
      setBrokers(transformedBrokers);

      // Also delete related leisures
      setLeisures(leisures.filter(leisure => leisure.brokerId !== id));
    } catch (error) {
      console.error('Failed to delete broker:', error);
      throw error;
    }
  };

  // Customer functions
  const addCustomer = async (customer: Omit<Customer, 'id' | 'totalPending' | 'totalPaid'>) => {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      const newCustomer = {
        ...customer,
        id: Date.now().toString(),
        total_pending: 0,
        total_paid: 0
      };

      await window.electronAPI.invoke('db:customers:insert', newCustomer);

      // Calculate totals from existing customer leisures
      await window.electronAPI.invoke('db:updateCustomerTotals', newCustomer.id);

      // Reload customers from database
      const customersData = await window.electronAPI.invoke('db:customers:getAll');
      const transformedCustomers = customersData.map((customer: any) => ({
        id: customer.id,
        name: customer.name,
        contact: customer.contact || '',
        address: customer.address || '',
        totalPending: customer.total_pending || 0,
        totalPaid: customer.total_paid || 0
      }));
      setCustomers(transformedCustomers);
    } catch (error) {
      console.error('Failed to add customer:', error);
      throw error;
    }
  };

  const updateCustomer = async (updatedCustomer: Customer) => {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      await window.electronAPI.invoke('db:customers:update', updatedCustomer.id, {
        name: updatedCustomer.name,
        contact: updatedCustomer.contact,
        address: updatedCustomer.address,
        total_pending: updatedCustomer.totalPending,
        total_paid: updatedCustomer.totalPaid
      });

      // Reload customers from database
      const customersData = await window.electronAPI.invoke('db:customers:getAll');
      const transformedCustomers = customersData.map((customer: any) => ({
        id: customer.id,
        name: customer.name,
        contact: customer.contact || '',
        address: customer.address || '',
        totalPending: customer.total_pending || 0,
        totalPaid: customer.total_paid || 0
      }));
      setCustomers(transformedCustomers);
    } catch (error) {
      console.error('Failed to update customer:', error);
      throw error;
    }
  };

  const deleteCustomer = async (id: string) => {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      await window.electronAPI.invoke('db:customers:delete', id);

      // Reload customers from database
      const customersData = await window.electronAPI.invoke('db:customers:getAll');
      const transformedCustomers = customersData.map((customer: any) => ({
        id: customer.id,
        name: customer.name,
        contact: customer.contact || '',
        address: customer.address || '',
        totalPending: customer.total_pending || 0,
        totalPaid: customer.total_paid || 0
      }));
      setCustomers(transformedCustomers);

      // Also delete related customer leisures
      setCustomerLeisures(customerLeisures.filter(leisure => leisure.customerId !== id));
    } catch (error) {
      console.error('Failed to delete customer:', error);
      throw error;
    }
  };

  // Leisure functions
  const addLeisure = async (leisure: Omit<Leisure, 'id' | 'brokerName'>) => {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      const broker = brokers.find(b => b.id === leisure.brokerId);
      if (!broker) return;

      const newLeisure = {
        id: Date.now().toString(),
        broker_id: leisure.brokerId,
        broker_name: broker.name,
        type: leisure.type,
        amount: leisure.amount,
        brokerage: leisure.brokerage || 0,
        transaction_id: leisure.transactionId || null,
        payment_method: leisure.paymentMethod || null,
        date: leisure.date,
        time: leisure.time || null,
        notes: leisure.notes || ''
      };

      await window.electronAPI.invoke('db:brokerLeisures:insert', newLeisure);

      // Update broker totals
      await window.electronAPI.invoke('db:updateBrokerTotals', leisure.brokerId);

      // Reload leisures from database
      const leisuresData = await window.electronAPI.invoke('db:brokerLeisures:getAll');
      const transformedBrokerLeisures = leisuresData.map((leisure: any) => ({
        id: leisure.id,
        brokerId: leisure.broker_id,
        brokerName: leisure.broker_name,
        type: leisure.type,
        amount: leisure.amount,
        brokerage: leisure.brokerage || 0,
        transactionId: leisure.transaction_id,
        paymentMethod: leisure.payment_method as 'UPI' | 'Cash',
        date: leisure.date,
        time: leisure.time || '12:00',
        notes: leisure.notes || ''
      }));
      setLeisures(transformedBrokerLeisures);

      // Reload brokers to get updated totals
      const brokersData = await window.electronAPI.invoke('db:brokers:getAll');
      const transformedBrokers = brokersData.map((broker: any) => ({
        id: broker.id,
        name: broker.name,
        contact: broker.contact || '',
        address: broker.address || '',
        totalPending: broker.total_pending || 0,
        totalPaid: broker.total_paid || 0
      }));
      setBrokers(transformedBrokers);

    } catch (error) {
      console.error('Failed to add leisure:', error);
      throw error;
    }
  };

  const updateLeisure = async (updatedLeisure: Leisure) => {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      await window.electronAPI.invoke('db:brokerLeisures:update', updatedLeisure.id, {
        broker_id: updatedLeisure.brokerId,
        broker_name: updatedLeisure.brokerName,
        type: updatedLeisure.type,
        amount: updatedLeisure.amount,
        brokerage: updatedLeisure.brokerage || 0,
        transaction_id: updatedLeisure.transactionId || null,
        payment_method: updatedLeisure.paymentMethod || null,
        date: updatedLeisure.date,
        time: updatedLeisure.time || null,
        notes: updatedLeisure.notes || ''
      });

      // Update broker totals
      await window.electronAPI.invoke('db:updateBrokerTotals', updatedLeisure.brokerId);

      // Reload leisures from database
      const leisuresData = await window.electronAPI.invoke('db:brokerLeisures:getAll');
      const transformedBrokerLeisures = leisuresData.map((leisure: any) => ({
        id: leisure.id,
        brokerId: leisure.broker_id,
        brokerName: leisure.broker_name,
        type: leisure.type,
        amount: leisure.amount,
        brokerage: leisure.brokerage || 0,
        transactionId: leisure.transaction_id,
        paymentMethod: leisure.payment_method as 'UPI' | 'Cash',
        date: leisure.date,
        time: leisure.time || '12:00',
        notes: leisure.notes || ''
      }));
      setLeisures(transformedBrokerLeisures);

      // Reload brokers to get updated totals
      const brokersData = await window.electronAPI.invoke('db:brokers:getAll');
      const transformedBrokers = brokersData.map((broker: any) => ({
        id: broker.id,
        name: broker.name,
        contact: broker.contact || '',
        address: broker.address || '',
        totalPending: broker.total_pending || 0,
        totalPaid: broker.total_paid || 0
      }));
      setBrokers(transformedBrokers);

    } catch (error) {
      console.error('Failed to update leisure:', error);
      throw error;
    }
  };

  const deleteLeisure = async (id: string) => {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      // Get the leisure before deleting to know which broker to update
      const leisureToDelete = leisures.find(l => l.id === id);
      if (!leisureToDelete) return;

      await window.electronAPI.invoke('db:brokerLeisures:delete', id);

      // Update broker totals
      await window.electronAPI.invoke('db:updateBrokerTotals', leisureToDelete.brokerId);

      // Reload leisures from database
      const leisuresData = await window.electronAPI.invoke('db:brokerLeisures:getAll');
      const transformedBrokerLeisures = leisuresData.map((leisure: any) => ({
        id: leisure.id,
        brokerId: leisure.broker_id,
        brokerName: leisure.broker_name,
        type: leisure.type,
        amount: leisure.amount,
        brokerage: leisure.brokerage || 0,
        transactionId: leisure.transaction_id,
        paymentMethod: leisure.payment_method as 'UPI' | 'Cash',
        date: leisure.date,
        time: leisure.time || '12:00',
        notes: leisure.notes || ''
      }));
      setLeisures(transformedBrokerLeisures);

      // Reload brokers to get updated totals
      const brokersData = await window.electronAPI.invoke('db:brokers:getAll');
      const transformedBrokers = brokersData.map((broker: any) => ({
        id: broker.id,
        name: broker.name,
        contact: broker.contact || '',
        address: broker.address || '',
        totalPending: broker.total_pending || 0,
        totalPaid: broker.total_paid || 0
      }));
      setBrokers(transformedBrokers);

    } catch (error) {
      console.error('Failed to delete leisure:', error);
      throw error;
    }
  };

  const addCustomerLeisure = async (leisure: Omit<CustomerLeisure, 'id' | 'customerName'>) => {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      const customer = customers.find(c => c.id === leisure.customerId);
      if (!customer) return;

      const newLeisure = {
        id: Date.now().toString(),
        customer_id: leisure.customerId,
        customer_name: customer.name,
        type: leisure.type,
        amount: leisure.amount,
        transaction_id: leisure.transactionId || null,
        payment_method: leisure.paymentMethod || null,
        date: leisure.date,
        time: leisure.time || null,
        notes: leisure.notes || ''
      };

      await window.electronAPI.invoke('db:customerLeisures:insert', newLeisure);

      // Update customer totals
      await window.electronAPI.invoke('db:updateCustomerTotals', leisure.customerId);

      // Reload customer leisures from database
      const customerLeisuresData = await window.electronAPI.invoke('db:customerLeisures:getAll');
      const transformedCustomerLeisures = customerLeisuresData.map((leisure: any) => ({
        id: leisure.id,
        customerId: leisure.customer_id,
        customerName: leisure.customer_name,
        type: leisure.type,
        amount: leisure.amount,
        transactionId: leisure.transaction_id,
        paymentMethod: leisure.payment_method as 'UPI' | 'Cash',
        date: leisure.date,
        time: leisure.time || '12:00',
        notes: leisure.notes || ''
      }));
      setCustomerLeisures(transformedCustomerLeisures);

      // Reload customers to get updated totals
      const customersData = await window.electronAPI.invoke('db:customers:getAll');
      const transformedCustomers = customersData.map((customer: any) => ({
        id: customer.id,
        name: customer.name,
        contact: customer.contact || '',
        address: customer.address || '',
        totalPending: customer.total_pending || 0,
        totalPaid: customer.total_paid || 0
      }));
      setCustomers(transformedCustomers);

    } catch (error) {
      console.error('Failed to add customer leisure:', error);
      throw error;
    }
  };

  const updateCustomerLeisure = async (updatedLeisure: CustomerLeisure) => {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      await window.electronAPI.invoke('db:customerLeisures:update', updatedLeisure.id, {
        customer_id: updatedLeisure.customerId,
        customer_name: updatedLeisure.customerName,
        type: updatedLeisure.type,
        amount: updatedLeisure.amount,
        transaction_id: updatedLeisure.transactionId || null,
        payment_method: updatedLeisure.paymentMethod || null,
        date: updatedLeisure.date,
        time: updatedLeisure.time || null,
        notes: updatedLeisure.notes || ''
      });

      // Update customer totals
      await window.electronAPI.invoke('db:updateCustomerTotals', updatedLeisure.customerId);

      // Reload customer leisures from database
      const customerLeisuresData = await window.electronAPI.invoke('db:customerLeisures:getAll');
      const transformedCustomerLeisures = customerLeisuresData.map((leisure: any) => ({
        id: leisure.id,
        customerId: leisure.customer_id,
        customerName: leisure.customer_name,
        type: leisure.type,
        amount: leisure.amount,
        transactionId: leisure.transaction_id,
        paymentMethod: leisure.payment_method as 'UPI' | 'Cash',
        date: leisure.date,
        time: leisure.time || '12:00',
        notes: leisure.notes || ''
      }));
      setCustomerLeisures(transformedCustomerLeisures);

      // Reload customers to get updated totals
      const customersData = await window.electronAPI.invoke('db:customers:getAll');
      const transformedCustomers = customersData.map((customer: any) => ({
        id: customer.id,
        name: customer.name,
        contact: customer.contact || '',
        address: customer.address || '',
        totalPending: customer.total_pending || 0,
        totalPaid: customer.total_paid || 0
      }));
      setCustomers(transformedCustomers);

    } catch (error) {
      console.error('Failed to update customer leisure:', error);
      throw error;
    }
  };

  const deleteCustomerLeisure = async (id: string) => {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      // Get the leisure before deleting to know which customer to update
      const leisureToDelete = customerLeisures.find(l => l.id === id);
      if (!leisureToDelete) return;

      await window.electronAPI.invoke('db:customerLeisures:delete', id);

      // Update customer totals
      await window.electronAPI.invoke('db:updateCustomerTotals', leisureToDelete.customerId);

      // Reload customer leisures from database
      const customerLeisuresData = await window.electronAPI.invoke('db:customerLeisures:getAll');
      const transformedCustomerLeisures = customerLeisuresData.map((leisure: any) => ({
        id: leisure.id,
        customerId: leisure.customer_id,
        customerName: leisure.customer_name,
        type: leisure.type,
        amount: leisure.amount,
        transactionId: leisure.transaction_id,
        paymentMethod: leisure.payment_method as 'UPI' | 'Cash',
        date: leisure.date,
        time: leisure.time || '12:00',
        notes: leisure.notes || ''
      }));
      setCustomerLeisures(transformedCustomerLeisures);

      // Reload customers to get updated totals
      const customersData = await window.electronAPI.invoke('db:customers:getAll');
      const transformedCustomers = customersData.map((customer: any) => ({
        id: customer.id,
        name: customer.name,
        contact: customer.contact || '',
        address: customer.address || '',
        totalPending: customer.total_pending || 0,
        totalPaid: customer.total_paid || 0
      }));
      setCustomers(transformedCustomers);

    } catch (error) {
      console.error('Failed to delete customer leisure:', error);
      throw error;
    }
  };

  // Transaction functions - simplified for now
  const addBrokerTransaction = async (transaction: Omit<BrokerTransaction, 'id'>) => {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      // Generate invoice number
      const invoiceNumber = transaction.invoiceNumber || `INV-${new Date().getFullYear()}-${Date.now()}`;

      // Prepare transaction data for database
      const dbTransaction = {
        id: Date.now().toString(),
        broker_id: transaction.brokerId,
        date: transaction.date,
        time: transaction.time,
        invoice_number: invoiceNumber,
        total_amount: transaction.totalAmount,
        total_brokerage: transaction.totalBrokerage || 0,
        previous_balance: transaction.previousBalance || 0,
        payment_method: transaction.paymentMethod,
        notes: '',
        products: transaction.products.map((productData, index) => ({
          id: Date.now().toString() + '_' + index,
          product_id: productData.productId,
          manufacturer_id: productData.manufacturerId,
          units: productData.units,
          unit_type: productData.unitType,
          rate: productData.rate,
          brokerage_per_unit: productData.brokeragePerUnit || 0,
          brokerage: productData.brokerage || 0,
          total: productData.total
        }))
      };

      // Insert transaction into database
      await window.electronAPI.invoke('db:brokerTransactions:insert', dbTransaction);

      // Reload all related data from database
      const [
        transactionsData,
        brokerLeisuresData,
        brokersData
      ] = await Promise.all([
        window.electronAPI.invoke('db:brokerTransactions:getAll'),
        window.electronAPI.invoke('db:brokerLeisures:getAll'),
        window.electronAPI.invoke('db:brokers:getAll')
      ]);

      // Transform and set broker transactions
      const transformedBrokerTransactions = transactionsData.map((transaction: any) => ({
        id: transaction.id,
        brokerId: transaction.broker_id,
        date: transaction.date,
        time: transaction.time || '12:00',
        invoiceNumber: transaction.invoice_number,
        totalBrokerage: transaction.total_brokerage || 0,
        products: transaction.products?.map((product: any) => ({
          productId: product.product_id,
          manufacturerId: product.manufacturer_id,
          units: product.units,
          unitType: product.unit_type,
          rate: product.rate,
          brokeragePerUnit: product.brokerage_per_unit || 0,
          brokerage: product.brokerage || 0,
          total: product.total
        })) || [],
        previousBalance: transaction.previous_balance || 0,
        totalAmount: transaction.total_amount,
        paymentMethod: transaction.payment_method as 'UPI' | 'cash'
      }));
      setBrokerTransactions(transformedBrokerTransactions);

      // Transform and set broker leisures
      const transformedBrokerLeisures = brokerLeisuresData.map((leisure: any) => ({
        id: leisure.id,
        brokerId: leisure.broker_id,
        brokerName: leisure.broker_name,
        type: leisure.type,
        amount: leisure.amount,
        brokerage: leisure.brokerage || 0,
        transactionId: leisure.transaction_id,
        paymentMethod: leisure.payment_method as 'UPI' | 'Cash',
        date: leisure.date,
        time: leisure.time || '12:00',
        notes: leisure.notes || ''
      }));
      setLeisures(transformedBrokerLeisures);

      // Transform and set brokers with updated totals
      const transformedBrokers = brokersData.map((broker: any) => ({
        id: broker.id,
        name: broker.name,
        contact: broker.contact || '',
        address: broker.address || '',
        totalPending: broker.total_pending || 0,
        totalPaid: broker.total_paid || 0
      }));
      setBrokers(transformedBrokers);

      // Reload product data to update inventory levels
      await reloadCompleteProductData();

      console.log('Broker transaction added successfully');
    } catch (error) {
      console.error('Failed to add broker transaction:', error);
      throw error;
    }
  };

  const updateBrokerTransaction = async (updatedTransaction: BrokerTransaction) => {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      // Prepare transaction data for database update
      const dbTransaction = {
        broker_id: updatedTransaction.brokerId,
        date: updatedTransaction.date,
        time: updatedTransaction.time,
        invoice_number: updatedTransaction.invoiceNumber,
        total_amount: updatedTransaction.totalAmount,
        total_brokerage: updatedTransaction.totalBrokerage || 0,
        previous_balance: updatedTransaction.previousBalance || 0,
        payment_method: updatedTransaction.paymentMethod,
        notes: '',
        products: updatedTransaction.products.map((productData, index) => ({
          id: Date.now().toString() + '_' + index,
          product_id: productData.productId,
          manufacturer_id: productData.manufacturerId,
          units: productData.units,
          unit_type: productData.unitType,
          rate: productData.rate,
          brokerage_per_unit: productData.brokeragePerUnit || 0,
          brokerage: productData.brokerage || 0,
          total: productData.total
        }))
      };

      await window.electronAPI.invoke('db:brokerTransactions:update', updatedTransaction.id, dbTransaction);

      // Reload all related data from database
      const [
        transactionsData,
        brokerLeisuresData,
        brokersData
      ] = await Promise.all([
        window.electronAPI.invoke('db:brokerTransactions:getAll'),
        window.electronAPI.invoke('db:brokerLeisures:getAll'),
        window.electronAPI.invoke('db:brokers:getAll')
      ]);

      // Transform and set broker transactions
      const transformedBrokerTransactions = transactionsData.map((transaction: any) => ({
        id: transaction.id,
        brokerId: transaction.broker_id,
        date: transaction.date,
        time: transaction.time || '12:00',
        invoiceNumber: transaction.invoice_number,
        totalBrokerage: transaction.total_brokerage || 0,
        products: transaction.products?.map((product: any) => ({
          productId: product.product_id,
          manufacturerId: product.manufacturer_id,
          units: product.units,
          unitType: product.unit_type,
          rate: product.rate,
          brokeragePerUnit: product.brokerage_per_unit || 0,
          brokerage: product.brokerage || 0,
          total: product.total
        })) || [],
        previousBalance: transaction.previous_balance || 0,
        totalAmount: transaction.total_amount,
        paymentMethod: transaction.payment_method as 'UPI' | 'cash'
      }));
      setBrokerTransactions(transformedBrokerTransactions);

      // Transform and set broker leisures
      const transformedBrokerLeisures = brokerLeisuresData.map((leisure: any) => ({
        id: leisure.id,
        brokerId: leisure.broker_id,
        brokerName: leisure.broker_name,
        type: leisure.type,
        amount: leisure.amount,
        brokerage: leisure.brokerage || 0,
        transactionId: leisure.transaction_id,
        paymentMethod: leisure.payment_method as 'UPI' | 'Cash',
        date: leisure.date,
        time: leisure.time || '12:00',
        notes: leisure.notes || ''
      }));
      setLeisures(transformedBrokerLeisures);

      // Transform and set brokers with updated totals
      const transformedBrokers = brokersData.map((broker: any) => ({
        id: broker.id,
        name: broker.name,
        contact: broker.contact || '',
        address: broker.address || '',
        totalPending: broker.total_pending || 0,
        totalPaid: broker.total_paid || 0
      }));
      setBrokers(transformedBrokers);

      // Reload product data to update inventory levels
      await reloadCompleteProductData();

    } catch (error) {
      console.error('Failed to update broker transaction:', error);
      throw error;
    }
  };

  const addCustomerTransaction = async (transaction: Omit<CustomerTransaction, 'id'>) => {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      // Generate invoice number
      const invoiceNumber = transaction.invoiceNumber || `CUST-INV-${new Date().getFullYear()}-${Date.now()}`;

      // Prepare transaction data for database
      const dbTransaction = {
        id: Date.now().toString(),
        customer_id: transaction.customerId,
        date: transaction.date,
        time: transaction.time,
        invoice_number: invoiceNumber,
        total_amount: transaction.totalAmount,
        labour_charge: transaction.labourCharge || 0,
        previous_balance: transaction.previousBalance || 0,
        payment_method: transaction.paymentMethod,
        notes: '',
        products: transaction.products.map((productData, index) => ({
          id: Date.now().toString() + '_' + index,
          product_id: productData.productId,
          manufacturer_id: productData.manufacturerId,
          quantity: productData.quantity,
          unit_type: productData.unitType,
          price: productData.price,
          labour: productData.labour,
          total: productData.total
        }))
      };

      // Insert transaction into database
      await window.electronAPI.invoke('db:customerTransactions:insert', dbTransaction);

      // Reload all related data from database
      const [
        transactionsData,
        customerLeisuresData,
        customersData
      ] = await Promise.all([
        window.electronAPI.invoke('db:customerTransactions:getAll'),
        window.electronAPI.invoke('db:customerLeisures:getAll'),
        window.electronAPI.invoke('db:customers:getAll')
      ]);

      // Transform and set customer transactions
      const transformedCustomerTransactions = transactionsData.map((transaction: any) => ({
        id: transaction.id,
        customerId: transaction.customer_id,
        date: transaction.date,
        time: transaction.time || '12:00',
        invoiceNumber: transaction.invoice_number,
        labourCharge: transaction.labour_charge || 0,
        products: transaction.products?.map((product: any) => ({
          productId: product.product_id,
          manufacturerId: product.manufacturer_id,
          quantity: product.quantity,
          unitType: product.unit_type,
          price: product.price,
          labour: product.labour,
          total: product.total
        })) || [],
        totalAmount: transaction.total_amount,
        previousBalance: transaction.previous_balance || 0,
        paymentMethod: transaction.payment_method as 'UPI' | 'cash'
      }));
      setCustomerTransactions(transformedCustomerTransactions);

      // Transform and set customer leisures
      const transformedCustomerLeisures = customerLeisuresData.map((leisure: any) => ({
        id: leisure.id,
        customerId: leisure.customer_id,
        customerName: leisure.customer_name,
        type: leisure.type,
        amount: leisure.amount,
        transactionId: leisure.transaction_id,
        paymentMethod: leisure.payment_method as 'UPI' | 'Cash',
        date: leisure.date,
        time: leisure.time || '12:00',
        notes: leisure.notes || ''
      }));
      setCustomerLeisures(transformedCustomerLeisures);

      // Transform and set customers with updated totals
      const transformedCustomers = customersData.map((customer: any) => ({
        id: customer.id,
        name: customer.name,
        contact: customer.contact || '',
        address: customer.address || '',
        totalPending: customer.total_pending || 0,
        totalPaid: customer.total_paid || 0
      }));
      setCustomers(transformedCustomers);

      // Reload product data to update inventory levels
      await reloadCompleteProductData();

      console.log('Customer transaction added successfully');
    } catch (error) {
      console.error('Failed to add customer transaction:', error);
      throw error;
    }
  };

  const updateCustomerTransaction = async (updatedTransaction: CustomerTransaction) => {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      // Prepare transaction data for database update
      const dbTransaction = {
        customer_id: updatedTransaction.customerId,
        date: updatedTransaction.date,
        time: updatedTransaction.time,
        invoice_number: updatedTransaction.invoiceNumber,
        total_amount: updatedTransaction.totalAmount,
        labour_charge: updatedTransaction.labourCharge || 0,
        previous_balance: updatedTransaction.previousBalance || 0,
        payment_method: updatedTransaction.paymentMethod,
        notes: '',
        products: updatedTransaction.products.map((productData, index) => ({
          id: Date.now().toString() + '_' + index,
          product_id: productData.productId,
          manufacturer_id: productData.manufacturerId,
          quantity: productData.quantity,
          unit_type: productData.unitType,
          price: productData.price,
          labour: productData.labour,
          total: productData.total
        }))
      };

      await window.electronAPI.invoke('db:customerTransactions:update', updatedTransaction.id, dbTransaction);

      // Reload all related data from database
      const [
        transactionsData,
        customerLeisuresData,
        customersData
      ] = await Promise.all([
        window.electronAPI.invoke('db:customerTransactions:getAll'),
        window.electronAPI.invoke('db:customerLeisures:getAll'),
        window.electronAPI.invoke('db:customers:getAll')
      ]);

      // Transform and set customer transactions
      const transformedCustomerTransactions = transactionsData.map((transaction: any) => ({
        id: transaction.id,
        customerId: transaction.customer_id,
        date: transaction.date,
        time: transaction.time || '12:00',
        invoiceNumber: transaction.invoice_number,
        labourCharge: transaction.labour_charge || 0,
        products: transaction.products?.map((product: any) => ({
          productId: product.product_id,
          manufacturerId: product.manufacturer_id,
          quantity: product.quantity,
          unitType: product.unit_type,
          price: product.price,
          labour: product.labour,
          total: product.total
        })) || [],
        totalAmount: transaction.total_amount,
        previousBalance: transaction.previous_balance || 0,
        paymentMethod: transaction.payment_method as 'UPI' | 'cash'
      }));
      setCustomerTransactions(transformedCustomerTransactions);

      // Transform and set customer leisures
      const transformedCustomerLeisures = customerLeisuresData.map((leisure: any) => ({
        id: leisure.id,
        customerId: leisure.customer_id,
        customerName: leisure.customer_name,
        type: leisure.type,
        amount: leisure.amount,
        transactionId: leisure.transaction_id,
        paymentMethod: leisure.payment_method as 'UPI' | 'Cash',
        date: leisure.date,
        time: leisure.time || '12:00',
        notes: leisure.notes || ''
      }));
      setCustomerLeisures(transformedCustomerLeisures);

      // Transform and set customers with updated totals
      const transformedCustomers = customersData.map((customer: any) => ({
        id: customer.id,
        name: customer.name,
        contact: customer.contact || '',
        address: customer.address || '',
        totalPending: customer.total_pending || 0,
        totalPaid: customer.total_paid || 0
      }));
      setCustomers(transformedCustomers);

      // Reload product data to update inventory levels
      await reloadCompleteProductData();

    } catch (error) {
      console.error('Failed to update customer transaction:', error);
      throw error;
    }
  };

  // Sales tracking functions
  const getDailySalesTotal = (date: string): number => {
    return customerTransactions
      .filter(transaction => transaction.date === date)
      .reduce((total, transaction) => total + transaction.totalAmount, 0);
  };

  const getMonthlySalesTotal = (year: number, month: number): number => {
    return customerTransactions
      .filter(transaction => {
        const transactionDate = new Date(transaction.date);
        return transactionDate.getFullYear() === year && transactionDate.getMonth() === month;
      })
      .reduce((total, transaction) => total + transaction.totalAmount, 0);
  };

  // WhatsApp Preset functions
  const addWhatsAppPreset = async (preset: Omit<WhatsAppPreset, 'id'>) => {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      const newPreset = {
        id: Date.now().toString(),
        title: preset.title,
        message: preset.message
      };

      await window.electronAPI.invoke('db:whatsappPresets:insert', newPreset);
      setWhatsappPresets([...whatsappPresets, newPreset]);
    } catch (error) {
      console.error('Failed to add WhatsApp preset:', error);
      throw error;
    }
  };

  const updateWhatsAppPreset = async (updatedPreset: WhatsAppPreset) => {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      await window.electronAPI.invoke('db:whatsappPresets:update', updatedPreset.id, {
        title: updatedPreset.title,
        message: updatedPreset.message
      });

      setWhatsappPresets(whatsappPresets.map(p => 
        p.id === updatedPreset.id ? updatedPreset : p
      ));
    } catch (error) {
      console.error('Failed to update WhatsApp preset:', error);
      throw error;
    }
  };

  const deleteWhatsAppPreset = async (id: string) => {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      await window.electronAPI.invoke('db:whatsappPresets:delete', id);
      setWhatsappPresets(whatsappPresets.filter(p => p.id !== id));
    } catch (error) {
      console.error('Failed to delete WhatsApp preset:', error);
      throw error;
    }
  };

  // Settings functions
  const updateBusinessSettings = async (settings: BusinessSettings) => {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      const dbSettings = {
        business_name: settings.businessName,
        address: settings.address,
        proprietor_name: settings.proprietorName,
        phone_numbers: settings.phoneNumbers.join(', '),
        invoice_whatsapp_template: settings.invoiceWhatsappTemplate || 'Tax Invoice for {partyName} dated {dateStr}',
        logo_path: settings.logoPath !== undefined ? settings.logoPath : null,
        header_banner_path: settings.headerBannerPath !== undefined ? settings.headerBannerPath : null,
        qr_code_path: settings.qrCodePath !== undefined ? settings.qrCodePath : null,
        default_invoice_template: settings.defaultInvoiceTemplate || 'standard_a4',
        invoice_accent_color: settings.invoiceAccentColor || '#2563eb',
        print_copies: Number.isFinite(Number(settings.printCopies)) ? Number(settings.printCopies) : 1,
        print_layout_mode: settings.printLayoutMode || 'single',
        custom_footer_text: settings.customFooterText || ''
      };

      // Use update operation for existing business settings (id=1)
      await window.electronAPI.invoke('db:businessSettings:update', '1', dbSettings);
      setBusinessSettings(settings);
    } catch (error) {
      console.error('Failed to save business settings:', error);
      throw error;
    }
  };



  const deleteBrokerTransaction = async (id: string) => {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      await window.electronAPI.invoke('db:brokerTransactions:delete', id);

      // Reload all related data from database
      const [
        transactionsData,
        brokerLeisuresData,
        brokersData
      ] = await Promise.all([
        window.electronAPI.invoke('db:brokerTransactions:getAll'),
        window.electronAPI.invoke('db:brokerLeisures:getAll'),
        window.electronAPI.invoke('db:brokers:getAll')
      ]);

      // Transform and set broker transactions
      const transformedBrokerTransactions = transactionsData.map((transaction: any) => ({
        id: transaction.id,
        brokerId: transaction.broker_id,
        date: transaction.date,
        time: transaction.time || '12:00',
        invoiceNumber: transaction.invoice_number,
        totalBrokerage: transaction.total_brokerage || 0,
        products: transaction.products?.map((product: any) => ({
          productId: product.product_id,
          manufacturerId: product.manufacturer_id,
          units: product.units,
          unitType: product.unit_type,
          rate: product.rate,
          brokeragePerUnit: product.brokerage_per_unit || 0,
          brokerage: product.brokerage || 0,
          total: product.total
        })) || [],
        previousBalance: transaction.previous_balance || 0,
        totalAmount: transaction.total_amount,
        paymentMethod: transaction.payment_method as 'UPI' | 'cash'
      }));
      setBrokerTransactions(transformedBrokerTransactions);

      // Transform and set broker leisures
      const transformedBrokerLeisures = brokerLeisuresData.map((leisure: any) => ({
        id: leisure.id,
        brokerId: leisure.broker_id,
        brokerName: leisure.broker_name,
        type: leisure.type,
        amount: leisure.amount,
        brokerage: leisure.brokerage || 0,
        transactionId: leisure.transaction_id,
        paymentMethod: leisure.payment_method as 'UPI' | 'Cash',
        date: leisure.date,
        time: leisure.time || '12:00',
        notes: leisure.notes || ''
      }));
      setLeisures(transformedBrokerLeisures);

      // Transform and set brokers with updated totals
      const transformedBrokers = brokersData.map((broker: any) => ({
        id: broker.id,
        name: broker.name,
        contact: broker.contact || '',
        address: broker.address || '',
        totalPending: broker.total_pending || 0,
        totalPaid: broker.total_paid || 0
      }));
      setBrokers(transformedBrokers);

      // Reload product data to update inventory levels
      await reloadCompleteProductData();

    } catch (error) {
      console.error('Failed to delete broker transaction:', error);
      throw error;
    }
  };

  const deleteCustomerTransaction = async (id: string) => {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      await window.electronAPI.invoke('db:customerTransactions:delete', id);

      // Reload all related data from database
      const [
        transactionsData,
        customerLeisuresData,
        customersData
      ] = await Promise.all([
        window.electronAPI.invoke('db:customerTransactions:getAll'),
        window.electronAPI.invoke('db:customerLeisures:getAll'),
        window.electronAPI.invoke('db:customers:getAll')
      ]);

      // Transform and set customer transactions
      const transformedCustomerTransactions = transactionsData.map((transaction: any) => ({
        id: transaction.id,
        customerId: transaction.customer_id,
        date: transaction.date,
        time: transaction.time || '12:00',
        invoiceNumber: transaction.invoice_number,
        labourCharge: transaction.labour_charge || 0,
        products: transaction.products?.map((product: any) => ({
          productId: product.product_id,
          manufacturerId: product.manufacturer_id,
          quantity: product.quantity,
          unitType: product.unit_type,
          price: product.price,
          labour: product.labour,
          total: product.total
        })) || [],
        totalAmount: transaction.total_amount,
        previousBalance: transaction.previous_balance || 0,
        paymentMethod: transaction.payment_method as 'UPI' | 'cash'
      }));
      setCustomerTransactions(transformedCustomerTransactions);

      // Transform and set customer leisures
      const transformedCustomerLeisures = customerLeisuresData.map((leisure: any) => ({
        id: leisure.id,
        customerId: leisure.customer_id,
        customerName: leisure.customer_name,
        type: leisure.type,
        amount: leisure.amount,
        transactionId: leisure.transaction_id,
        paymentMethod: leisure.payment_method as 'UPI' | 'Cash',
        date: leisure.date,
        time: leisure.time || '12:00',
        notes: leisure.notes || ''
      }));
      setCustomerLeisures(transformedCustomerLeisures);

      // Transform and set customers with updated totals
      const transformedCustomers = customersData.map((customer: any) => ({
        id: customer.id,
        name: customer.name,
        contact: customer.contact || '',
        address: customer.address || '',
        totalPending: customer.total_pending || 0,
        totalPaid: customer.total_paid || 0
      }));
      setCustomers(transformedCustomers);

      // Reload product data to update inventory levels
      await reloadCompleteProductData();

    } catch (error) {
      console.error('Failed to delete customer transaction:', error);
      throw error;
    }
  };

  const value = {
    products,
    brokers,
    customers,
    leisures,
    customerLeisures,
    brokerTransactions,
    customerTransactions,
    whatsappPresets,
    fixedProducts,
    businessSettings,
    addProduct,
    updateProduct,
    deleteProduct,
    addStockMovement,
    addBroker,
    updateBroker,
    deleteBroker,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    addLeisure,
    updateLeisure,
    deleteLeisure,
    addCustomerLeisure,
    updateCustomerLeisure,
    deleteCustomerLeisure,
    addBrokerTransaction,
    updateBrokerTransaction,
    deleteBrokerTransaction,
    addCustomerTransaction,
    updateCustomerTransaction,
    deleteCustomerTransaction,
    addWhatsAppPreset,
    updateWhatsAppPreset,
    deleteWhatsAppPreset,
    getDailySalesTotal,
    getMonthlySalesTotal,
    updateBusinessSettings,
    reloadCompleteProductData,
    archiveProduct,
    unarchiveProduct,
    archiveManufacturer,
    unarchiveManufacturer,
    addManufacturer,
    updateManufacturerName,
    loading,
    error
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
