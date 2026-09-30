import { CustomerTransaction, BrokerTransaction, Product, Broker, Customer, BusinessSettings } from '../../context/AppContext';

export interface NormalizedProductItem {
  srNo: number;
  productId: string;
  manufacturerId: string;
  displayName: string;
  quantityOrUnits: number;
  unitType: string;
  rateOrPrice: number;
  brokeragePerUnit: number;
  brokerage: number;
  total: number;
}

export interface NormalizedSummary {
  invoiceNumber: string;
  dateTimeStr: string;
  paymentMethod: string;
  subtotal: number;
  labourOrBrokerageLabel: string;
  labourOrBrokerageAmount: number;
  currentTotal: number;
  previousBalance: number;
  netAmount: number;
  partyTitle: string;
  partyName: string;
  partyContact: string;
  partyAddress: string;
  invoiceTypeTitle: string;
  defaultCopyLabel: string;
  isBroker: boolean;
}

export interface TemplateProps {
  transaction: CustomerTransaction | BrokerTransaction;
  type: 'customer' | 'broker';
  party: Customer | Broker | undefined;
  businessSettings: BusinessSettings;
  pdfMode?: 'print' | 'pdf';
  copyLabelOverride?: string;
}

export const getNormalizedInvoiceData = (
  transaction: CustomerTransaction | BrokerTransaction,
  type: 'customer' | 'broker',
  party: Customer | Broker | undefined,
  products: Product[],
  t: any
): { items: NormalizedProductItem[]; summary: NormalizedSummary } => {
  const isBroker = type === 'broker';

  // Get product display name
  const getProductDisplayName = (productId: string, manufacturerId: string) => {
    const product = products.find(p => p.id === productId);
    const manufacturerStock = product?.manufacturerStocks?.find(ms => ms.manufacturerId === manufacturerId);
    const productName = product ? product.name : productId;
    const manufacturerName = manufacturerStock ? manufacturerStock.manufacturerName : manufacturerId;
    return `${productName} (${manufacturerName})`;
  };

  // Map product items
  const items: NormalizedProductItem[] = (transaction.products || []).map((p: any, idx: number) => {
    const quantityOrUnits = isBroker ? p.units : p.quantity;
    const rateOrPrice = isBroker ? p.rate : p.price;
    const brokeragePerUnit = isBroker ? (p.brokeragePerUnit || 0) : 0;
    const brokerage = isBroker ? (p.brokerage || 0) : 0;

    return {
      srNo: idx + 1,
      productId: p.productId,
      manufacturerId: p.manufacturerId,
      displayName: getProductDisplayName(p.productId, p.manufacturerId),
      quantityOrUnits: quantityOrUnits || 0,
      unitType: p.unitType || 'units',
      rateOrPrice: rateOrPrice || 0,
      brokeragePerUnit,
      brokerage,
      total: p.total || 0,
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);

  // Determine totals and summaries
  let labourOrBrokerageLabel = '';
  let labourOrBrokerageAmount = 0;
  let previousBalance = 0;

  if (isBroker) {
    const bt = transaction as BrokerTransaction;
    labourOrBrokerageLabel = t('invoice.totalBrokerage', 'Total Brokerage:');
    labourOrBrokerageAmount = bt.totalBrokerage || 0;
    previousBalance = bt.previousBalance || 0;
  } else {
    const ct = transaction as CustomerTransaction;
    labourOrBrokerageLabel = t('invoice.labourCharge', 'Labour Charge:');
    labourOrBrokerageAmount = ct.labourCharge || 0;
    previousBalance = ct.previousBalance || 0;
  }

  const currentTotal = transaction.totalAmount || 0;
  const netAmount = currentTotal + previousBalance;

  const dateObj = new Date(transaction.date);
  const dateStr = !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString('en-GB') : transaction.date;
  const dateTimeStr = `${dateStr} ${transaction.time || ''}`.trim();

  const partyName = party ? party.name : t('invoice.unknown', 'Unknown');
  const partyContact = party ? party.contact : '';
  const partyAddress = party ? party.address : '';

  const partyTitle = isBroker
    ? t('brokers.supplierName', 'Supplier Name')
    : t('customers.customerName', 'Customer Name');

  const invoiceTypeTitle = isBroker
    ? t('invoice.purchaseInvoice', 'PURCHASE INVOICE')
    : t('invoice.taxInvoice', 'TAX INVOICE');

  const defaultCopyLabel = isBroker
    ? t('invoice.supplierCopy', 'SUPPLIER COPY')
    : t('invoice.customerCopy', 'CUSTOMER COPY');

  return {
    items,
    summary: {
      invoiceNumber: transaction.invoiceNumber || t('invoice.nA', 'N/A'),
      dateTimeStr,
      paymentMethod: (transaction.paymentMethod || 'UPI').toUpperCase(),
      subtotal,
      labourOrBrokerageLabel,
      labourOrBrokerageAmount,
      currentTotal,
      previousBalance,
      netAmount,
      partyTitle,
      partyName,
      partyContact,
      partyAddress,
      invoiceTypeTitle,
      defaultCopyLabel,
      isBroker,
    },
  };
};
