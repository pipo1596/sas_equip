export interface CustomerAddress {
  addressId: number;
  tpId: number;
  custId: number;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  addressType: 'BILL-TO' | 'SHIP-TO' | 'BOTH';
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
  city: string;
  province: string;
  postalCode: string;
  country: string;
  addressType: 'BILL-TO' | 'SHIP-TO' | 'BOTH';
  isPrimary: 'Y' | 'N';
  status: 'ACTIVE' | 'INACTIVE';
}
