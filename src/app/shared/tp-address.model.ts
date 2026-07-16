export interface TpAddress {
  addr_id:    number;
  tp_id:      number;
  addrline1:  string;
  addrline2:  string | null;
  city:       string;
  province:   string;
  postlcode:  string;
  country:    string;
  addr_type:  'BILL-TO' | 'SHIP-TO' | 'BOTH';
  is_primary: 'Y' | 'N';
  status:     'ACTIVE' | 'INACTIVE';
  createdts:  string;
  createdby:  string | null;
  updatedts:  string;
  updatedby:  string | null;
}
