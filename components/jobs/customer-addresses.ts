import type { Customer, CustomerAddress, CustomerSite } from "./types";

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
export function getCustomerSiteOptions(customer: Customer): CustomerSite[] {
  const saved = (customer.savedSites ?? []).filter((entry) => entry.address.trim());
  if (saved.length > 0) return saved;

  if (!customer.siteAddress?.trim()) return [];
  return [{
    id: "legacy-primary-site",
    name: customer.siteName?.trim() || "Main site",
    address: customer.siteAddress.trim(),
    town: customer.siteTown?.trim() || undefined,
    postcode: customer.sitePostcode?.trim() || undefined,
  }];
}
