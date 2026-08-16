import type { Customer, CustomerAddress } from "./types";

export type CustomerAddressOption = CustomerAddress & { primary?: boolean };

export function getCustomerAddressOptions(customer: Customer): CustomerAddressOption[] {
  const primary: CustomerAddressOption = {
    id: "primary",
    label: "Main address",
    address: customer.address,
    town: customer.town,
    postcode: customer.postcode,
    primary: true,
  };
  const saved = (customer.savedAddresses ?? []).filter((entry) => entry.address.trim());
  return [primary, ...saved];
}

export function getCustomerServiceAddress(customer: Customer): CustomerAddressOption {
  return getCustomerAddressOptions(customer).find((entry) => entry.id === customer.serviceAddressId) ?? getCustomerAddressOptions(customer)[0];
}
