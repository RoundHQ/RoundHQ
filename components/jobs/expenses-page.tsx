"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Package,
  Plus,
  ReceiptText,
  Store,
  Tag,
  Trash2,
} from "lucide-react";

import {
  DEFAULT_CURRENCY_CODE,
  formatCurrencyAmount,
  type CurrencyCode,
} from "./currency";

export type ExpenseSupplier = {
  id: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  website?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
};

export type ExpenseProduct = {
  id: string;
  name: string;
  supplierId?: string | null;
  sku?: string;
  category: string;
  unitCost: number;
  quotePrice: number;
  isQuoteItem: boolean;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
};

export type ExpenseRecord = {
  id: string;
  date: string;
  supplierId?: string | null;
  productId?: string | null;
  category: string;
  description: string;
  amount: number;
  paymentMethod?: string;
  receiptReference?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
};

export type ExpenseSupplierDraft = Omit<
  ExpenseSupplier,
  "id" | "createdAt" | "updatedAt"
>;
export type ExpenseProductDraft = Omit<
  ExpenseProduct,
  "id" | "createdAt" | "updatedAt"
>;
export type ExpenseRecordDraft = Omit<
  ExpenseRecord,
  "id" | "createdAt" | "updatedAt"
>;

type Props = {
  suppliers: ExpenseSupplier[];
  products: ExpenseProduct[];
  expenses: ExpenseRecord[];
  currencyCode?: CurrencyCode | string;
  onSaveSupplier: (supplier: ExpenseSupplierDraft) => Promise<void> | void;
  onDeleteSupplier: (supplierId: string) => Promise<void> | void;
  onSaveProduct: (product: ExpenseProductDraft) => Promise<void> | void;
  onDeleteProduct: (productId: string) => Promise<void> | void;
  onSaveExpense: (expense: ExpenseRecordDraft) => Promise<void> | void;
  onDeleteExpense: (expenseId: string) => Promise<void> | void;
  onAddProductToQuoteItems: (productId: string) => Promise<void> | void;
};

const PRODUCT_CATEGORIES = [
  "Materials",
  "Chemicals",
  "Equipment",
  "Fuel",
  "Subcontractor",
  "Tools",
  "Other",
] as const;

const EXPENSE_CATEGORIES = [
  "Materials",
  "Equipment",
  "Fuel",
  "Insurance",
  "Marketing",
  "Software",
  "Subcontractor",
  "Tools",
  "Vehicle",
  "Other",
] as const;

