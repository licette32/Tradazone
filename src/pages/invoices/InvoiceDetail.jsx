/**
 * InvoiceDetail
 *
 * ISSUE: N+1 redundant renders in InvoiceDetail due to missing React.memo
 * Category: Performance & Scalability
 * Priority: Critical
 * Affected Area: InvoiceDetail
 * Description:
 * Local UI state changes such as the line-item search were re-rendering every
 * subtree in the page, including the hidden PDF `InvoiceLayout` and static
 * invoice chrome. Those repeated renders scale poorly with larger invoices.
 *
 * Resolution:
 * 1. Wrapped static render-heavy sections in `React.memo`.
 * 2. Memoized derived data and callbacks so memo boundaries stay effective.
 * 3. Kept line-item filtering isolated to the table subtree that actually
 *    depends on the search state.
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Send, Download, Edit, Eye, Search } from 'lucide-react';
import Button from '../../components/forms/Button';
import StatusBadge from '../../components/tables/StatusBadge';
import InvoiceLayout from '../../components/invoice/InvoiceLayout';
import { useData } from '../../context/DataContext';
import { loadSession, useAuthUser } from '../../context/AuthContext';
import { useDebounce } from '../../hooks/useDebounce';
import { formatUtcDate } from '../../utils/date';

const MemoInvoiceLayout = memo(InvoiceLayout);

const InvoiceHeader = memo(function InvoiceHeader({ invoiceId, status, onPreview, onDownload }) {
    return (
        <div className="flex items-start justify-between mb-6">
            <div>
                <Link
                    to="/invoices"
                    className="inline-flex items-center gap-1.5 text-sm text-t-muted hover:text-brand transition-colors mb-2"
                >
                    <ArrowLeft size={16} /> Back to Invoices
                </Link>
                <div className="flex items-center gap-3">
                    <h1 className="text-xl font-semibold text-t-primary">{invoiceId}</h1>
                    <StatusBadge status={status} />
                </div>
            </div>
            <div className="flex gap-2">
                <Button variant="secondary" icon={Eye} onClick={onPreview}>
                    View Invoice
                </Button>
                <Button variant="secondary" icon={Download} onClick={onDownload}>
                    Download
                </Button>
                <Button variant="secondary" icon={Send}>
                    Send
                </Button>
                <Button variant="primary" icon={Edit}>
                    Edit
                </Button>
            </div>
        </div>
    );
});

const InvoiceMeta = memo(function InvoiceMeta({ invoice, customer }) {
    return (
        <div className="bg-white border border-border rounded-card p-6 mb-5">
            <h2 className="text-base font-semibold mb-4">Invoice Details</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                <div>
                    <span className="block text-xs text-t-muted mb-1">Customer</span>
                    <span className="text-sm font-medium">{invoice.customer}</span>
                </div>
                <div>
                    <span className="block text-xs text-t-muted mb-1">Email</span>
                    <span className="text-sm font-medium">{customer?.email || 'N/A'}</span>
                </div>
                <div>
                    <span className="block text-xs text-t-muted mb-1">Due Date</span>
                    <span className="text-sm font-medium">{formatUtcDate(invoice.dueDate)}</span>
                </div>
                <div>
                    <span className="block text-xs text-t-muted mb-1">Created</span>
                    <span className="text-sm font-medium">{formatUtcDate(invoice.createdAt)}</span>
                </div>
            </div>
        </div>
    );
});

const InvoiceItemsTable = memo(function InvoiceItemsTable({
    searchTerm,
    debouncedSearch,
    onSearchChange,
    filteredItems,
    total,
}) {
    return (
        <div className="bg-white border border-border rounded-card overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-base font-semibold">Items</h2>

                <div className="relative">
                    <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-t-muted"
                        size={16}
                    />
                    <input
                        type="text"
                        placeholder="Filter items by name..."
                        className="pl-10 pr-4 py-2 text-sm border border-border rounded-md w-full sm:w-64 focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all"
                        value={searchTerm}
                        onChange={onSearchChange}
                    />
                </div>
            </div>

            <table className="w-full border-collapse">
                <thead>
                    <tr className="border-b border-border">
                        <th className="text-left px-6 py-3 text-xs font-semibold text-t-muted uppercase tracking-wide bg-page">
                            Item
                        </th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-t-muted uppercase tracking-wide bg-page">
                            Quantity
                        </th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-t-muted uppercase tracking-wide bg-page">
                            Price
                        </th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-t-muted uppercase tracking-wide bg-page">
                            Total
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {filteredItems.length > 0 ? (
                        filteredItems.map((item, index) => (
                            <tr
                                key={`${item.name}-${item.price}-${item.quantity}-${index}`}
                                className="border-b border-border last:border-b-0 hover:bg-page/50 transition-colors"
                            >
                                <td className="px-6 py-3 text-sm font-medium">{item.name}</td>
                                <td className="px-6 py-3 text-sm">{item.quantity}</td>
                                <td className="px-6 py-3 text-sm">{item.price} STRK</td>
                                <td className="px-6 py-3 text-sm font-medium">
                                    {parseFloat(item.price) * item.quantity} STRK
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={4} className="px-6 py-12 text-center">
                                <p className="text-sm text-t-muted">
                                    No items found matching "{debouncedSearch}"
                                </p>
                            </td>
                        </tr>
                    )}
                </tbody>
                <tfoot>
                    <tr className="border-t-2 border-border">
                        <td colSpan={3} className="px-6 py-4 text-sm font-semibold text-right">
                            Total:
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-brand">{total} STRK</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
});

const PdfInvoicePreview = memo(function PdfInvoicePreview({ invoiceRef, invoice, customer, sender }) {
    return (
        <div className="fixed left-[-9999px] top-0">
            <MemoInvoiceLayout
                ref={invoiceRef}
                invoice={invoice}
                customer={customer}
                sender={sender}
            />
        </div>
    );
});

function InvoiceDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const invoiceRef = useRef(null);
    const user = useAuthUser();
    const { invoices, customers } = useData();
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearch = useDebounce(searchTerm, 300);

    useEffect(() => {
        if (!loadSession()) {
            navigate('/signin?reason=expired', { replace: true });
        }
    }, [navigate]);

    const invoice = useMemo(
        () => invoices.find((candidate) => candidate.id === id),
        [id, invoices]
    );

    const customer = useMemo(
        () => customers.find((candidate) => candidate.id === invoice?.customerId),
        [customers, invoice?.customerId]
    );

    const sender = useMemo(() => ({
        name: user?.name || 'Tradazone',
        email: user?.email || 'hello@tradazone.com',
    }), [user?.email, user?.name]);

    const filteredItems = useMemo(() => {
        if (!invoice) return [];
        if (!debouncedSearch.trim()) return invoice.items;

        const term = debouncedSearch.toLowerCase();
        return invoice.items.filter((item) => item.name.toLowerCase().includes(term));
    }, [invoice, debouncedSearch]);

    const total = useMemo(() => {
        if (!invoice) return 0;
        return invoice.items.reduce(
            (runningTotal, item) => runningTotal + parseFloat(item.price) * item.quantity,
            0
        );
    }, [invoice]);

    const handleSearchChange = useCallback((event) => {
        setSearchTerm(event.target.value);
    }, []);

    const handlePreview = useCallback(() => {
        if (!invoice) return;
        navigate(`/invoice/${invoice.id}`);
    }, [invoice, navigate]);

    const handleDownload = useCallback(async () => {
        if (!invoiceRef.current || !invoice) return;

        const html2pdf = (await import('html2pdf.js')).default;
        const options = {
            margin: 0,
            filename: `${invoice.id}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, letterRendering: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        };

        html2pdf().set(options).from(invoiceRef.current).save();
    }, [invoice]);

    if (!invoice) {
        return (
            <div className="p-8">
                <p className="text-t-muted">Invoice not found</p>
            </div>
        );
    }

    return (
        <div>
            <InvoiceHeader
                invoiceId={invoice.id}
                status={invoice.status}
                onPreview={handlePreview}
                onDownload={handleDownload}
            />

            <InvoiceMeta invoice={invoice} customer={customer} />

            <InvoiceItemsTable
                searchTerm={searchTerm}
                debouncedSearch={debouncedSearch}
                onSearchChange={handleSearchChange}
                filteredItems={filteredItems}
                total={total}
            />

            <PdfInvoicePreview
                invoiceRef={invoiceRef}
                invoice={invoice}
                customer={customer}
                sender={sender}
            />
        </div>
    );
}

export default InvoiceDetail;
