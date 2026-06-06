/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import logoUrl from "@assets/ANZ PNG Logo_1762427712478.png";

function formatCurrency(amount: number, currency = "AUD") {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency }).format(amount);
}

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-AU", { day: "2-digit", month: "long", year: "numeric" });
}

export default function PrintInvoice() {
  const params = useParams<{ id: string }>();
  const invoiceId = params.id;

  const { data: invoice, isLoading, error } = useQuery<any>({
    queryKey: [`/api/accounting/invoices/${invoiceId}`],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Invoice not found</p>
      </div>
    );
  }

  const statusLabels: Record<string, string> = {
    draft: "DRAFT",
    sent: "SENT",
    partially_paid: "PARTIALLY PAID",
    paid: "PAID",
    overdue: "OVERDUE",
    cancelled: "CANCELLED",
  };

  return (
    <div className="bg-white min-h-screen">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="no-print fixed top-4 right-4 z-50">
        <button
          onClick={() => window.print()}
          className="bg-gray-900 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
          data-testid="button-print-pdf"
        >
          Print / Save as PDF
        </button>
      </div>

      <div className="max-w-[800px] mx-auto p-8" data-testid="print-invoice-container">
        <div className="flex items-start justify-between mb-8">
          <div>
            <img src={logoUrl} alt="ANZ Global Education" className="h-12 mb-2" />
            <p className="text-sm text-gray-500">ANZ Global Education</p>
            <p className="text-sm text-gray-500">Melbourne, Australia</p>
          </div>
          <div className="text-right">
            <h1 className="text-3xl font-bold text-gray-900 mb-1">INVOICE</h1>
            <p className="text-lg font-semibold text-gray-700" data-testid="text-print-invoice-number">{invoice.invoiceNumber}</p>
            <div className="mt-2 inline-block px-3 py-1 rounded text-sm font-medium" style={{
              backgroundColor: invoice.status === "paid" ? "#dcfce7" : invoice.status === "overdue" ? "#fecaca" : "#f3f4f6",
              color: invoice.status === "paid" ? "#166534" : invoice.status === "overdue" ? "#991b1b" : "#374151",
            }}>
              {statusLabels[invoice.status] || invoice.status}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Bill To</p>
            <p className="font-semibold text-gray-900" data-testid="text-print-client">{invoice.clientName}</p>
            {invoice.clientEmail && <p className="text-sm text-gray-600">{invoice.clientEmail}</p>}
          </div>
          <div className="text-right">
            <div className="space-y-1">
              <div className="flex justify-end gap-4">
                <span className="text-xs text-gray-400 uppercase">Issue Date</span>
                <span className="text-sm font-medium text-gray-900">{formatDate(invoice.issueDate)}</span>
              </div>
              <div className="flex justify-end gap-4">
                <span className="text-xs text-gray-400 uppercase">Due Date</span>
                <span className="text-sm font-medium text-gray-900">{formatDate(invoice.dueDate)}</span>
              </div>
              <div className="flex justify-end gap-4">
                <span className="text-xs text-gray-400 uppercase">Currency</span>
                <span className="text-sm font-medium text-gray-900">{invoice.currency}</span>
              </div>
            </div>
          </div>
        </div>

        <table className="w-full mb-8">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Description</th>
              <th className="text-right py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider w-20">Qty</th>
              <th className="text-right py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider w-32">Unit Price</th>
              <th className="text-right py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider w-32">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.lineItems || []).map((item: any, idx: number) => (
              <tr key={idx} className="border-b border-gray-100">
                <td className="py-3 text-sm text-gray-900">{item.description}</td>
                <td className="py-3 text-sm text-gray-900 text-right">{item.quantity}</td>
                <td className="py-3 text-sm text-gray-900 text-right">{formatCurrency(parseFloat(item.unitPrice), invoice.currency)}</td>
                <td className="py-3 text-sm text-gray-900 text-right">{formatCurrency(parseFloat(item.amount), invoice.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end mb-8">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="text-gray-900">{formatCurrency(invoice.total, invoice.currency)}</span>
            </div>
            {invoice.amountPaid > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Paid</span>
                <span className="text-green-700">-{formatCurrency(invoice.amountPaid, invoice.currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold border-t-2 border-gray-900 pt-2">
              <span className="text-gray-900">Amount Due</span>
              <span className="text-gray-900" data-testid="text-print-amount-due">{formatCurrency(invoice.amountDue, invoice.currency)}</span>
            </div>
          </div>
        </div>

        {(invoice.payments || []).length > 0 && (
          <div className="mb-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Payment History</p>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-xs text-gray-400 uppercase">Date</th>
                  <th className="text-left py-2 text-xs text-gray-400 uppercase">Method</th>
                  <th className="text-left py-2 text-xs text-gray-400 uppercase">Reference</th>
                  <th className="text-right py-2 text-xs text-gray-400 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.payments.map((p: any) => (
                  <tr key={p.id} className="border-b border-gray-100">
                    <td className="py-2 text-sm text-gray-700">{formatDate(p.paymentDate)}</td>
                    <td className="py-2 text-sm text-gray-700">{p.method || "-"}</td>
                    <td className="py-2 text-sm text-gray-700">{p.reference || "-"}</td>
                    <td className="py-2 text-sm text-gray-700 text-right">{formatCurrency(parseFloat(p.amount), invoice.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {invoice.notes && (
          <div className="mb-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Notes</p>
            <p className="text-sm text-gray-600">{invoice.notes}</p>
          </div>
        )}

        <div className="border-t border-gray-200 pt-4 text-center">
          <p className="text-xs text-gray-400">
            ANZ Global Education Pty Ltd | ABN: 00 000 000 000 | info@anzglobal.com.au
          </p>
        </div>
      </div>
    </div>
  );
}