function getTodayInputValue() {
  const today = new Date();

  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(today.getDate()).padStart(2, "0")}`;
}

function getNumberInputValue(value: number) {
  return Number.isFinite(value) && value > 0 ? String(value) : "";
}

function getNumberFromInput(value: string) {
  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? Math.max(0, numericValue) : 0;
}

function getMonthKey(value: string) {
  return value.slice(0, 7);
}

function sortByNewest<T extends { createdAt: string }>(items: T[]) {
  return [...items].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function formatDisplayDate(value: string) {
  const parsedDate = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return value || "-";
  }

  return parsedDate.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function ExpensesPage({
  suppliers,
  products,
  expenses,
  currencyCode = DEFAULT_CURRENCY_CODE,
  onSaveSupplier,
  onDeleteSupplier,
  onSaveProduct,
  onDeleteProduct,
  onSaveExpense,
  onDeleteExpense,
  onAddProductToQuoteItems,
}: Props) {
  const [supplierName, setSupplierName] = useState("");
  const [supplierContactName, setSupplierContactName] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [supplierWebsite, setSupplierWebsite] = useState("");
  const [supplierNotes, setSupplierNotes] = useState("");
  const [productName, setProductName] = useState("");
  const [productSupplierId, setProductSupplierId] = useState("");
  const [productSku, setProductSku] = useState("");
  const [productCategory, setProductCategory] = useState<string>("Materials");
  const [productUnitCost, setProductUnitCost] = useState("");
  const [productQuotePrice, setProductQuotePrice] = useState("");
  const [productIsQuoteItem, setProductIsQuoteItem] = useState(true);
  const [productNotes, setProductNotes] = useState("");
  const [expenseDate, setExpenseDate] = useState(getTodayInputValue);
  const [expenseSupplierId, setExpenseSupplierId] = useState("");
  const [expenseProductId, setExpenseProductId] = useState("");
  const [expenseCategory, setExpenseCategory] = useState<string>("Materials");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expensePaymentMethod, setExpensePaymentMethod] = useState("Card");
  const [expenseReceiptReference, setExpenseReceiptReference] = useState("");
  const [expenseNotes, setExpenseNotes] = useState("");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const supplierById = useMemo(
    () => new Map(suppliers.map((supplier) => [supplier.id, supplier])),
    [suppliers]
  );
  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products]
  );
  const sortedSuppliers = useMemo(
    () => [...suppliers].sort((left, right) => left.name.localeCompare(right.name)),
    [suppliers]
  );
  const sortedProducts = useMemo(
    () => [...products].sort((left, right) => left.name.localeCompare(right.name)),
    [products]
  );
  const sortedExpenses = useMemo(() => sortByNewest(expenses), [expenses]);
  const totalExpenses = useMemo(
    () => expenses.reduce((total, expense) => total + Number(expense.amount ?? 0), 0),
    [expenses]
  );
  const monthExpenses = useMemo(() => {
    const currentMonth = getMonthKey(getTodayInputValue());

    return expenses
      .filter((expense) => getMonthKey(expense.date) === currentMonth)
      .reduce((total, expense) => total + Number(expense.amount ?? 0), 0);
  }, [expenses]);
  const quoteReadyProducts = products.filter((product) => product.isQuoteItem).length;

  useEffect(() => {
    if (!expenseProductId) {
      return;
    }

    const selectedProduct = productById.get(expenseProductId);

    if (!selectedProduct) {
      return;
    }

    setExpenseSupplierId(selectedProduct.supplierId ?? "");
    setExpenseCategory(selectedProduct.category || "Materials");
    setExpenseDescription((current) => current || selectedProduct.name);
    setExpenseAmount((current) => current || getNumberInputValue(selectedProduct.unitCost));
  }, [expenseProductId, productById]);

  async function runAction(actionKey: string, action: () => Promise<void> | void) {
    setSavingKey(actionKey);
    setNotice(null);

    try {
      await action();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "That could not be saved.");
    } finally {
      setSavingKey(null);
    }
  }

  function resetSupplierForm() {
    setSupplierName("");
    setSupplierContactName("");
    setSupplierEmail("");
    setSupplierPhone("");
    setSupplierWebsite("");
    setSupplierNotes("");
  }

  function resetProductForm() {
    setProductName("");
    setProductSupplierId("");
    setProductSku("");
    setProductCategory("Materials");
    setProductUnitCost("");
    setProductQuotePrice("");
    setProductIsQuoteItem(true);
    setProductNotes("");
  }

  function resetExpenseForm() {
    setExpenseDate(getTodayInputValue());
    setExpenseSupplierId("");
    setExpenseProductId("");
    setExpenseCategory("Materials");
    setExpenseDescription("");
    setExpenseAmount("");
    setExpensePaymentMethod("Card");
    setExpenseReceiptReference("");
    setExpenseNotes("");
  }

  function saveSupplier() {
    const name = supplierName.trim();

    if (!name) {
      setNotice("Add a supplier name first.");
      return;
    }

    void runAction("supplier", async () => {
      await onSaveSupplier({
        name,
        contactName: supplierContactName.trim(),
        email: supplierEmail.trim(),
        phone: supplierPhone.trim(),
        website: supplierWebsite.trim(),
        notes: supplierNotes.trim(),
      });
      resetSupplierForm();
      setNotice("Supplier saved.");
    });
  }

  function saveProduct() {
    const name = productName.trim();

    if (!name) {
      setNotice("Add a product name first.");
      return;
    }

    void runAction("product", async () => {
      await onSaveProduct({
        name,
        supplierId: productSupplierId || null,
        sku: productSku.trim(),
        category: productCategory,
        unitCost: getNumberFromInput(productUnitCost),
        quotePrice:
          getNumberFromInput(productQuotePrice) || getNumberFromInput(productUnitCost),
        isQuoteItem: productIsQuoteItem,
        notes: productNotes.trim(),
      });
      resetProductForm();
      setNotice(
        productIsQuoteItem
          ? "Product saved and added to quote items."
          : "Product saved."
      );
    });
  }

  function saveExpense() {
    const description = expenseDescription.trim();

    if (!description) {
      setNotice("Add an expense description first.");
      return;
    }

    void runAction("expense", async () => {
      await onSaveExpense({
        date: expenseDate || getTodayInputValue(),
        supplierId: expenseSupplierId || null,
        productId: expenseProductId || null,
        category: expenseCategory,
        description,
        amount: getNumberFromInput(expenseAmount),
        paymentMethod: expensePaymentMethod.trim(),
        receiptReference: expenseReceiptReference.trim(),
        notes: expenseNotes.trim(),
      });
      resetExpenseForm();
      setNotice("Expense saved.");
    });
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] bg-[#0d3f3a] p-6 text-white shadow-[0_20px_55px_rgba(0,60,53,0.16)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#20c766]">
              Cost Control
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">
              Expenses
            </h2>
            <p className="mt-2 max-w-2xl text-sm font-medium text-white/72">
              Track spend, suppliers, products, purchase costs, and quote-ready
              product items from one place.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "This month",
                value: formatCurrencyAmount(monthExpenses, currencyCode),
              },
              {
                label: "All expenses",
                value: formatCurrencyAmount(totalExpenses, currencyCode),
              },
              { label: "Suppliers", value: suppliers.length.toString() },
              { label: "Quote products", value: quoteReadyProducts.toString() },
            ].map((metric) => (
              <div
                key={metric.label}
                className="rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3"
              >
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/55">
                  {metric.label}
                </p>
                <p className="mt-2 text-2xl font-black">{metric.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {notice ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {notice}
        </div>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="rounded-[24px] border border-[#dfe8e4] bg-white p-5 shadow-[0_20px_55px_rgba(7,20,38,0.06)]">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Store size={19} />
            </span>
            <div>
              <h3 className="text-xl font-black text-[#071426]">Suppliers</h3>
              <p className="mt-1 text-sm font-medium text-[#667085]">
                Save the companies or people you buy from.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <label className="text-sm font-bold text-[#071426]">
              Supplier name
              <input
                value={supplierName}
                onChange={(event) => setSupplierName(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[#dbe5e1] bg-[#f8fbfa] px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-emerald-400 focus:bg-white"
                placeholder="Greenline Supplies"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-bold text-[#071426]">
                Contact name
                <input
                  value={supplierContactName}
                  onChange={(event) => setSupplierContactName(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-[#dbe5e1] bg-[#f8fbfa] px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-emerald-400 focus:bg-white"
                />
              </label>
              <label className="text-sm font-bold text-[#071426]">
                Phone
                <input
                  value={supplierPhone}
                  onChange={(event) => setSupplierPhone(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-[#dbe5e1] bg-[#f8fbfa] px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-emerald-400 focus:bg-white"
                />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-bold text-[#071426]">
                Email
                <input
                  type="email"
                  value={supplierEmail}
                  onChange={(event) => setSupplierEmail(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-[#dbe5e1] bg-[#f8fbfa] px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-emerald-400 focus:bg-white"
                />
              </label>
              <label className="text-sm font-bold text-[#071426]">
                Website
                <input
                  value={supplierWebsite}
                  onChange={(event) => setSupplierWebsite(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-[#dbe5e1] bg-[#f8fbfa] px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-emerald-400 focus:bg-white"
                />
              </label>
            </div>
            <label className="text-sm font-bold text-[#071426]">
              Notes
              <textarea
                value={supplierNotes}
                onChange={(event) => setSupplierNotes(event.target.value)}
                rows={3}
                className="mt-2 w-full rounded-xl border border-[#dbe5e1] bg-[#f8fbfa] px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-emerald-400 focus:bg-white"
              />
            </label>
            <button
              type="button"
              onClick={saveSupplier}
              disabled={savingKey === "supplier"}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#20c766] px-4 py-3 text-sm font-black text-[#003c35] transition hover:bg-[#2ee074] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus size={17} />
              Add supplier
            </button>
          </div>

          <div className="mt-6 space-y-2">
            {sortedSuppliers.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[#dbe5e1] px-4 py-4 text-sm font-medium text-[#667085]">
                No suppliers added yet.
              </p>
            ) : (
              sortedSuppliers.map((supplier) => (
                <div
                  key={supplier.id}
                  className="flex items-start justify-between gap-3 rounded-2xl border border-[#e5ece8] bg-[#f8fbfa] px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[#071426]">
                      {supplier.name}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-[#667085]">
                      {[supplier.contactName, supplier.phone, supplier.email]
                        .filter(Boolean)
                        .join(" | ") || "No contact details"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      runAction(`delete-supplier-${supplier.id}`, () =>
                        onDeleteSupplier(supplier.id)
                      )
                    }
                    className="shrink-0 rounded-lg border border-rose-100 bg-white p-2 text-rose-600 transition hover:bg-rose-50"
                    aria-label={`Delete ${supplier.name}`}
                    title="Delete supplier"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-[24px] border border-[#dfe8e4] bg-white p-5 shadow-[0_20px_55px_rgba(7,20,38,0.06)]">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Package size={19} />
            </span>
            <div>
              <h3 className="text-xl font-black text-[#071426]">Products</h3>
              <p className="mt-1 text-sm font-medium text-[#667085]">
                Store product costs and push products into quote items.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
              <label className="text-sm font-bold text-[#071426]">
                Product name
                <input
                  value={productName}
                  onChange={(event) => setProductName(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-[#dbe5e1] bg-[#f8fbfa] px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-emerald-400 focus:bg-white"
                  placeholder="Premium fertiliser"
                />
              </label>
              <label className="text-sm font-bold text-[#071426]">
                Supplier
                <select
                  value={productSupplierId}
                  onChange={(event) => setProductSupplierId(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-[#dbe5e1] bg-[#f8fbfa] px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-emerald-400 focus:bg-white"
                >
                  <option value="">No supplier</option>
                  {sortedSuppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-sm font-bold text-[#071426]">
                SKU
                <input
                  value={productSku}
                  onChange={(event) => setProductSku(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-[#dbe5e1] bg-[#f8fbfa] px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-emerald-400 focus:bg-white"
                />
              </label>
              <label className="text-sm font-bold text-[#071426]">
                Category
                <select
                  value={productCategory}
                  onChange={(event) => setProductCategory(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-[#dbe5e1] bg-[#f8fbfa] px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-emerald-400 focus:bg-white"
                >
                  {PRODUCT_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-bold text-[#071426]">
                Cost
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={productUnitCost}
                  onChange={(event) => setProductUnitCost(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-[#dbe5e1] bg-[#f8fbfa] px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-emerald-400 focus:bg-white"
                />
              </label>
              <label className="text-sm font-bold text-[#071426]">
                Quote price
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={productQuotePrice}
                  onChange={(event) => setProductQuotePrice(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-[#dbe5e1] bg-[#f8fbfa] px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-emerald-400 focus:bg-white"
                />
              </label>
            </div>
            <label className="flex items-center gap-3 rounded-xl border border-[#dbe5e1] bg-[#f8fbfa] px-3 py-3 text-sm font-black text-[#071426]">
              <input
                type="checkbox"
                checked={productIsQuoteItem}
                onChange={(event) => setProductIsQuoteItem(event.target.checked)}
                className="h-4 w-4 accent-[#20c766]"
              />
              Make this product available as a Quote Item
            </label>
            <label className="text-sm font-bold text-[#071426]">
              Notes
              <textarea
                value={productNotes}
                onChange={(event) => setProductNotes(event.target.value)}
                rows={3}
                className="mt-2 w-full rounded-xl border border-[#dbe5e1] bg-[#f8fbfa] px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-emerald-400 focus:bg-white"
              />
            </label>
            <button
              type="button"
              onClick={saveProduct}
              disabled={savingKey === "product"}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#20c766] px-4 py-3 text-sm font-black text-[#003c35] transition hover:bg-[#2ee074] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus size={17} />
              Add product
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-[24px] border border-[#dfe8e4] bg-white p-5 shadow-[0_20px_55px_rgba(7,20,38,0.06)]">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <ReceiptText size={19} />
          </span>
          <div>
            <h3 className="text-xl font-black text-[#071426]">Add expense</h3>
            <p className="mt-1 text-sm font-medium text-[#667085]">
              Record purchases, one-off costs, subscriptions, and receipts.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-4">
          <label className="text-sm font-bold text-[#071426]">
            Date
            <input
              type="date"
              value={expenseDate}
              onChange={(event) => setExpenseDate(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[#dbe5e1] bg-[#f8fbfa] px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-emerald-400 focus:bg-white"
            />
          </label>
          <label className="text-sm font-bold text-[#071426]">
            Supplier
            <select
              value={expenseSupplierId}
              onChange={(event) => setExpenseSupplierId(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[#dbe5e1] bg-[#f8fbfa] px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-emerald-400 focus:bg-white"
            >
              <option value="">No supplier</option>
              {sortedSuppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-bold text-[#071426]">
            Product
            <select
              value={expenseProductId}
              onChange={(event) => setExpenseProductId(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[#dbe5e1] bg-[#f8fbfa] px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-emerald-400 focus:bg-white"
            >
              <option value="">No product</option>
              {sortedProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-bold text-[#071426]">
            Category
            <select
              value={expenseCategory}
              onChange={(event) => setExpenseCategory(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[#dbe5e1] bg-[#f8fbfa] px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-emerald-400 focus:bg-white"
            >
              {EXPENSE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-[1.25fr_0.5fr_0.65fr_0.8fr]">
          <label className="text-sm font-bold text-[#071426]">
            Description
            <input
              value={expenseDescription}
              onChange={(event) => setExpenseDescription(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[#dbe5e1] bg-[#f8fbfa] px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-emerald-400 focus:bg-white"
              placeholder="Fuel, fertiliser, replacement blades"
            />
          </label>
          <label className="text-sm font-bold text-[#071426]">
            Amount
            <input
              type="number"
              min="0"
              step="0.01"
              value={expenseAmount}
              onChange={(event) => setExpenseAmount(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[#dbe5e1] bg-[#f8fbfa] px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-emerald-400 focus:bg-white"
            />
          </label>
          <label className="text-sm font-bold text-[#071426]">
            Payment method
            <input
              value={expensePaymentMethod}
              onChange={(event) => setExpensePaymentMethod(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[#dbe5e1] bg-[#f8fbfa] px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-emerald-400 focus:bg-white"
            />
          </label>
          <label className="text-sm font-bold text-[#071426]">
            Receipt/reference
            <input
              value={expenseReceiptReference}
              onChange={(event) => setExpenseReceiptReference(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[#dbe5e1] bg-[#f8fbfa] px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-emerald-400 focus:bg-white"
            />
          </label>
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
          <label className="text-sm font-bold text-[#071426]">
            Notes
            <textarea
              value={expenseNotes}
              onChange={(event) => setExpenseNotes(event.target.value)}
              rows={3}
              className="mt-2 w-full rounded-xl border border-[#dbe5e1] bg-[#f8fbfa] px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-emerald-400 focus:bg-white"
            />
          </label>
          <button
            type="button"
            onClick={saveExpense}
            disabled={savingKey === "expense"}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#20c766] px-5 py-3 text-sm font-black text-[#003c35] transition hover:bg-[#2ee074] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus size={17} />
            Add expense
          </button>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-[24px] border border-[#dfe8e4] bg-white shadow-[0_20px_55px_rgba(7,20,38,0.06)]">
          <div className="flex items-center justify-between gap-3 border-b border-[#e5ece8] px-5 py-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8a9ab2]">
                Product library
              </p>
              <h3 className="text-xl font-black text-[#071426]">Products</h3>
            </div>
            <Tag className="text-emerald-700" size={20} />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f8fbfa] text-[11px] font-black uppercase tracking-[0.14em] text-[#8a9ab2]">
                <tr>
                  <th className="px-5 py-3">Product</th>
                  <th className="px-5 py-3">Cost</th>
                  <th className="px-5 py-3">Quote</th>
                  <th className="px-5 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef3f1]">
                {sortedProducts.length === 0 ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-[#667085]" colSpan={4}>
                      No products added yet.
                    </td>
                  </tr>
                ) : (
                  sortedProducts.map((product) => {
                    const supplier = product.supplierId
                      ? supplierById.get(product.supplierId)
                      : null;

                    return (
                      <tr key={product.id}>
                        <td className="px-5 py-4">
                          <p className="font-black text-[#071426]">{product.name}</p>
                          <p className="mt-1 text-xs font-semibold text-[#667085]">
                            {[product.category, supplier?.name, product.sku]
                              .filter(Boolean)
                              .join(" | ") || "No details"}
                          </p>
                        </td>
                        <td className="px-5 py-4 font-bold text-[#071426]">
                          {formatCurrencyAmount(product.unitCost, currencyCode)}
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-bold text-[#071426]">
                            {formatCurrencyAmount(product.quotePrice, currencyCode)}
                          </span>
                          {product.isQuoteItem ? (
                            <span className="ml-2 rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-black text-emerald-700">
                              Quote item
                            </span>
                          ) : null}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                runAction(`quote-product-${product.id}`, () =>
                                  onAddProductToQuoteItems(product.id)
                                )
                              }
                              className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 transition hover:bg-emerald-100"
                            >
                              {product.isQuoteItem ? "Update Quote Item" : "Add as Quote Item"}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                runAction(`delete-product-${product.id}`, () =>
                                  onDeleteProduct(product.id)
                                )
                              }
                              className="rounded-lg border border-rose-100 bg-white p-2 text-rose-600 transition hover:bg-rose-50"
                              aria-label={`Delete ${product.name}`}
                              title="Delete product"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-[24px] border border-[#dfe8e4] bg-white shadow-[0_20px_55px_rgba(7,20,38,0.06)]">
          <div className="flex items-center justify-between gap-3 border-b border-[#e5ece8] px-5 py-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8a9ab2]">
                Spend log
              </p>
              <h3 className="text-xl font-black text-[#071426]">Expenses</h3>
            </div>
            <ReceiptText className="text-emerald-700" size={20} />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f8fbfa] text-[11px] font-black uppercase tracking-[0.14em] text-[#8a9ab2]">
                <tr>
                  <th className="px-5 py-3">Expense</th>
                  <th className="px-5 py-3">Supplier</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef3f1]">
                {sortedExpenses.length === 0 ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-[#667085]" colSpan={4}>
                      No expenses recorded yet.
                    </td>
                  </tr>
                ) : (
                  sortedExpenses.map((expense) => {
                    const supplier = expense.supplierId
                      ? supplierById.get(expense.supplierId)
                      : null;
                    const product = expense.productId
                      ? productById.get(expense.productId)
                      : null;

                    return (
                      <tr key={expense.id}>
                        <td className="px-5 py-4">
                          <p className="font-black text-[#071426]">
                            {expense.description}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-[#667085]">
                            {[formatDisplayDate(expense.date), expense.category, product?.name]
                              .filter(Boolean)
                              .join(" | ")}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-sm font-semibold text-[#667085]">
                          {supplier?.name ?? "-"}
                        </td>
                        <td className="px-5 py-4 font-black text-[#071426]">
                          {formatCurrencyAmount(expense.amount, currencyCode)}
                        </td>
                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() =>
                              runAction(`delete-expense-${expense.id}`, () =>
                                onDeleteExpense(expense.id)
                              )
                            }
                            className="rounded-lg border border-rose-100 bg-white p-2 text-rose-600 transition hover:bg-rose-50"
                            aria-label={`Delete ${expense.description}`}
                            title="Delete expense"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
