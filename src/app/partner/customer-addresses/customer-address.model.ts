export interface CustomerAddress {
  addressId: number;
  tpId: number;
  custId: number;
  addressLine1: string;
  addressLine2: string | null;
  addressLine3: string | null;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  addressType: 'BILL-TO' | 'SHIP-TO' | 'BOTH';
  attention: string | null;
  phone: string | null;
  isPrimary: 'Y' | 'N';
  status: 'ACTIVE' | 'INACTIVE';
  createdTs: string;
  createdBy: string | null;
  updatedTs: string;
  updatedBy: string | null;
}

export interface CustomerAddressForm {
  addressLine1: string;
  addressLine2: string;
  addressLine3: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  addressType: 'BILL-TO' | 'SHIP-TO' | 'BOTH';
  attention: string;
  phone: string;
  isPrimary: 'Y' | 'N';
  status: 'ACTIVE' | 'INACTIVE';
}
