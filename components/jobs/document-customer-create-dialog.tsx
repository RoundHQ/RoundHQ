"use client";

import { useState } from "react";
import CustomerForm from "./customer-form";
import type { Customer, RotationWeeks } from "./types";

type Props = {
    customerName: string;
    customers?: Customer[];
    defaultRotationWeeks?: RotationWeeks;
    allowCommercialTools?: boolean;
    onCreateCustomer: (customer: Customer) => Promise<Customer | null | undefined>;
    onCreated: (customer: Customer) => void;
    onCancel: () => void;
};

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : "Unable to add customer right now.";
}

export default function DocumentCustomerCreateDialog({
    customerName,
    customers = [],
    defaultRotationWeeks,
    allowCommercialTools = true,
    onCreateCustomer,
    onCreated,
    onCancel,
}: Props) {
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    async function handleSave(customer: Customer) {
        setErrorMessage(null);

        try {
            const createdCustomer = await onCreateCustomer(customer);

            if (!createdCustomer) {
                setErrorMessage("Unable to add customer right now.");
                return;
            }

            onCreated(createdCustomer);
        } catch (error) {
            setErrorMessage(getErrorMessage(error));
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-[24px] bg-white shadow-2xl">
                {errorMessage ? (
                    <div className="border-b border-rose-100 bg-rose-50 px-6 py-3 text-sm font-semibold text-rose-700">
                        {errorMessage}
                    </div>
                ) : null}

                <CustomerForm
                    key={customerName}
                    initialName={customerName}
                    customers={customers}
                    defaultRotationWeeks={defaultRotationWeeks}
                    allowCommercialTools={allowCommercialTools}
                    onSave={handleSave}
                    onCancel={onCancel}
                />
            </div>
        </div>
    );
}
